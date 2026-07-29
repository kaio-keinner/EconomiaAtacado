import Product from '#models/product'
import ProductMatch from '#models/product_match'

interface InputItem {
  nome: string
  quantidade: number
  precoOriginal?: number // Opcional, preço pago no cupom original
}

interface MarketMatch {
  id: number
  externalId: string
  nome: string
  preco: number
  marca: string | null
  imagemUrl: string | null
  quantidadeMinimaAtacado?: number
}

interface ComparedItem {
  nomeOriginal: string
  quantidade: number
  precoOriginal?: number
  atacadao: MarketMatch | null
  bigmaster: MarketMatch | null
}

export default class PriceComparisonService {
  /**
   * Tokeniza uma string de texto removendo pontuações e stop words comuns
   */
  private static tokenize(text: string): string[] {
    if (!text) return []
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s]/g, ' ') // Remove caracteres especiais
      .split(/\s+/)
      .filter((token) => token.length > 1) // Filtra conectores ou letras sozinhas
  }

  /**
   * Semântica e Heurística Avançada de Similaridade
   * Combina Overlap de Tokens, Bigramas/Trigramas (N-Grams) e Regex de Pesos/Volume
   */
  private static calculateSimilarity(queryTokens: string[], productTokens: string[], queryText: string, productText: string): number {
    if (queryTokens.length === 0 || productTokens.length === 0) return 0

    // Encontra a interseção de tokens
    const querySet = new Set(queryTokens)
    const intersection = productTokens.filter((token) => querySet.has(token))
    
    // Proporção de tokens da query que estão presentes no produto
    let score = intersection.length / queryTokens.length

    // Bônus se todos os tokens da query estiverem no produto
    if (intersection.length === queryTokens.length) {
      score += 0.2
    }

    // N-gram similarity (Jaccard similarity de bigramas)
    const getBigrams = (str: string) => {
      const clean = str.toLowerCase().replace(/[^\w]/g, '')
      const bigrams = new Set<string>()
      for (let i = 0; i < clean.length - 1; i++) {
        bigrams.add(clean.slice(i, i + 2))
      }
      return bigrams
    }

    const queryBigrams = getBigrams(queryText)
    const productBigrams = getBigrams(productText)
    if (queryBigrams.size > 0 && productBigrams.size > 0) {
      const sharedBigrams = [...queryBigrams].filter(b => productBigrams.has(b)).length
      const jaccard = sharedBigrams / (queryBigrams.size + productBigrams.size - sharedBigrams)
      score += jaccard * 0.15
    }

    // Heurística de números/capacidades (ex: "350ml", "1kg", "2l")
    const extractNumbers = (t: string) => {
      const match = t.toLowerCase().match(/\d+\s*(ml|l|g|kg|gla)/g)
      return match ? match.map(m => m.replace(/\s+/g, '')) : []
    }

    const queryNumbers = extractNumbers(queryText)
    const productNumbers = extractNumbers(productText)

    if (queryNumbers.length > 0 && productNumbers.length > 0) {
      const hasMatch = queryNumbers.some(qn => productNumbers.includes(qn))
      if (!hasMatch) {
        score -= 0.5 // Penalidade por volume/peso diferente
      } else {
        score += 0.15 // Bônus por volume/peso correspondente
      }
    }

    return Math.max(0, Math.min(1, score))
  }

  /**
   * Tarefa 5.1 — Job de pré-computação de pareamentos entre Atacadão e BigMaster.
   * Roda em segundo plano após cada sincronização e grava os melhores matches na tabela product_matches.
   */
  static async recomputeMatches(job?: any): Promise<{ totalProcessed: number; matchesCreated: number }> {
    console.log('[ProductMatch Engine] Iniciando pré-computação de pareamentos...')
    
    const atacadaoProducts = await Product.query().where('origem', 'atacadao').where('disponivel', true)
    const bigmasterProducts = await Product.query().where('origem', 'bigmaster').where('disponivel', true)

    const bigmasterTokenized = bigmasterProducts.map(p => ({
      product: p,
      tokens: this.tokenize(p.nome)
    }))

    let matchesCreated = 0
    let totalProcessed = 0

    for (const atacadaoProduct of atacadaoProducts) {
      totalProcessed++
      const queryTokens = this.tokenize(atacadaoProduct.nome)

      let bestMatch: Product | null = null
      let bestScore = 0.35 // Score mínimo de confiança para pareamento pré-calculado

      for (const entry of bigmasterTokenized) {
        const score = this.calculateSimilarity(queryTokens, entry.tokens, atacadaoProduct.nome, entry.product.nome)
        if (score > bestScore) {
          bestScore = score
          bestMatch = entry.product
        }
      }

      if (bestMatch) {
        // Verifica se já existe pareamento manual ou ignorado
        const existing = await ProductMatch.query()
          .where('atacadaoProductId', atacadaoProduct.id)
          .where('bigmasterProductId', bestMatch.id)
          .first()

        if (existing) {
          // Se for correção manual, respeita a decisão do admin/usuário!
          if (existing.status !== 'manual') {
            existing.score = Number(bestScore.toFixed(4))
            await existing.save()
          }
        } else {
          await ProductMatch.create({
            atacadaoProductId: atacadaoProduct.id,
            bigmasterProductId: bestMatch.id,
            score: Number(bestScore.toFixed(4)),
            status: 'auto',
          })
          matchesCreated++
        }
      }

      if (job && totalProcessed % 20 === 0) {
        await job.updateProgress(`${totalProcessed}/${atacadaoProducts.length} produtos pareados`)
      }
    }

    console.log(`[ProductMatch Engine] Concluído. Processados: ${totalProcessed}, Pareamentos gravados: ${matchesCreated}`)
    return { totalProcessed, matchesCreated }
  }

  /**
   * Compara uma lista de itens utilizando cache/lookups pré-computados em product_matches
   */
  static async compareList(items: InputItem[]): Promise<{
    comparedItems: ComparedItem[]
    resumo: {
      totalAtacadao: number
      totalBigMaster: number
      economiaTotal: number
      melhorOpcao: 'atacadao' | 'bigmaster' | 'empate'
    }
  }> {
    const startTime = Date.now()

    // 1. Carrega catálogo ativo em memória para consulta ultrarrápida (O(1) lookups)
    const allProducts = await Product.query().where('disponivel', true)
    const productById = new Map<number, Product>()
    for (const p of allProducts) productById.set(p.id, p)

    const atacadaoProducts = allProducts.filter(p => p.origem === 'atacadao')
    const bigmasterProducts = allProducts.filter(p => p.origem === 'bigmaster')

    // 2. Carrega tabela pré-computada de pareamentos (excluindo os rejaitados pelo admin)
    const precomputedMatches = await ProductMatch.query().whereNot('status', 'rejected')
    const precomputedMap = new Map<number, number>() // atacadaoProductId -> bigmasterProductId
    for (const m of precomputedMatches) {
      precomputedMap.set(m.atacadaoProductId, m.bigmasterProductId)
    }

    const atacadaoTokenized = atacadaoProducts.map(p => ({
      product: p,
      tokens: this.tokenize(p.nome)
    }))

    const bigmasterTokenized = bigmasterProducts.map(p => ({
      product: p,
      tokens: this.tokenize(p.nome)
    }))

    const comparedItems: ComparedItem[] = []
    let missingAtacadao = 0
    let missingBigMaster = 0

    for (const item of items) {
      const queryTokens = this.tokenize(item.nome)

      // Busca o melhor match no Atacadão
      let bestAtacadaoMatch: Product | null = null
      let bestAtacadaoScore = 0.3

      for (const entry of atacadaoTokenized) {
        const score = this.calculateSimilarity(queryTokens, entry.tokens, item.nome, entry.product.nome)
        if (score > bestAtacadaoScore) {
          bestAtacadaoScore = score
          bestAtacadaoMatch = entry.product
        }
      }

      // Busca o melhor match no BigMaster (usa lookup pré-computado se o Atacadão combinou)
      let bestBigMasterMatch: Product | null = null

      if (bestAtacadaoMatch && precomputedMap.has(bestAtacadaoMatch.id)) {
        const bigmasterId = precomputedMap.get(bestAtacadaoMatch.id)!
        bestBigMasterMatch = productById.get(bigmasterId) || null
      }

      // Fallback em tempo real caso não esteja na tabela pré-computada
      if (!bestBigMasterMatch) {
        let bestBigMasterScore = 0.3
        for (const entry of bigmasterTokenized) {
          const score = this.calculateSimilarity(queryTokens, entry.tokens, item.nome, entry.product.nome)
          if (score > bestBigMasterScore) {
            bestBigMasterScore = score
            bestBigMasterMatch = entry.product
          }
        }
      }

      if (!bestAtacadaoMatch) missingAtacadao++
      if (!bestBigMasterMatch) missingBigMaster++

      const mapToMatch = (p: Product | null): MarketMatch | null => {
        if (!p) return null
        return {
          id: p.id,
          externalId: p.externalId,
          nome: p.nome,
          preco: p.precoVarejo ?? p.precoAtacado ?? 0.0,
          marca: p.marca,
          imagemUrl: p.imagemUrl,
          quantidadeMinimaAtacado: p.quantidadeMinimaAtacado || undefined
        }
      }

      comparedItems.push({
        nomeOriginal: item.nome,
        quantidade: item.quantidade,
        precoOriginal: item.precoOriginal,
        atacadao: mapToMatch(bestAtacadaoMatch),
        bigmaster: mapToMatch(bestBigMasterMatch),
      })
    }

    // Tarefa 5.3 — Métricas de qualidade do matching
    const totalItems = items.length
    const unmatchedCount = missingAtacadao + missingBigMaster
    const unmatchedRate = totalItems > 0 ? (unmatchedCount / (totalItems * 2)) : 0

    console.log(
      `[Matching Metrics] Total Itens: ${totalItems}, Sem match Atacadão: ${missingAtacadao}, Sem match BigMaster: ${missingBigMaster}, Taxa sem match: ${(unmatchedRate * 100).toFixed(1)}%, Tempo: ${Date.now() - startTime}ms`
    )

    // Calcula os totais baseados nos matches encontrados
    let totalAtacadao = 0
    let totalBigMaster = 0

    for (const item of comparedItems) {
      const precoAtacadao = item.atacadao?.preco ?? item.bigmaster?.preco ?? item.precoOriginal ?? 0.0
      const precoBigMaster = item.bigmaster?.preco ?? item.atacadao?.preco ?? item.precoOriginal ?? 0.0

      totalAtacadao += precoAtacadao * item.quantidade
      totalBigMaster += precoBigMaster * item.quantidade
    }

    let melhorOpcao: 'atacadao' | 'bigmaster' | 'empate' = 'empate'
    if (totalAtacadao < totalBigMaster) {
      melhorOpcao = 'atacadao'
    } else if (totalBigMaster < totalAtacadao) {
      melhorOpcao = 'bigmaster'
    }

    return {
      comparedItems,
      resumo: {
        totalAtacadao: parseFloat(totalAtacadao.toFixed(2)),
        totalBigMaster: parseFloat(totalBigMaster.toFixed(2)),
        economiaTotal: parseFloat(Math.abs(totalAtacadao - totalBigMaster).toFixed(2)),
        melhorOpcao,
      }
    }
  }
}

