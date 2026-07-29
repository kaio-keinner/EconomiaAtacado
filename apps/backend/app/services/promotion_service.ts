import { DateTime } from 'luxon'
import Product from '#models/product'
import PriceDaily from '#models/price_daily'

export interface DetectPromotionsOptions {
  periodo?: string
  limite?: number
  categoria?: string
  origem?: string
}

export interface PromotionItemResult {
  id: number
  nome: string
  origem: string
  imagemUrl: string | null
  categoria1: string
  categoria2: string
  precoAtual: number
  precoReferencia: number
  descontoPercentual: number
  economiaReais: number
  diasEmPromocao: number
  sparkline: { dia: string; preco: number }[]
}

export default class PromotionService {
  /**
   * Recalcula o preço de referência (mediana dos últimos 30 dias) para todos os produtos
   * que possuem pelo menos 14 dias em `price_daily`.
   */
  static async recalculateReferences(): Promise<{ totalUpdated: number }> {
    const dataLimite = DateTime.now().minus({ days: 30 }).startOf('day')
    const products = await Product.query().where('disponivel', true)
    let totalUpdated = 0

    for (const prod of products) {
      const dailyRecords = await PriceDaily.query()
        .where('product_id', prod.id)
        .where('dia', '>=', dataLimite.toISODate()!)
        .orderBy('dia', 'asc')

      if (dailyRecords.length < 14) {
        continue // Exige pelo menos 14 dias de histórico
      }

      const prices = dailyRecords
        .map((r) => Number(r.precoVarejo ?? r.precoAtacado ?? 0))
        .filter((p) => p > 0)
        .sort((a, b) => a - b)

      if (prices.length < 14) continue

      // Cálculo da Mediana
      const mid = Math.floor(prices.length / 2)
      const median = prices.length % 2 !== 0 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2

      prod.precoReferencia = parseFloat(median.toFixed(2))
      prod.referenciaCalculadaEm = DateTime.now()
      await prod.save()
      totalUpdated++
    }

    return { totalUpdated }
  }

  /**
   * Detecta produtos atualmente em promoção (pelo menos 10% abaixo do preço de referência)
   */
  static async detectPromotions(options: DetectPromotionsOptions = {}): Promise<PromotionItemResult[]> {
    const query = Product.query()
      .where('disponivel', true)
      .whereNotNull('preco_referencia')

    if (options.categoria) {
      query.where((q) => {
        q.where('categoria_1', options.categoria!).orWhere('categoria_2', options.categoria!)
      })
    }

    if (options.origem) {
      query.where('origem', options.origem)
    }

    const products = await query

    const results: PromotionItemResult[] = []
    const dataLimite30d = DateTime.now().minus({ days: 30 }).startOf('day').toISODate()!

    for (const prod of products) {
      const precoAtual = Number(prod.precoVarejo ?? prod.precoAtacado ?? 0)
      const precoRef = Number(prod.precoReferencia ?? 0)

      if (precoAtual <= 0 || precoRef <= 0) continue

      // Verifica se o preço atual está pelo menos 10% abaixo da referência
      const desconto = (precoRef - precoAtual) / precoRef
      if (desconto < 0.10) continue // Ignora se desconto < 10%

      // Pega série diária dos últimos 30 dias para a sparkline e cálculo de dias em promoção
      const dailyRecords = await PriceDaily.query()
        .where('product_id', prod.id)
        .where('dia', '>=', dataLimite30d)
        .orderBy('dia', 'asc')

      if (dailyRecords.length < 14) continue // Ignora produtos com menos de 14 dias de histórico

      const sparkline = dailyRecords.map((r) => ({
        dia: DateTime.fromJSDate(new Date(r.dia as any)).toFormat('dd/MM'),
        preco: Number(r.precoVarejo ?? r.precoAtacado ?? 0),
      }))

      // Conta dias consecutivos em promoção (de trás para a frente)
      let diasEmPromocao = 0
      const limitePromo = precoRef * 0.90
      for (let i = dailyRecords.length - 1; i >= 0; i--) {
        const p = Number(dailyRecords[i].precoVarejo ?? dailyRecords[i].precoAtacado ?? 0)
        if (p <= limitePromo) {
          diasEmPromocao++
        } else {
          break
        }
      }

      const descontoPercentual = parseFloat((desconto * 100).toFixed(1))
      const economiaReais = parseFloat((precoRef - precoAtual).toFixed(2))

      results.push({
        id: prod.id,
        nome: prod.nome,
        origem: prod.origem,
        imagemUrl: prod.imagemUrl,
        categoria1: prod.categoria1,
        categoria2: prod.categoria2,
        precoAtual,
        precoReferencia: precoRef,
        descontoPercentual,
        economiaReais,
        diasEmPromocao: Math.max(1, diasEmPromocao),
        sparkline,
      })
    }

    // Ordenar por desconto percentual decrescente
    results.sort((a, b) => b.descontoPercentual - a.descontoPercentual)

    if (options.limite && options.limite > 0) {
      return results.slice(0, options.limite)
    }

    return results
  }
}
