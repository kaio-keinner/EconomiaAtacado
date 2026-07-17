import Product from '#models/product'

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
   * Calcula um score de similaridade entre o item procurado e o produto do banco
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

    // Heurística de números/capacidades (ex: "350ml", "1kg", "2l")
    // Tenta extrair padrões de volumes/pesos e penaliza se houver divergência
    const extractNumbers = (t: string) => {
      const match = t.toLowerCase().match(/\d+\s*(ml|l|g|kg|gla)/g)
      return match ? match.map(m => m.replace(/\s+/g, '')) : []
    }

    const queryNumbers = extractNumbers(queryText)
    const productNumbers = extractNumbers(productText)

    if (queryNumbers.length > 0 && productNumbers.length > 0) {
      // Se os números encontrados não batem, reduz drasticamente a similaridade
      const hasMatch = queryNumbers.some(qn => productNumbers.includes(qn))
      if (!hasMatch) {
        score -= 0.5 // Penalidade por volume/peso diferente
      } else {
        score += 0.1 // Bônus por volume/peso correspondente
      }
    }

    return score
  }

  /**
   * Compara uma lista de itens de entrada buscando a melhor correspondência em cada mercado
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
    // Carrega todos os produtos ativos de ambos os mercados da base para comparação em memória
    // Isso evita múltiplas queries lentas e garante performance excelente
    const allProducts = await Product.query().where('disponivel', true)
    
    const atacadaoProducts = allProducts.filter(p => p.origem === 'atacadao')
    const bigmasterProducts = allProducts.filter(p => p.origem === 'bigmaster')

    // Pré-tokeniza os produtos para otimizar a velocidade de busca
    const atacadaoTokenized = atacadaoProducts.map(p => ({
      product: p,
      tokens: this.tokenize(p.nome)
    }))

    const bigmasterTokenized = bigmasterProducts.map(p => ({
      product: p,
      tokens: this.tokenize(p.nome)
    }))

    const comparedItems: ComparedItem[] = []

    for (const item of items) {
      const queryTokens = this.tokenize(item.nome)

      // Busca o melhor match no Atacadão
      let bestAtacadaoMatch: Product | null = null
      let bestAtacadaoScore = 0.3 // Similaridade mínima aceitável

      for (const entry of atacadaoTokenized) {
        const score = this.calculateSimilarity(queryTokens, entry.tokens, item.nome, entry.product.nome)
        if (score > bestAtacadaoScore) {
          bestAtacadaoScore = score
          bestAtacadaoMatch = entry.product
        }
      }

      // Busca o melhor match no BigMaster
      let bestBigMasterMatch: Product | null = null
      let bestBigMasterScore = 0.3 // Similaridade mínima aceitável

      for (const entry of bigmasterTokenized) {
        const score = this.calculateSimilarity(queryTokens, entry.tokens, item.nome, entry.product.nome)
        if (score > bestBigMasterScore) {
          bestBigMasterScore = score
          bestBigMasterMatch = entry.product
        }
      }

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

    // Calcula os totais baseados nos matches encontrados
    let totalAtacadao = 0
    let totalBigMaster = 0

    for (const item of comparedItems) {
      // Se não encontrar o produto em algum dos mercados, podemos usar o preço do outro como fallback ou ignorar
      // Usaremos o preço do mercado encontrado se o outro estiver ausente para termos um total comparável justo
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
