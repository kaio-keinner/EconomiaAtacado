import { setTimeout as sleep } from 'node:timers/promises'

const BASE_URL = 'https://www.atacadao.com.br/api/graphql'
const REGION_ID = 'U1cjYXRhY2FkYW9icjYw'
const SELLER = 'atacadaobr60'
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
}
