import type { HttpContext } from '@adonisjs/core/http'
import PriceComparisonService from '#services/price_comparison_service'
import { syncQueue } from '#services/queue_service'


export default class ComparisonController {
  /**
   * Sincroniza a base de dados local com as ofertas mais recentes do BigMaster
   * POST /api/bigmaster/sync
   */
  async syncBigMaster({ response }: HttpContext) {
    try {
      const job = await syncQueue.add('bigmaster_sync', {
        type: 'bigmaster_sync',
      })

      return response.accepted({
        mensagem: 'Sincronização com o BigMaster iniciada em segundo plano',
        jobId: job.id,
        status: 'queued',
      })
    } catch (error: any) {
      if (error.message && (error.message.includes('ECONNREFUSED') || error.message.includes('connect'))) {
        try {
          const BigMasterSyncService = (await import('#services/bigmaster_sync_service')).default
          const result = await BigMasterSyncService.sync()
          return response.ok({
            mensagem: 'Sincronização com o BigMaster concluída (Modo direto / sem Redis)',
            status: 'completed',
            salvos: result.salvos,
            total: result.total,
            result,
          })
        } catch (syncErr: any) {
          return response.internalServerError({
            error: 'Erro ao sincronizar produtos do BigMaster',
            detalhes: syncErr.message,
          })
        }
      }
      return response.internalServerError({
        error: 'Erro ao enfileirar a sincronização do BigMaster',
        detalhes: error.message,
      })
    }
  }


  /**
   * Compara uma lista de itens enviada pelo usuário em ambos os mercados
   * POST /api/compare
   */
  async compare({ request, response }: HttpContext) {
    const items = request.input('items')

    if (!items || !Array.isArray(items)) {
      return response.badRequest({
        error: 'Uma lista de "items" contendo objetos com "nome" e "quantidade" é necessária.'
      })
    }

    try {
      const result = await PriceComparisonService.compareList(items)
      return response.ok(result)
    } catch (error: any) {
      return response.internalServerError({
        error: 'Erro ao processar comparação de preços',
        detalhes: error.message
      })
    }
  }
}
