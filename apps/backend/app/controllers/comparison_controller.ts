import type { HttpContext } from '@adonisjs/core/http'
import BigMasterSyncService from '#services/bigmaster_sync_service'
import PriceComparisonService from '#services/price_comparison_service'

export default class ComparisonController {
  /**
   * Sincroniza a base de dados local com as ofertas mais recentes do BigMaster
   * POST /api/bigmaster/sync
   */
  async syncBigMaster({ response }: HttpContext) {
    try {
      const result = await BigMasterSyncService.sync()
      return response.ok({
        mensagem: 'Sincronização com o BigMaster realizada com sucesso!',
        totalRecebido: result.total,
        totalSalvo: result.salvos,
        dataPromocao: result.dataPromocao
      })
    } catch (error: any) {
      return response.internalServerError({
        error: 'Erro durante a sincronização com o BigMaster',
        detalhes: error.message
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
