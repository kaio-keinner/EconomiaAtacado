import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class SyncBigMaster extends BaseCommand {
  static commandName = 'sync:bigmaster'
  static description = 'Sincroniza produtos do supermercado BigMaster diretamente no banco de dados'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.info('🚀 [BigMaster] Iniciando sincronização...')
    try {
      const BigMasterSyncService = (await import('#services/bigmaster_sync_service')).default
      const res = await BigMasterSyncService.sync()
      this.logger.info(`✅ [BigMaster] Sincronização concluída! Total na API: ${res.total}, Salvos no BD: ${res.salvos}`)
    } catch (err: any) {
      this.logger.error(`❌ [BigMaster] Erro durante a sincronização: ${err.message}`)
      this.exitCode = 1
    }
  }
}
