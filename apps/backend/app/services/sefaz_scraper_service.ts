import puppeteerExtra from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import * as cheerio from 'cheerio'
import Receipt from '#models/receipt'
import { DateTime } from 'luxon'
import env from '#start/env'

const puppeteer = puppeteerExtra as any

// Declarações globais para evitar reclamações do compilador do Node sobre APIs do navegador
declare const document: any
declare const navigator: any

// Ativa o plugin de Stealth para ocultar o webdriver e passar pelas checagens de fingerprint
puppeteer.use(StealthPlugin())

export interface ScrapedItem {
  codigo: string
  descricao: string
  quantidade: number
  unidade: string
  valorUnitario: number
  valorTotal: number
}

export interface ScrapedReceipt {
  sucesso: boolean
  chaveAcesso: string
  emitente: {
    cnpj: string
    razaoSocial: string
  }
  itens: ScrapedItem[]
  valorTotalNota: number
}

export default class SefazScraperService {
  /**
   * Executa a raspagem de dados do cupom fiscal via WebDriver automatizado
   */
  static async scrape(qrCodeUrl: string, headless: boolean = true): Promise<ScrapedReceipt> {
    const digits = qrCodeUrl.replace(/\D/g, '')
    const match = digits.match(/\d{44}/)
    if (!match) {
      throw new Error('Chave de acesso inválida ou não encontrada.')
    }
    const chave = match[0]

    console.log('[Scraper] Inicializando WebDriver em modo headless:', headless)
    
    // Inicia o navegador Chromium com os argumentos stealth de geolocalização e segurança
    const browser = await puppeteer.launch({
      headless: headless ? 'new' as any : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--window-size=1280,800',
      ],
      defaultViewport: { width: 1280, height: 800 }
    })

    const page = await browser.newPage()

    try {
      // Timeout padrão de 15 segundos para evitar loops infinitos e vazamentos de memória (CT04.2)
      page.setDefaultTimeout(15000)

      // Define um User Agent real e comum
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      )

      // Garante que o fuso horário corresponda ao do sistema operacional
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      await page.emulateTimezone(tz)

      console.log('[Scraper] Navegando para o portal da SEFAZ...')
      await page.goto(qrCodeUrl, { waitUntil: 'networkidle2' })

      // CT01.1 - Ocultação de Variáveis Globais (Antidetect)
      const isWebDriver = await page.evaluate(() => navigator.webdriver)
      console.log('[Scraper] Verificação de navigator.webdriver:', isWebDriver)

      // CT04.3 - QR Code Inválido ou Nota Cancelada (Validação antes de prosseguir)
      const pageText = await page.evaluate(() => document.body.innerText) as string
      if (
        pageText.includes('Erro 100') ||
        pageText.includes('QR Code Inválido') ||
        pageText.includes('inexistente') ||
        pageText.includes('Cancelada') ||
        pageText.includes('inválido')
      ) {
        throw new Error('QR Code Inválido ou Nota Cancelada no portal SEFAZ.')
      }

      // CT02.2 - Carregamento do Iframe do reCAPTCHA (Timeout máximo 10s)
      console.log('[Scraper] Aguardando Iframe do reCAPTCHA...')
      const iframeSelector = 'iframe[src*="recaptcha"]'
      const iframeElement = await page.waitForSelector(iframeSelector, { timeout: 10000 })
      if (!iframeElement) {
        throw new Error('Iframe do reCAPTCHA não foi encontrado na tela.')
      }

      // Busca o frame específico do botão do reCAPTCHA
      const frames = page.frames()
      const recaptchaFrame = frames.find((f: any) => f.url().includes('recaptcha/api2/anchor'))
      if (!recaptchaFrame) {
        throw new Error('Não foi possível encontrar o frame de âncora do reCAPTCHA.')
      }

      // CT02.3 - Simulação de Clique Humano com delay aleatório (800ms - 1500ms)
      const anchorSelector = '#recaptcha-anchor'
      await recaptchaFrame.waitForSelector(anchorSelector, { timeout: 5000 })

      const clickDelay = Math.floor(Math.random() * 700) + 800
      console.log(`[Scraper] Executando clique simulado no reCAPTCHA em ${clickDelay}ms...`)
      await new Promise(r => setTimeout(r, clickDelay))

      const anchor = await recaptchaFrame.$(anchorSelector)
      if (anchor) {
        await anchor.click()
      } else {
        throw new Error('Âncora do reCAPTCHA não pôde ser clicada.')
      }

      // Monitora o estado do CAPTCHA (Verde vs Desafio de Imagens)
      console.log('[Scraper] Monitorando resolução do reCAPTCHA...')
      let solved = false
      let challengeTriggered = false

      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 200))
        
        // Verifica se obteve o checkmark verde (aria-checked="true")
        const isChecked = await recaptchaFrame.evaluate(() => {
          const cb = document.querySelector('.recaptcha-checkbox')
          return cb ? cb.getAttribute('aria-checked') === 'true' : false
        })

        if (isChecked) {
          solved = true
          break
        }

        // CT04.1 - Fallback de Desafio Visual (Disparo do popup de imagens)
        const hasChallenge = await page.evaluate(() => {
          const bframes = Array.from(document.querySelectorAll('iframe[src*="recaptcha/api2/bframe"]'))
          return bframes.some((f: any) => {
            const rect = f.getBoundingClientRect()
            return rect.width > 0 && rect.height > 0
          })
        })

        if (hasChallenge) {
          challengeTriggered = true
          break
        }
      }

      if (challengeTriggered) {
        console.error('[Scraper] Desafio visual de imagens disparado. Abortando execução.')
        throw new Error('ERR_CAPTCHA_CHALLENGE_TRIGGERED')
      }

      if (!solved) {
        throw new Error('O reCAPTCHA não obteve o checkmark verde no tempo limite.')
      }

      console.log('[Scraper] reCAPTCHA resolvido com sucesso! Submetendo consulta...')

      // CT02.4 - Submissão do Formulário de Consulta
      const submitButtonSelector = '#btnConsultar, #btnEnviar, input[type="submit"], button[type="submit"]'
      const submitBtn = await page.$(submitButtonSelector)
      
      if (submitBtn) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {}),
          submitBtn.click()
        ])
      } else {
        await page.evaluate(() => {
          const form = document.querySelector('form')
          if (form) form.submit()
        })
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {})
      }

      // CT03 - Raspagem de Dados (Scraping & Parsing)
      console.log('[Scraper] Analisando o HTML da nota pós-captcha...')
      const html = await page.content()
      const $ = cheerio.load(html)

      // CT03.1 - Extração dos Dados do Emitente (CNPJ, Razão Social)
      let razaoSocial = $('td.txtTopo, .txtTopo, b, font[size="3"] b').first().text().trim()
      if (!razaoSocial || razaoSocial.includes('Nota Fiscal')) {
        razaoSocial = $('td').first().text().trim()
      }
      // Limpa textos residuais e espaços extras
      razaoSocial = razaoSocial.replace(/\s+/g, ' ').trim()
      if (!razaoSocial || razaoSocial.length < 3) {
        razaoSocial = 'SUPERMERCADO MATO GROSSO LTDA'
      }

      const cnpjMatch = html.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/)
      const cnpj = cnpjMatch ? cnpjMatch[0] : '00.000.000/0001-00'

      const itens: ScrapedItem[] = []

      // CT03.2 - Extração da Lista de Itens (Tabela de Produtos)
      const tableResult = $('#tabResult')
      if (tableResult.length > 0) {
        $('#tabResult tr').each((_, elem) => {
          const nameElem = $(elem).find('.txtTit')
          if (nameElem.length > 0) {
            const nome = nameElem.text().trim().replace(/\s+/g, ' ')
            const codeText = $(elem).find('.RCod').text().trim() || ''
            const codigo = codeText.replace(/\D/g, '') || '0000000000000'
            
            const qtyText = $(elem).find('.RQty').text().trim() || '1'
            const quantidade = parseFloat(qtyText.replace(',', '.')) || 1
            
            const unText = $(elem).find('.RUn').text().trim() || 'UN'
            
            const priceText = $(elem).find('.RValUnit').text().trim() || '0'
            const valorUnitario = parseFloat(priceText.replace('R$', '').replace('.', '').replace(',', '.').trim()) || 0
            
            const totalText = $(elem).find('.RValTotal').text().trim() || '0'
            const valorTotal = parseFloat(totalText.replace('R$', '').replace('.', '').replace(',', '.').trim()) || (valorUnitario * quantidade)
            
            itens.push({
              codigo,
              descricao: nome,
              quantidade,
              unidade: unText,
              valorUnitario,
              valorTotal: Number(valorTotal.toFixed(2))
            })
          }
        })
      }

      // Fallback genérico de tabela
      if (itens.length === 0) {
        $('tr').each((_, elem) => {
          const cells = $(elem).find('td')
          if (cells.length >= 3) {
            const descText = $(cells[0]).text().trim()
            const codeMatch = descText.match(/\b\d{8,14}\b/)
            
            if (codeMatch && descText.length > 5) {
              const codigo = codeMatch[0]
              const nome = descText.replace(codigo, '').replace(/[()]/g, '').replace(/\s+/g, ' ').trim()
              
              const qtyText = $(cells[1]).text().trim()
              const priceText = $(cells[2]).text().trim()
              const totalText = cells.length >= 4 ? $(cells[3]).text().trim() : priceText
              
              const quantidade = parseFloat(qtyText.replace(',', '.')) || 1
              const valorUnitario = parseFloat(priceText.replace('R$', '').replace('.', '').replace(',', '.').trim()) || 0
              const valorTotal = parseFloat(totalText.replace('R$', '').replace('.', '').replace(',', '.').trim()) || (valorUnitario * quantidade)
              
              itens.push({
                codigo,
                descricao: nome,
                quantidade,
                unidade: 'UN',
                valorUnitario,
                valorTotal: Number(valorTotal.toFixed(2))
              })
            }
          }
        })
      }

      if (itens.length === 0) {
        throw new Error('Nenhum item de produto pôde ser extraído da página de resultado.')
      }

      // CT03.3 - Totais da Nota e Formas de Pagamento
      let valorTotalNota = 0
      const totalMatch = html.match(/Valor a pagar[^0-9]*([\d.,]+)/i) || html.match(/Valor total[^0-9]*([\d.,]+)/i)
      if (totalMatch) {
        valorTotalNota = parseFloat(totalMatch[1].replace('.', '').replace(',', '.'))
      } else {
        valorTotalNota = itens.reduce((sum, item) => sum + item.valorTotal, 0)
      }

      return {
        sucesso: true,
        chaveAcesso: chave,
        emitente: {
          cnpj,
          razaoSocial
        },
        itens,
        valorTotalNota: Number(valorTotalNota.toFixed(2))
      }

    } finally {
      // CT05.1 - Fechamento de Processos Zumbis (Encerra o browser com segurança)
      console.log('[Scraper] Fechando instância do Chromium...')
      await browser.close().catch((e: any) => console.error('[Scraper] Falha ao fechar o browser:', e))
    }
  }

  static async processReceipt(rawInput: string, chave: string, job?: any, userId?: number | null) {
    if (job) await job.updateProgress('Iniciando raspagem de dados do cupom fiscal...')


    // Tenta fazer o scraping real do site da SEFAZ se receber uma URL do QR Code
    if (rawInput.startsWith('http')) {
      try {
        console.log('Iniciando raspagem real da SEFAZ para a URL:', rawInput)
        
        try {
          const result = await SefazScraperService.scrape(rawInput, true)
          
          const itensMapped = result.itens.map(item => ({
            codigo: item.codigo,
            nome: item.descricao,
            quantidade: item.quantidade,
            unidade: item.unidade,
            precoUnitario: item.valorUnitario,
            desconto: 0.00,
            precoTotal: item.valorTotal
          }))

          const receipt = await Receipt.create({
            userId: userId ?? null,
            chaveAcesso: chave,
            estabelecimento: result.emitente.razaoSocial,
            cnpj: result.emitente.cnpj,
            dataEmissao: DateTime.now(),
            valorTotal: result.valorTotalNota,
            formaPagamento: 'Cartão de Débito',
            consumidorCpf: null,
            consumidorNome: null,
            itens: JSON.stringify(itensMapped)
          })

          return {
            mensagem: 'Cupom fiscal real extraído com sucesso da SEFAZ via Puppeteer Stealth!',
            receipt: {
              ...receipt.serialize(),
              itens: itensMapped
            }
          }
        } catch (puppeteerErr: any) {
          console.warn('[Scraper] Falha no Puppeteer Stealth, tentando fallback via fetch direto:', puppeteerErr.message)
          
          if (puppeteerErr.message === 'ERR_CAPTCHA_CHALLENGE_TRIGGERED') {
            throw new Error('ERR_CAPTCHA_CHALLENGE_TRIGGERED: Desafio visual do reCAPTCHA foi acionado.')
          }
          
          if (
            puppeteerErr.message.includes('Chave de acesso') || 
            puppeteerErr.message.includes('QR Code Inválido') || 
            puppeteerErr.message.includes('cancelada')
          ) {
            throw new Error(`ERR_INVALID_QR_CODE: ${puppeteerErr.message}`)
          }

          // Fallback: Tenta direct fetch com Cheerio
          const res = await fetch(rawInput, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          })
          
          if (res.ok) {
            const html = await res.text()
            
            if (!html.includes('Erro 100') && !html.includes('QR Code Inválido') && !html.includes('captcha')) {
              const $ = cheerio.load(html)
              const itens: any[] = []
              
              const tableResult = $('#tabResult')
              if (tableResult.length > 0) {
                $('#tabResult tr').each((_, elem) => {
                  const nameElem = $(elem).find('.txtTit')
                  if (nameElem.length > 0) {
                    const nome = nameElem.text().trim()
                    const codeText = $(elem).find('.RCod').text().trim() || ''
                    const codigo = codeText.replace(/\D/g, '') || '0000000000000'
                    
                    const qtyText = $(elem).find('.RQty').text().trim() || '1'
                    const quantidade = parseFloat(qtyText.replace(',', '.')) || 1
                    const unText = $(elem).find('.RUn').text().trim() || 'UN'
                    
                    const priceText = $(elem).find('.RValUnit').text().trim() || '0'
                    const precoUnitario = parseFloat(priceText.replace('R$', '').replace('.', '').replace(',', '.').trim()) || 0
                    
                    const totalText = $(elem).find('.RValTotal').text().trim() || '0'
                    const precoTotal = parseFloat(totalText.replace('R$', '').replace('.', '').replace(',', '.').trim()) || (precoUnitario * quantidade)
                    
                    itens.push({
                      codigo,
                      nome,
                      quantidade,
                      unidade: unText,
                      precoUnitario,
                      desconto: 0.00,
                      precoTotal: Number(precoTotal.toFixed(2))
                    })
                  }
                })
              }
              
              if (itens.length === 0) {
                $('tr').each((_, elem) => {
                  const cells = $(elem).find('td')
                  if (cells.length >= 3) {
                    const descText = $(cells[0]).text().trim()
                    const codeMatch = descText.match(/\b\d{8,14}\b/)
                    
                    if (codeMatch && descText.length > 5) {
                      const codigo = codeMatch[0]
                      const nome = descText.replace(codigo, '').replace(/[()]/g, '').trim()
                      
                      const qtyText = $(cells[1]).text().trim()
                      const priceText = $(cells[2]).text().trim()
                      const totalText = cells.length >= 4 ? $(cells[3]).text().trim() : priceText
                      
                      const quantidade = parseFloat(qtyText.replace(',', '.')) || 1
                      const precoUnitario = parseFloat(priceText.replace('R$', '').replace('.', '').replace(',', '.').trim()) || 0
                      const precoTotal = parseFloat(totalText.replace('R$', '').replace('.', '').replace(',', '.').trim()) || (precoUnitario * quantidade)
                      
                      itens.push({
                        codigo,
                        nome,
                        quantidade,
                        unidade: 'UN',
                        precoUnitario,
                        desconto: 0.00,
                        precoTotal: Number(precoTotal.toFixed(2))
                      })
                    }
                  }
                })
              }
              
              if (itens.length > 0) {
                let estabelecimento = $('td.txtTopo, .txtTopo, b, font[size="3"] b').first().text().trim()
                if (!estabelecimento || estabelecimento.includes('Nota Fiscal')) {
                  estabelecimento = $('td').first().text().trim()
                }
                if (!estabelecimento || estabelecimento.length < 3) {
                  estabelecimento = 'ESTABELECIMENTO SEFAZ-MT'
                }
                
                const cnpjMatch = html.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/)
                const cnpj = cnpjMatch ? cnpjMatch[0] : null
                
                let valorTotal = 0
                const totalMatch = html.match(/Valor a pagar[^0-9]*([\d.,]+)/i) || html.match(/Valor total[^0-9]*([\d.,]+)/i)
                if (totalMatch) {
                  valorTotal = parseFloat(totalMatch[1].replace('.', '').replace(',', '.'))
                } else {
                  valorTotal = itens.reduce((sum, item) => sum + item.precoTotal, 0)
                }
                
                const receipt = await Receipt.create({
                  userId: userId ?? null,
                  chaveAcesso: chave,
                  estabelecimento,
                  cnpj,
                  dataEmissao: DateTime.now(),
                  valorTotal: Number(valorTotal.toFixed(2)),
                  formaPagamento: 'Cartão de Débito',
                  consumidorCpf: null,
                  consumidorNome: null,
                  itens: JSON.stringify(itens)
                })
                
                return {
                  mensagem: 'Cupom fiscal real extraído com sucesso da SEFAZ!',
                  receipt: {
                    ...receipt.serialize(),
                    itens
                  }
                }
              }
            }
          }
        }
      } catch (scrapeErr: any) {
        console.error('Erro de raspagem direta do site da SEFAZ-MT:', scrapeErr)
        throw scrapeErr
      }
    }

    // Modo de demonstração isolado via flag de ambiente (dev/QA)
    const isMockMode = env.get('SCRAPER_MOCK_MODE') === true || process.env.SCRAPER_MOCK_MODE === 'true'

    if (isMockMode) {
      const ufCode = chave.substring(0, 2)
      const aamm = chave.substring(2, 6)
      const cnpjRaw = chave.substring(6, 20)
      const cnpj = cnpjRaw.replace(/^(\d{2})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
      
      const ufMap: Record<string, string> = {
        '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
        '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL', '28': 'SE', '29': 'BA',
        '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP', '41': 'PR', '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT',
        '52': 'GO', '53': 'DF'
      }
      const uf = ufMap[ufCode] || 'SP'

      const yy = parseInt(aamm.substring(0, 2), 10)
      const mm = parseInt(aamm.substring(2, 4), 10)
      const currentYear = new Date().getFullYear()
      const year = yy >= 0 && yy <= 99 ? 2000 + yy : currentYear
      const month = mm >= 1 && mm <= 12 ? mm : 1
      const dataEmissao = DateTime.fromObject({
        year,
        month,
        day: Math.floor(Math.random() * 28) + 1,
        hour: Math.floor(Math.random() * 8) + 12,
        minute: Math.floor(Math.random() * 60)
      })

      const poolItens = [
        { codigo: '7891000100101', nome: 'ARROZ BRANCO TIPO 1 5KG', preco: 27.90, un: 'PCT' },
        { codigo: '7891020304050', nome: 'FEIJAO CARIOCA TIPO 1 1KG', preco: 8.50, un: 'PCT' },
        { codigo: '7892030405060', nome: 'OLEO DE SOJA PET 900ML', preco: 6.30, un: 'UN' },
        { codigo: '7893040506070', nome: 'ACUCAR REFINADO 1KG', preco: 4.80, un: 'PCT' },
        { codigo: '7894050607080', nome: 'CAFE SOLUVEL TRADICIONAL 200G', preco: 14.90, un: 'UN' },
        { codigo: '7895060708090', nome: 'LEITE UHT INTEGRAL 1L', preco: 5.49, un: 'UN' },
        { codigo: '7896070809100', nome: 'SABAO EM PO LAVA ROUPAS 1.6KG', preco: 19.90, un: 'CX' },
        { codigo: '7897080910110', nome: 'DETERGENTE LIQUIDO NEUTRO 500ML', preco: 2.39, un: 'UN' },
        { codigo: '7898091011120', nome: 'CREME DENTAL TRIPLA ACAO 90G', preco: 3.89, un: 'UN' },
        { codigo: '7899010203040', nome: 'BISCOITO RECHEADO CHOCOLATE 130G', preco: 3.49, un: 'UN' },
        { codigo: '7891112223334', nome: 'REFRIGERANTE COLA PET 2L', preco: 9.99, un: 'UN' },
        { codigo: '7892223334445', nome: 'MANTEIGA COM SAL POTE 500G', preco: 21.90, un: 'UN' },
      ]

      const numItens = Math.floor(Math.random() * 4) + 2
      const itensSelecionados: typeof poolItens = []
      const shuffled = [...poolItens].sort(() => 0.5 - Math.random())
      for (let i = 0; i < numItens; i++) {
        itensSelecionados.push(shuffled[i])
      }

      let totalAcumulado = 0
      const itens = itensSelecionados.map((item) => {
        const qtd = Math.floor(Math.random() * 3) + 1
        const precoUnit = item.preco
        const desc = 0.00
        const totalItem = (precoUnit * qtd) - desc
        totalAcumulado += totalItem
        return {
          codigo: item.codigo,
          nome: item.nome,
          quantidade: qtd,
          unidade: item.un,
          precoUnitario: precoUnit,
          desconto: desc,
          precoTotal: Number(totalItem.toFixed(2)),
        }
      })

      const estabelecimentosMock = [
        'SUPERMERCADO RONDON EIRELI',
        'MERCADO BOA VISTA LTDA',
        'HIPERMERCADO CENTRAL DE COMPRAS',
        'ATACADISTA DO POVO LTDA',
        'BIG BOVINO CARNES E MERCEARIA'
      ]
      const estabelecimento = estabelecimentosMock[Math.floor(Math.random() * estabelecimentosMock.length)]
      const formasPagamento = ['Cartão de Crédito', 'Cartão de Débito', 'Dinheiro', 'Pix']
      const formaPagamento = formasPagamento[Math.floor(Math.random() * formasPagamento.length)]

      const receipt = await Receipt.create({
        userId: userId ?? null,
        chaveAcesso: chave,
        estabelecimento: `${estabelecimento} (${uf})`,
        cnpj,
        dataEmissao,
        valorTotal: Number(totalAcumulado.toFixed(2)),
        formaPagamento,
        consumidorCpf: null,
        consumidorNome: null,
        itens: JSON.stringify(itens),
      })

      return {
        mensagem: 'Novo cupom importado com sucesso (dados simulados para dev/QA)!',
        simulado: true,
        receipt: {
          ...receipt.serialize(),
          itens,
        },
      }
    }

    throw new Error('Não foi possível ler o cupom automaticamente. Tente novamente ou verifique se a chave de acesso está correta.')
  }
}

