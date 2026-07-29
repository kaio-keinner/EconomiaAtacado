import { DateTime } from 'luxon'
import ProductMatch from '#models/product_match'
import PriceDaily from '#models/price_daily'
import BasketIndex from '#models/basket_index'

export default class BasketIndexService {
  /**
   * Calcula e salva o índice de cesta por mercado para os últimos N dias.
   */
  static async computeIndex(periodoDias: number = 90): Promise<{ totalDaysComputed: number }> {
    // 1. Seleciona pareamentos válidos (matches confirmados ou auto com alto score)
    const matches = await ProductMatch.query()
      .whereNot('status', 'rejected')
      .where('score', '>=', 0.35)

    if (matches.length === 0) {
      console.log('[BasketIndexService] Nenhum pareamento de produto encontrado para calcular o índice.')
      return { totalDaysComputed: 0 }
    }

    const totalCesta = matches.length
    const minRequired = Math.ceil(totalCesta * 0.8) // Mínimo 80% dos produtos da cesta

    const today = DateTime.now().startOf('day')
    let baseAtacadaoCost: number | null = null
    let baseBigMasterCost: number | null = null
    let totalDaysComputed = 0

    // Itera do dia mais antigo para hoje para estabelecer a base 100
    for (let i = periodoDias - 1; i >= 0; i--) {
      const dateTarget = today.minus({ days: i })
      const diaFormatted = dateTarget.toISODate()!

      // Busca preços do dia para todos os produtos pareados
      const atacadaoIds = matches.map((m) => m.atacadaoProductId)
      const bigmasterIds = matches.map((m) => m.bigmasterProductId)

      const dailyPrices = await PriceDaily.query()
        .whereIn('product_id', [...atacadaoIds, ...bigmasterIds])
        .where('dia', diaFormatted)

      const priceMap = new Map<number, number>()
      for (const p of dailyPrices) {
        const val = Number(p.precoVarejo ?? p.precoAtacado ?? 0)
        if (val > 0) priceMap.set(p.productId, val)
      }

      let validPairsCount = 0
      let totalAtacadao = 0
      let totalBigMaster = 0

      for (const match of matches) {
        const priceA = priceMap.get(match.atacadaoProductId)
        const priceB = priceMap.get(match.bigmasterProductId)

        if (priceA && priceB) {
          validPairsCount++
          totalAtacadao += priceA
          totalBigMaster += priceB
        }
      }

      // Só registra se atingiu pelo menos 80% da cesta
      if (validPairsCount >= minRequired && totalAtacadao > 0 && totalBigMaster > 0) {
        if (baseAtacadaoCost === null) baseAtacadaoCost = totalAtacadao
        if (baseBigMasterCost === null) baseBigMasterCost = totalBigMaster

        const indexAtacadao = parseFloat(((totalAtacadao / baseAtacadaoCost) * 100).toFixed(2))
        const indexBigMaster = parseFloat(((totalBigMaster / baseBigMasterCost) * 100).toFixed(2))

        // Grava Atacadão
        await BasketIndex.updateOrCreate(
          { dia: dateTarget, origem: 'atacadao' },
          { dia: dateTarget, origem: 'atacadao', indice: indexAtacadao, produtosConsiderados: validPairsCount }
        )

        // Grava BigMaster
        await BasketIndex.updateOrCreate(
          { dia: dateTarget, origem: 'bigmaster' },
          { dia: dateTarget, origem: 'bigmaster', indice: indexBigMaster, produtosConsiderados: validPairsCount }
        )

        totalDaysComputed++
      }
    }

    console.log(`[BasketIndexService] Índice de cesta calculado para ${totalDaysComputed} dias (Cesta de ${totalCesta} produtos).`)
    return { totalDaysComputed }
  }

  /**
   * Retorna os pontos da série temporal do índice de cesta por origem para o período solicitado.
   */
  static async getBasketIndex(periodo: string = '90d'): Promise<{
    atacadao: { dia: string; indice: number; produtosConsiderados: number }[]
    bigmaster: { dia: string; indice: number; produtosConsiderados: number }[]
  }> {
    const diasMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 }
    const dias = diasMap[periodo] || 90
    const dataLimite = DateTime.now().minus({ days: dias }).startOf('day').toISODate()!

    let records = await BasketIndex.query()
      .where('dia', '>=', dataLimite)
      .orderBy('dia', 'asc')

    // Se não existirem dados pré-computados, recalcula dinamicamente
    if (records.length === 0) {
      await this.computeIndex(dias)
      records = await BasketIndex.query()
        .where('dia', '>=', dataLimite)
        .orderBy('dia', 'asc')
    }

    const atacadao: { dia: string; indice: number; produtosConsiderados: number }[] = []
    const bigmaster: { dia: string; indice: number; produtosConsiderados: number }[] = []

    for (const r of records) {
      const diaFormatted = DateTime.fromJSDate(new Date(r.dia as any)).toFormat('dd/MM')
      const entry = {
        dia: diaFormatted,
        indice: Number(r.indice),
        produtosConsiderados: r.produtosConsiderados,
      }

      if (r.origem === 'atacadao') {
        atacadao.push(entry)
      } else if (r.origem === 'bigmaster') {
        bigmaster.push(entry)
      }
    }

    return { atacadao, bigmaster }
  }
}
