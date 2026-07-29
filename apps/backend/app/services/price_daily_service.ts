import { DateTime } from 'luxon'
import Product from '#models/product'
import PriceHistory from '#models/price_history'
import PriceDaily from '#models/price_daily'
import db from '@adonisjs/lucid/services/db'

export default class PriceDailyService {
  /**
   * Consolida a série diária de preços para uma data específica.
   * A operação é idempotente (rodar múltiplas vezes para a mesma data atualiza sem duplicar).
   */
  static async consolidate(targetDate: DateTime | string): Promise<{ totalProcessed: number; consolidatedCount: number }> {
    const dt = typeof targetDate === 'string' ? DateTime.fromISO(targetDate) : targetDate
    const diaFormatted = dt.toISODate()! // 'YYYY-MM-DD'
    const inicioDia = dt.startOf('day')
    const fimDia = dt.endOf('day')

    const products = await Product.query().select('id')
    let consolidatedCount = 0

    for (const prod of products) {
      // Pega a última entrada de price_history até o fim do dia
      const lastHistory = await PriceHistory.query()
        .where('product_id', prod.id)
        .where('capturado_em', '<=', fimDia.toSQL()!)
        .orderBy('capturado_em', 'desc')
        .first()

      if (!lastHistory) {
        continue // Sem histórico até essa data
      }

      // Verifica se a captura ocorreu no dia em questão
      const capturadoNoDia = lastHistory.capturadoEm >= inicioDia && lastHistory.capturadoEm <= fimDia
      const fonte = capturadoNoDia ? 'captura' : 'forward_fill'

      // Upsert em price_daily (chave única: product_id + dia)
      const existing = await PriceDaily.query()
        .where('product_id', prod.id)
        .where('dia', diaFormatted)
        .first()

      if (existing) {
        existing.precoVarejo = lastHistory.precoVarejo
        existing.precoAtacado = lastHistory.precoAtacado
        existing.disponivel = lastHistory.disponivel
        existing.fonte = fonte
        await existing.save()
      } else {
        await PriceDaily.create({
          productId: prod.id,
          dia: dt.startOf('day'),
          precoVarejo: lastHistory.precoVarejo,
          precoAtacado: lastHistory.precoAtacado,
          disponivel: lastHistory.disponivel,
          fonte,
        })
      }

      consolidatedCount++
    }

    return { totalProcessed: products.length, consolidatedCount }
  }

  /**
   * Executa a consolidação para um intervalo de N dias passados até hoje.
   */
  static async backfill(dias: number = 30): Promise<{ totalDays: number; totalRecords: number }> {
    let totalRecords = 0
    const today = DateTime.now()

    for (let i = dias - 1; i >= 0; i--) {
      const dateToConsolidate = today.minus({ days: i })
      const res = await this.consolidate(dateToConsolidate)
      totalRecords += res.consolidatedCount
    }

    return { totalDays: dias, totalRecords }
  }
}
