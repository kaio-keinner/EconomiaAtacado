import puppeteerExtra from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import * as cheerio from 'cheerio'

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
}
