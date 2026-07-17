import type { HttpContext } from '@adonisjs/core/http'
import Product from '#models/product'
import ProductTransformer from '#transformers/product_transformer'
import AtacadaoScraperService from '#services/atacadao_scraper_service'
import BigMasterSyncService from '#services/bigmaster_sync_service'
import db from '@adonisjs/lucid/services/db'
import fs from 'node:fs'
import path from 'node:path'
import app from '@adonisjs/core/services/app'
import { setTimeout as sleep } from 'node:timers/promises'

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
    const maxPaginas = request.input('maxPaginas', 1) // Padrão: 1 página por subcategoria para não dar block
    const delayMs = request.input('delayMs', 5000)    // 5s de delay entre subcategorias

    try {
      const filePath = path.join(app.makePath('config'), 'categories.json')
      if (!fs.existsSync(filePath)) {
        return response.notFound({ error: 'Lista de categorias não encontrada' })
      }
      const categoriesContent = fs.readFileSync(filePath, 'utf8')
      const categoriesMap: Record<string, string[]> = JSON.parse(categoriesContent)

      const scraper = new AtacadaoScraperService()
      let totalSalvosGlobal = 0
      const logReport: Array<{ cat1: string; cat2: string; total: number; erro?: string }> = []

      // Itera em lote de forma sequencial (Single-threaded control para evitar anti-bot 403)
      for (const [cat1, subcats] of Object.entries(categoriesMap)) {
        if (!Array.isArray(subcats) || subcats.length === 0) {
          // Categorias sem subcategoria (ex: papelaria, automotivo)
          try {
            console.log(`[Atacadão Sync Lote] Coletando categoria raiz: ${cat1}...`)
            const produtos = await scraper.scrapeCategory(cat1, '', { maxPaginas, delayMs: 3000 })
            let salvos = 0
            for (const p of produtos) {
              if (!p.id) continue
              const prefixedId = `atacadao_${p.id}`
              await Product.updateOrCreate(
                { externalId: prefixedId },
                {
                  externalId: prefixedId,
                  sku: p.sku,
                  nome: p.nome ?? '',
                  marca: p.marca,
                  disponivel: p.disponivel,
                  precoVarejo: p.precoVarejo,
                  precoAtacado: p.precoAtacado,
                  quantidadeMinimaAtacado: p.quantidadeMinimaAtacado,
                  imagemUrl: p.imagemUrl,
                  categoria1: cat1,
                  categoria2: '',
                  origem: 'atacadao',
                }
              )
              salvos++
            }
            totalSalvosGlobal += salvos
            logReport.push({ cat1, cat2: '', total: salvos })
            await sleep(delayMs)
          } catch (err: any) {
            console.error(`[Atacadão Sync Lote] Erro em ${cat1}:`, err.message)
            logReport.push({ cat1, cat2: '', total: 0, erro: err.message })
          }
          continue
        }

        for (const cat2 of subcats) {
          try {
            console.log(`[Atacadão Sync Lote] Coletando: ${cat1} > ${cat2}...`)
            const produtos = await scraper.scrapeCategory(cat1, cat2, { maxPaginas, delayMs: 3000 })
            let salvos = 0
            for (const p of produtos) {
              if (!p.id) continue
              const prefixedId = `atacadao_${p.id}`
              await Product.updateOrCreate(
                { externalId: prefixedId },
                {
                  externalId: prefixedId,
                  sku: p.sku,
                  nome: p.nome ?? '',
                  marca: p.marca,
                  disponivel: p.disponivel,
                  precoVarejo: p.precoVarejo,
                  precoAtacado: p.precoAtacado,
                  quantidadeMinimaAtacado: p.quantidadeMinimaAtacado,
                  imagemUrl: p.imagemUrl,
                  categoria1: cat1,
                  categoria2: cat2,
                  origem: 'atacadao',
                }
              )
              salvos++
            }
            totalSalvosGlobal += salvos
            logReport.push({ cat1, cat2, total: salvos })
            await sleep(delayMs) // Delay de descanso extra entre chamadas de subcategorias
          } catch (err: any) {
            console.error(`[Atacadão Sync Lote] Erro em ${cat1}/${cat2}:`, err.message)
            logReport.push({ cat1, cat2, total: 0, erro: err.message })
            if (err.message.includes('403')) {
              // Se tomar 403, interrompe o lote para não queimar o IP do usuário
              return response.serviceUnavailable({
                mensagem: 'Sincronização interrompida devido a bloqueio do Atacadão (403).',
                totalSalvosGlobal,
                relatorio: logReport
              })
            }
          }
        }
      }

      return response.ok({
        mensagem: 'Sincronização em lote concluída com sucesso!',
        totalSalvosGlobal,
        relatorio: logReport
      })
    } catch (error: any) {
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

    return serialize({ products: ProductTransformer.transform(products) })
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

    if (!categoria1 || !categoria2) {
      return response.badRequest({ error: 'categoria1 e categoria2 são obrigatórios' })
    }

    try {
      const scraper = new AtacadaoScraperService()
      const produtos = await scraper.scrapeCategory(categoria1, categoria2, {
        maxPaginas: request.input('maxPaginas', 5),
        delayMs: 3000,
      })

      let salvos = 0
      for (const p of produtos) {
        if (!p.id) continue
        const prefixedId = `atacadao_${p.id}`
        await Product.updateOrCreate(
          { externalId: prefixedId },
          {
            externalId: prefixedId,
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
            origem: 'atacadao',
          }
        )
        salvos++
      }

      return response.ok({ mensagem: 'Scrape concluído', total: salvos })
    } catch (error: any) {
      return response.internalServerError({ error: error.message })
    }
  }

  // POST /api/bigmaster/sync-images
  async syncImages({ response }: HttpContext) {
    try {
      const result = await BigMasterSyncService.syncImages()
      return response.ok({
        mensagem: 'Sincronização de imagens concluída!',
        ...result
      })
    } catch (error: any) {
      return response.internalServerError({ error: error.message })
    }
  }
}

