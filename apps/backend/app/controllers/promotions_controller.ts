import type { HttpContext } from '@adonisjs/core/http'
import Product from '#models/product'
import ProductMatch from '#models/product_match'
import PriceDaily from '#models/price_daily'
import PromotionService from '#services/promotion_service'
import BasketIndexService from '#services/basket_index_service'
import { DateTime } from 'luxon'

// Cache em memória simples com TTL para /api/promotions (15 min)
const promoCache = new Map<string, { timestamp: number; data: any }>()
const CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutos

export default class PromotionsController {
  /**
   * GET /api/promotions?periodo=7d&categoria=&origem=&limite=20
   */
  async index({ request, response }: HttpContext) {
    try {
      const periodo = request.input('periodo', '7d')
      const categoria = request.input('categoria', '')
      const origem = request.input('origem', '')
      const limite = Number(request.input('limite', 20))

      const cacheKey = `promo:${periodo}:${categoria}:${origem}:${limite}`
      const cached = promoCache.get(cacheKey)

      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return response.ok(cached.data)
      }

      const promotions = await PromotionService.detectPromotions({
        periodo,
        categoria: categoria || undefined,
        origem: origem || undefined,
        limite,
      })

      const payload = { promotions }
      promoCache.set(cacheKey, { timestamp: Date.now(), data: payload })

      return response.ok(payload)
    } catch (error: any) {
      return response.internalServerError({ error: error.message })
    }
  }

  /**
   * GET /api/products/:id/insights?periodo=7d|30d|90d|tudo
   */
  async insights({ params, request, response }: HttpContext) {
    try {
      const product = await Product.find(params.id)
      if (!product) {
        return response.notFound({ error: 'Produto não encontrado' })
      }

      const periodo = request.input('periodo', '90d')
      const diasMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 }
      const dias = diasMap[periodo] || 90
      const dataLimite = DateTime.now().minus({ days: dias }).startOf('day').toISODate()!

      // Busca match no outro mercado
      let matchedProduct: Product | null = null
      const match = await ProductMatch.query()
        .where((q) => {
          q.where('atacadaoProductId', product.id).orWhere('bigmasterProductId', product.id)
        })
        .whereNot('status', 'rejected')
        .first()

      if (match) {
        const otherId = match.atacadaoProductId === product.id ? match.bigmasterProductId : match.atacadaoProductId
        matchedProduct = await Product.find(otherId)
      }

      // Identifica quem é Atacadão e quem é BigMaster
      const atacadaoProd = product.origem === 'atacadao' ? product : matchedProduct?.origem === 'atacadao' ? matchedProduct : null
      const bigmasterProd = product.origem === 'bigmaster' ? product : matchedProduct?.origem === 'bigmaster' ? matchedProduct : null

      // Busca registros de price_daily dos últimos N dias
      const idsToQuery = [product.id]
      if (matchedProduct) idsToQuery.push(matchedProduct.id)

      const dailyRecords = await PriceDaily.query()
        .whereIn('product_id', idsToQuery)
        .where('dia', '>=', dataLimite)
        .orderBy('dia', 'asc')

      const atacadaoSeriesMap = new Map<string, number>()
      const bigmasterSeriesMap = new Map<string, number>()
      const allDatesSet = new Set<string>()

      for (const r of dailyRecords) {
        const diaFormatted = DateTime.fromJSDate(new Date(r.dia as any)).toFormat('dd/MM')
        allDatesSet.add(diaFormatted)
        const preco = Number(r.precoVarejo ?? r.precoAtacado ?? 0)

        if (r.productId === atacadaoProd?.id) {
          atacadaoSeriesMap.set(diaFormatted, preco)
        } else if (r.productId === bigmasterProd?.id) {
          bigmasterSeriesMap.set(diaFormatted, preco)
        }
      }

      const datesSorted = Array.from(allDatesSet)

      const series = {
        atacadao: datesSorted.map((d) => ({ dia: d, preco: atacadaoSeriesMap.get(d) ?? null })),
        bigmaster: datesSorted.map((d) => ({ dia: d, preco: bigmasterSeriesMap.get(d) ?? null })),
      }

      // Resumo de métricas para o produto solicitado
      const mainSeriesPrices = dailyRecords
        .filter((r) => r.productId === product.id)
        .map((r) => Number(r.precoVarejo ?? r.precoAtacado ?? 0))
        .filter((p) => p > 0)

      let menorPreco: number | null = null
      let maiorPreco: number | null = null
      let precoAtual: number | null = Number(product.precoVarejo ?? product.precoAtacado ?? 0) || null
      let variacaoPercentual: number | null = null

      if (mainSeriesPrices.length > 0) {
        menorPreco = Math.min(...mainSeriesPrices)
        maiorPreco = Math.max(...mainSeriesPrices)
        const primeiroPreco = mainSeriesPrices[0]
        const ultimoPreco = mainSeriesPrices[mainSeriesPrices.length - 1]
        if (primeiroPreco > 0 && ultimoPreco > 0) {
          variacaoPercentual = parseFloat((((ultimoPreco - primeiroPreco) / primeiroPreco) * 100).toFixed(2))
        }
      }

      const precoRef = Number(product.precoReferencia ?? 0)
      const emPromocao = precoAtual !== null && precoRef > 0 && (precoRef - precoAtual) / precoRef >= 0.10

      return response.ok({
        produto: {
          id: product.id,
          nome: product.nome,
          origem: product.origem,
          precoAtual,
          precoReferencia: precoRef > 0 ? precoRef : null,
          emPromocao,
        },
        series,
        resumo: {
          menorPreco,
          maiorPreco,
          precoAtual,
          variacaoPercentual,
        },
      })
    } catch (error: any) {
      return response.internalServerError({ error: error.message })
    }
  }

  /**
   * GET /api/basket-index?periodo=90d
   */
  async basketIndex({ request, response }: HttpContext) {
    try {
      const periodo = request.input('periodo', '90d')
      const data = await BasketIndexService.getBasketIndex(periodo)
      return response.ok(data)
    } catch (error: any) {
      return response.internalServerError({ error: error.message })
    }
  }
}
