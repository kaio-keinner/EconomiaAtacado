import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class SyncAtacadao extends BaseCommand {
  static commandName = 'sync:atacadao'
  static description = 'Sincroniza produtos do supermercado Atacadão diretamente no banco de dados'

  static options: CommandOptions = {
    startApp: true,
  }

  @flags.number({ description: 'Número máximo de páginas por categoria', default: 1 })
  declare maxPaginas: number

  @flags.number({ description: 'Delay entre requisições em ms', default: 3000 })
  declare delayMs: number

  async run() {
    this.logger.info('🚀 [Atacadão] Iniciando sincronização...')
    try {
      const AtacadaoScraperService = (await import('#services/atacadao_scraper_service')).default
      const res = await AtacadaoScraperService.syncAll({
        maxPaginas: this.maxPaginas,
        delayMs: this.delayMs,
      })
      this.logger.info(`✅ [Atacadão] Sincronização concluída! Total de produtos salvos no BD: ${res.totalSalvosGlobal}`)
    } catch (err: any) {
      this.logger.error(`❌ [Atacadão] Erro durante a sincronização: ${err.message}`)
      this.exitCode = 1
    }
  }
}
