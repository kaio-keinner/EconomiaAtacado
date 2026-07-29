import { setTimeout as sleep } from 'node:timers/promises'
import env from '#start/env'
import Product from '#models/product'
import PriceHistory from '#models/price_history'
import ScraperHealthService from '#services/scraper_health_service'
import { DateTime } from 'luxon'
import fs from 'node:fs'
import path from 'node:path'
import app from '@adonisjs/core/services/app'


const BASE_URL =
  env.get('ATACADAO_GRAPHQL_URL') || process.env.ATACADAO_GRAPHQL_URL || 'https://www.atacadao.com.br/api/graphql'
const REGION_ID =
  env.get('ATACADAO_REGION_ID') || process.env.ATACADAO_REGION_ID || 'U1cjYXRhY2FkYW9icjYw'
const SELLER =
  env.get('ATACADAO_SELLER') || process.env.ATACADAO_SELLER || 'atacadaobr60'
const PAGE_SIZE = 20

const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  'Referer': 'https://www.atacadao.com.br/',
  'Origin': 'https://www.atacadao.com.br',
}

export interface RawProduct {
  id: string | null
  sku: string | null
  nome: string | null
  marca: string | null
  disponivel: boolean
  precoVarejo: number | null
  precoAtacado: number | null
  quantidadeMinimaAtacado: number | null
  imagemUrl: string | null
}

function buildUrl(cat1: string, cat2: string, cursor: number): string {
  const variables = {
    first: PAGE_SIZE,
    after: String(cursor),
    sort: 'score_desc',
    term: '',
    selectedFacets: [
      { key: 'category-1', value: cat1 },
      { key: 'category-2', value: cat2 },
      { key: 'region-id', value: REGION_ID },
      {
        key: 'channel',
        value: JSON.stringify({ salesChannel: '1', seller: SELLER, regionId: REGION_ID }),
      },
      { key: 'locale', value: 'pt-BR' },
    ],
  }

  const params = new URLSearchParams({
    operationName: 'ProductsQuery',
    variables: JSON.stringify(variables),
  })

  return `${BASE_URL}?${params.toString()}`
}

function parseProduct(edge: any): RawProduct {
  const node = edge?.node ?? {}
  const images = node.image ?? []
  const imagemUrl = images.length > 0 ? images[0].url : null

  const offersWrapper = node.offers ?? {}
  const lowPrice = offersWrapper.lowPrice ?? 0
  const offers = offersWrapper.offers ?? []
  const disponivel = !!lowPrice

  let precoVarejo: number | null = null
  let precoAtacado: number | null = null
  let quantidadeMinimaAtacado: number | null = null

  if (disponivel) {
    const varejo = offers.find((o: any) => o.minQuantity === 1)
    if (varejo) precoVarejo = varejo.price

    const atacado = offers.find((o: any) => (o.minQuantity ?? 0) > 1)
    if (atacado) {
      precoAtacado = atacado.price
      quantidadeMinimaAtacado = atacado.minQuantity
    }
  }

  return {
    id: node.id ?? null,
    sku: node.sku ?? null,
    nome: node.name ?? null,
    marca: node.brand?.name ?? null,
    disponivel,
    precoVarejo,
    precoAtacado,
    quantidadeMinimaAtacado,
    imagemUrl,
  }
}

export default class AtacadaoScraperService {
  async scrapeCategory(
    categoria1: string,
    categoria2: string,
    options: { maxPaginas?: number; delayMs?: number } = {}
  ): Promise<RawProduct[]> {
    const delayMs = Math.max(options.delayMs ?? 3000, 2000)
    const produtos: RawProduct[] = []

    let cursor = 0
    let pagina = 0
    let tentativas429 = 0

    while (true) {
      if (options.maxPaginas && pagina >= options.maxPaginas) break

      const url = buildUrl(categoria1, categoria2, cursor)
      const resp = await fetch(url, { headers: DEFAULT_HEADERS })

      if (resp.status === 429) {
        tentativas429 += 1
        await sleep(10_000 * tentativas429)
        continue
      }

      if (resp.status === 403) {
        // Bloqueio de proteção anti-bot: paramos aqui, sem tentar contornar.
        throw new Error(
          '403 Forbidden — bloqueio detectado no Atacadão. Reduza a frequência ou colete manualmente essa categoria.'
        )
      }

      if (!resp.ok) {
        throw new Error(`Status inesperado da API: ${resp.status}`)
      }

      tentativas429 = 0
      const data: any = await resp.json()
      const edges = data?.data?.search?.products?.edges

      if (!edges || edges.length === 0) break

      for (const edge of edges) produtos.push(parseProduct(edge))

      cursor += PAGE_SIZE
      pagina += 1
      await sleep(delayMs)
    }

    return produtos
  }

  /**
   * Persiste ou atualiza um produto do Atacadão e registra histórico de preço
   * quando o preço ou disponibilidade mudou.
   */
  private static async upsertWithHistory(prefixedId: string, data: {
    sku: string | null
    nome: string
    marca: string | null
    disponivel: boolean
    precoVarejo: number | null
    precoAtacado: number | null
    quantidadeMinimaAtacado: number | null
    imagemUrl: string | null
    categoria1: string
    categoria2: string
  }): Promise<void> {
    const existing = await Product.findBy('externalId', prefixedId)

    if (existing) {
      const precoMudou =
        existing.precoVarejo !== data.precoVarejo ||
        existing.precoAtacado !== data.precoAtacado ||
        existing.disponivel !== data.disponivel

      existing.merge({ ...data, origem: 'atacadao' })
      await existing.save()

      if (precoMudou) {
        await PriceHistory.create({
          productId: existing.id,
          precoVarejo: data.precoVarejo,
          precoAtacado: data.precoAtacado,
          disponivel: data.disponivel,
          capturadoEm: DateTime.now(),
        })
      }
    } else {
      const created = await Product.create({
        externalId: prefixedId,
        ...data,
        origem: 'atacadao',
      })
      // Primeiro registro de preço
      await PriceHistory.create({
        productId: created.id,
        precoVarejo: data.precoVarejo,
        precoAtacado: data.precoAtacado,
        disponivel: data.disponivel,
        capturadoEm: DateTime.now(),
      })
    }
  }

  static async syncAll(
    options: { maxPaginas?: number; delayMs?: number } = {},
    job?: any
  ): Promise<{ totalSalvosGlobal: number; relatorio: Array<{ cat1: string; cat2: string; total: number; erro?: string }> }> {
    const maxPaginas = options.maxPaginas ?? 1
    const delayMs = Math.max(options.delayMs ?? 5000, 2000)

    const filePath = path.join(app.makePath('config'), 'categories.json')
    if (!fs.existsSync(filePath)) {
      throw new Error('Lista de categorias não encontrada em config/categories.json')
    }
    const categoriesContent = fs.readFileSync(filePath, 'utf8')
    const categoriesMap: Record<string, string[]> = JSON.parse(categoriesContent)

    const scraper = new AtacadaoScraperService()
    let totalSalvosGlobal = 0
    const logReport: Array<{ cat1: string; cat2: string; total: number; erro?: string }> = []
    let foiBloqueado = false

    const totalCategorias = Object.keys(categoriesMap).length
    let processadas = 0

    for (const [cat1, subcats] of Object.entries(categoriesMap)) {
      processadas++
      if (job) {
        await job.updateProgress(`${processadas}/${totalCategorias} categorias processadas (Total Salvos: ${totalSalvosGlobal})`)
      }

      if (!Array.isArray(subcats) || subcats.length === 0) {
        try {
          console.log(`[Atacadão Sync Lote] Coletando categoria raiz: ${cat1}...`)
          const produtos = await scraper.scrapeCategory(cat1, '', { maxPaginas, delayMs: 3000 })
          let salvos = 0
          for (const p of produtos) {
            if (!p.id) continue
            const prefixedId = `atacadao_${p.id}`
            await AtacadaoScraperService.upsertWithHistory(prefixedId, {
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
            })
            salvos++
          }
          totalSalvosGlobal += salvos
          logReport.push({ cat1, cat2: '', total: salvos })
          await sleep(delayMs)
        } catch (err: any) {
          console.error(`[Atacadão Sync Lote] Erro em ${cat1}:`, err.message)
          logReport.push({ cat1, cat2: '', total: 0, erro: err.message })
          if (err.message.includes('403')) {
            foiBloqueado = true
            break
          }
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
            await AtacadaoScraperService.upsertWithHistory(prefixedId, {
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
            })
            salvos++
          }
          totalSalvosGlobal += salvos
          logReport.push({ cat1, cat2, total: salvos })
          await sleep(delayMs)
        } catch (err: any) {
          console.error(`[Atacadão Sync Lote] Erro em ${cat1}/${cat2}:`, err.message)
          logReport.push({ cat1, cat2, total: 0, erro: err.message })
          if (err.message.includes('403')) {
            foiBloqueado = true
            break
          }
        }
      }

      if (foiBloqueado) break
    }

    if (foiBloqueado) {
      await ScraperHealthService.recordRun({
        fonte: 'atacadao',
        status: 'failed',
        itensColetados: totalSalvosGlobal,
        erro: 'Sincronização interrompida devido a bloqueio do Atacadão (403)',
      })
      throw new Error(`Sincronização interrompida devido a bloqueio do Atacadão (403). Relatório parcial: ${JSON.stringify(logReport)}`)
    }

    await ScraperHealthService.recordRun({
      fonte: 'atacadao',
      status: 'success',
      itensColetados: totalSalvosGlobal,
    })

    return {
      totalSalvosGlobal,
      relatorio: logReport,
    }
  }
}


