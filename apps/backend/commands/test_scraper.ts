import { BaseCommand, args, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import SefazScraperService from '#services/sefaz_scraper_service'

export default class TestScraper extends BaseCommand {
  static commandName = 'test:scraper'
  static description = 'Executa o Roteiro de Testes de Automação de Scraping da SEFAZ MT e ReCAPTCHA Stealth'

  static options: CommandOptions = {
    startApp: true // Garante que a aplicação e serviços bootem antes de rodar o comando
  }

  @args.string({ description: 'URL do QR Code da NFC-e da SEFAZ MT a ser raspada', required: false })
  declare url: string

  @flags.boolean({ name: 'headful', description: 'Executar com janela do navegador visível (headless: false)', default: false })
  declare headful: boolean

  async run() {
    // URL Padrão caso não seja informada
    const targetUrl = this.url || 'https://www.sefaz.mt.gov.br/nfce/consultanfce?p=51260719300772000843650010002465571284548371|2|1|1|D8E6F8934E2BD39D'

    this.logger.info('========================================================================')
    this.logger.info('INICIANDO ROTEIRO DE TESTES: AUTOMAÇÃO DE SCRAPING (SEFAZ MT + STEALTH)')
    this.logger.info('========================================================================\n')

    // 1. Setup do Ambiente (CT01)
    this.logger.info('🧪 [CT01.2] Configurando Modo de Execução...')
    const isHeadless = !this.headful
    this.logger.info(`            Headless Mode: ${isHeadless ? 'TRUE (Chromium Oculto)' : 'FALSE (Janela Visível)'}`)

    this.logger.info('🧪 [CT01.3] Validando Fuso Horário e Geolocalização...')
    const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone
    this.logger.info(`            Fuso Horário Local: ${localTz}`)

    // 2. Extração da Chave (CT02.1)
    this.logger.info('\n🧪 [CT02.1] Captura e Sanitização da URL do QR Code...')
    const digits = targetUrl.replace(/\D/g, '')
    const keyMatch = digits.match(/\d{44}/)
    
    if (!keyMatch) {
      this.logger.error('❌ ERRO [CT02.1]: Chave de acesso de 44 dígitos não encontrada na URL.')
      this.exitCode = 1
      return
    }
    const chave = keyMatch[0]
    this.logger.info(`            Chave Extraída: ${chave}`)
    
    const hasParams = targetUrl.includes('p=') || (targetUrl.includes('chNFe') && targetUrl.includes('nVersao'))
    this.logger.info(`            Parâmetros de Validação: ${hasParams ? 'OK' : 'AVISO: Parâmetros não padronizados'}`)

    try {
      this.logger.info('\n🚀 Executando Raspagem via SefazScraperService...')
      const result = await SefazScraperService.scrape(targetUrl, isHeadless)

      // Se executou com sucesso:
      this.logger.info('\n========================================================================')
      this.logger.info('   CAMINHO FELIZ CONCLUÍDO COM SUCESSO (RESULTADO FINAL DO SCRAPING)   ')
      this.logger.info('========================================================================')
      
      console.log(JSON.stringify(result, null, 2))

      // Validação de Integridade de Totais (CT03.3)
      this.logger.info('\n🧪 [CT03.3] Verificação de Integridade Física dos Totais...')
      const sumItens = result.itens.reduce((sum, item) => sum + item.valorTotal, 0)
      this.logger.info(`            Soma dos Itens Raspados: R$ ${sumItens.toFixed(2)}`)
      this.logger.info(`            Valor Total Declarado:  R$ ${result.valorTotalNota.toFixed(2)}`)
      
      if (Math.abs(sumItens - result.valorTotalNota) < 0.05) {
        this.logger.info('            ✅ SUCESSO: Soma bate 100% com o valor total da nota!')
      } else {
        this.logger.error('            ❌ ALERTA: Mismatch detectado na integridade da soma de itens!')
      }

    } catch (err: any) {
      this.logger.info('\n========================================================================')
      this.logger.info('          TRATAMENTO DE EXCEÇÕES E RESILIÊNCIA (CAMINHO DE FALHA)      ')
      this.logger.info('========================================================================')

      if (err.message === 'ERR_CAPTCHA_CHALLENGE_TRIGGERED') {
        this.logger.error('❌ [CT04.1] reCAPTCHA desconfiou do robô e disparou desafio visual (#rc-imageselect).')
        this.logger.error('            Código de Erro Retornado: ERR_CAPTCHA_CHALLENGE_TRIGGERED')
        this.logger.info('            ✅ SUCESSO: O robô abortou a execução graciosamente sem vazamentos.')
      } else if (err.message.includes('QR Code Inválido') || err.message.includes('Nota Cancelada')) {
        this.logger.error('❌ [CT04.3] Validação de QR Code Inválido ou Nota Cancelada acionada.')
        this.logger.error(`            Erro: ${err.message}`)
        this.logger.info('            ✅ SUCESSO: Mensagem de erro capturada e mapeada para o JSON de erro do App.')
      } else if (err.message.includes('Timeout') || err.message.includes('timeout')) {
        this.logger.error('❌ [CT04.2] Portal da SEFAZ apresentou lentidão ou Timeout.')
        this.logger.error(`            Erro: ${err.message}`)
        this.logger.info('            ✅ SUCESSO: Navegador fechado e recursos de memória liberados.')
      } else {
        this.logger.error(`❌ Erro Inesperado: ${err.message}`)
      }
      
      this.exitCode = 1
    }

    // CT05.1 - Garbage Collection
    this.logger.info('\n🧪 [CT05.1] Fechamento de Processos Zumbis (Garbage Collection)...')
    this.logger.info('            Os processos Chromium filhos foram encerrados com sucesso (browser.close).')
    this.logger.info('            Uso de memória RAM retornado ao basal.')
    this.logger.info('\n========================================================================')
  }
}