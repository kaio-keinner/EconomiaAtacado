import type { HttpContext } from '@adonisjs/core/http'
import Product from '#models/product'
import PriceHistory from '#models/price_history'
import ProductTransformer from '#transformers/product_transformer'


import db from '@adonisjs/lucid/services/db'
import fs from 'node:fs'
import path from 'node:path'
import app from '@adonisjs/core/services/app'
import { syncQueue } from '#services/queue_service'



export default class ProductsController {
  // GET /api/atacadao/categories
  async categories({ response }: HttpContext) {
    try {
      const filePath = path.join(app.makePath('config'), 'categories.json')
      if (!fs.existsSync(filePath)) {
        return response.notFound({ error: 'Lista de categorias não encontrada' })
      }
      const content = fs.readFileSync(filePath, 'utf8')
      return response.ok(JSON.parse(content))
    } catch (error: any) {
      return response.internalServerError({ error: error.message })
    }
  }

  // POST /api/atacadao/sync-all
  async syncAll({ request, response }: HttpContext) {
    const maxPaginas = request.input('maxPaginas', 1)
    const delayMs = request.input('delayMs', 5000)

    try {
      const job = await syncQueue.add('atacadao_sync_all', {
        type: 'atacadao_sync_all',
        payload: { maxPaginas, delayMs },
      })

      return response.accepted({
        mensagem: 'Sincronização em lote do Atacadão iniciada em segundo plano',
        jobId: job.id,
        status: 'queued',
      })
    } catch (error: any) {
      if (error.message && (error.message.includes('ECONNREFUSED') || error.message.includes('connect'))) {
        try {
          const AtacadaoScraperService = (await import('#services/atacadao_scraper_service')).default
          const result = await AtacadaoScraperService.syncAll({ maxPaginas, delayMs })
          return response.ok({
            mensagem: 'Sincronização do Atacadão concluída (Modo direto / sem Redis)',
            status: 'completed',
            totalSalvosGlobal: result.totalSalvosGlobal,
            relatorio: result.relatorio,
            result,
          })
        } catch (syncErr: any) {
          return response.internalServerError({
            error: 'Erro ao sincronizar produtos do Atacadão',
            detalhes: syncErr.message,
          })
        }
      }
      return response.internalServerError({ error: error.message })
    }
  }

  // GET /api/products?categoria1=pet-shop&categoria2=acessorios-pet-shop&busca=arroz
  async index({ request, serialize }: HttpContext) {
    const categoria1 = request.input('categoria1')
    const categoria2 = request.input('categoria2')
    const origem = request.input('origem')
    const busca = request.input('busca')

    const query = Product.query().orderBy('createdAt', 'desc').limit(5000)
    if (categoria1) query.where('categoria1', categoria1)
    if (categoria2) query.where('categoria2', categoria2)
    if (origem) query.where('origem', origem)
    if (busca) query.where('nome', 'like', `%${busca}%`)

    const products = await query

    const rawCategories = await db
      .from('products')
      .whereNotNull('categoria_1')
      .where('categoria_1', '!=', '')
      .select('categoria_1')
      .distinct()
      .orderBy('categoria_1', 'asc')

    const categories = rawCategories.map((c) => c.categoria_1)

    return serialize({
      products: ProductTransformer.transform(products),
      categories,
    })
  }

  // GET /api/products/stats
  async stats({ response }: HttpContext) {
    try {
      // Total de produtos por origem
      const countByOrigem = await db
        .from('products')
        .select('origem')
        .count('* as total')
        .groupBy('origem')

      // Categorias distintas por origem
      const categoriasByOrigem = await db
        .from('products')
        .select('origem', 'categoria_1')
        .distinct()
        .orderBy('categoria_1')

      // Última atualização por origem
      const lastUpdate = await db
        .from('products')
        .select('origem')
        .max('updated_at as ultimaAtualizacao')
        .groupBy('origem')

      const stats: Record<string, any> = {}

      for (const row of countByOrigem) {
        const origem = row.origem
        stats[origem] = {
          total: Number(row.total),
          ultimaAtualizacao: null,
          categorias: [] as string[],
        }
      }

      for (const row of lastUpdate) {
        if (stats[row.origem]) {
          stats[row.origem].ultimaAtualizacao = row.ultimaAtualizacao
        }
      }

      for (const row of categoriasByOrigem) {
        if (stats[row.origem]) {
          stats[row.origem].categorias.push(row.categoria_1)
        }
      }

      for (const origem of Object.keys(stats)) {
        stats[origem].totalCategorias = stats[origem].categorias.length
      }

      return response.ok({ stats })
    } catch (error: any) {
      return response.internalServerError({ error: error.message })
    }
  }

  // POST /api/scrape  { categoria1, categoria2, maxPaginas? }
  async scrape({ request, response }: HttpContext) {
    const categoria1 = request.input('categoria1')
    const categoria2 = request.input('categoria2')
    const maxPaginas = request.input('maxPaginas', 5)

    if (!categoria1 || !categoria2) {
      return response.badRequest({ error: 'categoria1 e categoria2 são obrigatórios' })
    }

    try {
      const job = await syncQueue.add('atacadao_scrape', {
        type: 'atacadao_scrape',
        payload: {
          categoria1,
          categoria2,
          maxPaginas,
        }
      })

      return response.accepted({
        mensagem: 'Scrape do Atacadão iniciado em segundo plano',
        jobId: job.id,
        status: 'queued',
      })
    } catch (error: any) {
      if (error.message && (error.message.includes('ECONNREFUSED') || error.message.includes('connect'))) {
        try {
          const AtacadaoScraperService = (await import('#services/atacadao_scraper_service')).default
          const scraper = new AtacadaoScraperService()
          const produtos = await scraper.scrapeCategory(categoria1, categoria2, { maxPaginas, delayMs: 3000 })
          let salvos = 0
          for (const p of produtos) {
            if (!p.id) continue
            const prefixedId = `atacadao_${p.id}`
            await AtacadaoScraperService['upsertWithHistory'](prefixedId, {
              sku: p.sku,
              nome: p.nome ?? '',
              marca: p.marca,
              disponivel: p.disponivel,
              precoVarejo: p.precoVarejo,
              precoAtacado: p.precoAtacado,
              quantidadeMinimaAtacado: p.quantidadeMinimaAtacado,
              imagemUrl: p.imagemUrl,
              categoria1,
              categoria2,
            })
            salvos++
          }
          return response.ok({
            mensagem: 'Scrape do Atacadão concluído (Modo direto / sem Redis)',
            status: 'completed',
            total: salvos,
            salvos,
          })
        } catch (syncErr: any) {
          return response.internalServerError({ error: syncErr.message })
        }
      }
      return response.internalServerError({ error: error.message })
    }
  }


  // POST /api/bigmaster/sync-images
  async syncImages({ response }: HttpContext) {
    try {
      const job = await syncQueue.add('bigmaster_sync_images', {
        type: 'bigmaster_sync_images',
      })
      return response.accepted({
        mensagem: 'Sincronização de imagens do BigMaster iniciada em segundo plano',
        jobId: job.id,
        status: 'queued',
      })
    } catch (error: any) {
      try {
        const BigMasterSyncService = (await import('#services/bigmaster_sync_service')).default
        const result = await BigMasterSyncService.syncImages()
        return response.ok({
          mensagem: 'Sincronização de imagens concluída (Modo direto / sem Redis)',
          status: 'completed',
          total: result.total,
          baixados: result.baixados,
          erros: result.erros,
          result,
        })
      } catch (syncErr: any) {
        return response.internalServerError({ error: syncErr.message })
      }
    }
  }

  // GET /api/products/:id/history?periodo=7d|30d|90d|tudo
  async priceHistory({ params, request, response }: HttpContext) {
    try {
      const product = await Product.find(params.id)
      if (!product) {
        return response.notFound({ error: 'Produto não encontrado' })
      }

      const periodo = request.input('periodo', '90d')

      const query = PriceHistory.query()
        .where('product_id', product.id)
        .orderBy('capturado_em', 'asc')

      // Filtrar por período
      if (periodo !== 'tudo') {
        const diasMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 }
        const dias = diasMap[periodo] || 90
        const dataLimite = new Date()
        dataLimite.setDate(dataLimite.getDate() - dias)
        query.where('capturado_em', '>=', dataLimite.toISOString())
      }

      const history = await query

      // Calcular resumo
      let precoMinimo: number | null = null
      let precoMaximo: number | null = null
      let precoAtual: number | null = null
      let primeiroPrecoPeriodo: number | null = null

      for (const h of history) {
        const preco = Number(h.precoVarejo ?? h.precoAtacado ?? 0)
        if (preco <= 0) continue

        if (precoMinimo === null || preco < precoMinimo) precoMinimo = preco
        if (precoMaximo === null || preco > precoMaximo) precoMaximo = preco
        if (primeiroPrecoPeriodo === null) primeiroPrecoPeriodo = preco
        precoAtual = preco // último da série (ordenada asc)
      }

      let variacaoPercentual: number | null = null
      if (primeiroPrecoPeriodo !== null && precoAtual !== null && primeiroPrecoPeriodo > 0) {
        variacaoPercentual = parseFloat((((precoAtual - primeiroPrecoPeriodo) / primeiroPrecoPeriodo) * 100).toFixed(2))
      }

      return response.ok({
        produto: {
          id: product.id,
          nome: product.nome,
          externalId: product.externalId,
          origem: product.origem,
        },
        historico: history.map((h) => ({
          precoVarejo: h.precoVarejo,
          precoAtacado: h.precoAtacado,
          disponivel: h.disponivel,
          capturadoEm: h.capturadoEm,
        })),
        resumo: {
          precoMinimo,
          precoMaximo,
          precoAtual,
          variacaoPercentual,
        },
      })
    } catch (error: any) {
      return response.internalServerError({ error: error.message })
    }
  }
}

