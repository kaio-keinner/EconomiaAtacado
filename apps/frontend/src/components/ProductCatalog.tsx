import { useState, useMemo, useEffect } from 'react'
import { type Product } from './ProductTable'
import { MagnifyingGlassIcon, XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { getImageUrl, fetchProducts } from '../api/client'

interface ProductCatalogProps {
  products: Product[]
  comparisonItems: Array<{ nome: string; quantidade: number }>
  onAddToComparison: (nome: string, preco?: number) => void
  onRemoveFromComparison: (nome: string) => void
}

export function ProductCatalog({
  products,
  comparisonItems,
  onAddToComparison,
  onRemoveFromComparison,
}: ProductCatalogProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrigem, setSelectedOrigem] = useState<'todos' | 'atacadao' | 'bigmaster'>('todos')
  const [sortBy, setSortBy] = useState<'nome' | 'preco_menor' | 'preco_maior'>('nome')
  const [onlyAvailable, setOnlyAvailable] = useState(false)

  // Estado para armazenar os produtos carregados do banco (suporta busca geral)
  const [dbProducts, setDbProducts] = useState<Product[]>(products)
  const [loading, setLoading] = useState(false)

  // Sincroniza o estado inicial
  useEffect(() => {
    setDbProducts(products)
  }, [products])

  // Efeito para buscar no banco dinamicamente com base em filtros e termo
  useEffect(() => {
    const fetchFiltered = async () => {
      setLoading(true)
      try {
        const params: any = {
          busca: searchTerm.trim() || undefined,
          origem: selectedOrigem !== 'todos' ? selectedOrigem : undefined,
        }
        const data = await fetchProducts(params)
        setDbProducts(data.products || [])
      } catch (err) {
        console.error('Erro ao buscar catálogo filtrado:', err)
      } finally {
        setLoading(false)
      }
    }

    const timer = setTimeout(fetchFiltered, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, selectedOrigem, products])

  // Filtragem local de ordenação e estoque sobre os dados vindos do banco
  const sortedAndFiltered = useMemo(() => {
    let result = [...dbProducts]

    // Filtro de Disponibilidade
    if (onlyAvailable) {
      result = result.filter((p) => p.disponivel)
    }

    // Ordenação
    result.sort((a, b) => {
      if (sortBy === 'preco_menor') {
        const pA = Number(a.precoVarejo ?? a.precoAtacado) || Infinity
        const pB = Number(b.precoVarejo ?? b.precoAtacado) || Infinity
        return pA - pB
      }
      if (sortBy === 'preco_maior') {
        const pA = Number(a.precoVarejo ?? a.precoAtacado) || -Infinity
        const pB = Number(b.precoVarejo ?? b.precoAtacado) || -Infinity
        return pB - pA
      }
      return a.nome.localeCompare(b.nome)
    })

    return result
  }, [dbProducts, onlyAvailable, sortBy])

  // Função local de correspondência cruzada de preços (Fuzzy Matching no cliente)
  const findCrossMarketMatch = (product: Product) => {
    const otherOrigem = product.origem === 'atacadao' ? 'bigmaster' : 'atacadao'
    const pName = product.nome.toLowerCase()
    
    // Normalizar texto
    const cleanString = (str: string) => 
      str.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').filter(w => w.length > 2)
      
    const pWords = cleanString(pName)
    if (pWords.length === 0) return null

    let bestMatch: Product | null = null
    let bestScore = 0

    // Busca candidatos no outro mercado
    const candidates = dbProducts.filter(p => p.origem === otherOrigem)
    for (const cand of candidates) {
      const cWords = cleanString(cand.nome.toLowerCase())
      
      // Contar interseção de palavras
      let matches = 0
      for (const w of pWords) {
        if (cWords.includes(w)) matches++
      }
      
      if (matches > bestScore && matches >= 2) {
        bestScore = matches
        bestMatch = cand
      }
    }
    return bestMatch
  }

  const isCompared = (nome: string) => {
    return comparisonItems.some(
      (item) => item.nome.toLowerCase() === nome.toLowerCase()
    )
  }

  return (
    <div className="flex flex-col gap-6 text-left w-full">
      {/* Filtro de Mercados Horizontal (Tabs Principais) */}
      <div className="flex flex-col gap-2.5">
        <div className="flex gap-2 pb-1 text-left overflow-x-auto scrollbar-none">
          {[
            { id: 'todos', label: 'Todos os Mercados', count: dbProducts.length },
            { id: 'bigmaster', label: 'Supermercado BigMaster', count: dbProducts.filter(p => p.origem === 'bigmaster').length },
            { id: 'atacadao', label: 'Atacadão', count: dbProducts.filter(p => p.origem === 'atacadao').length },
          ].map((item) => (
            <button
              key={item.id}
              className={`border text-xs font-bold px-4 py-2.5 rounded-full cursor-pointer transition-all whitespace-nowrap flex items-center gap-2 ${
                selectedOrigem === item.id
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
              onClick={() => setSelectedOrigem(item.id as any)}
            >
              <span>{item.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                selectedOrigem === item.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {item.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Barra de Filtros e Busca Compacta */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
        <div className="flex flex-wrap items-center gap-4 flex-1">
          {/* Ordenação */}
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <span>Ordenar</span>
            <select
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 cursor-pointer focus:border-blue-500 outline-none transition-all"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="nome">Nome: A-Z</option>
              <option value="preco_menor">Menor Preço</option>
              <option value="preco_maior">Maior Preço</option>
            </select>
          </div>

          {/* Checkbox Apenas estoque */}
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
            />
            <span>Apenas estoque</span>
          </label>

          {/* Input de Busca Principal */}
          <div className="relative flex items-center min-w-[220px] flex-1 md:max-w-xs">
            <input
              type="text"
              className="w-full pl-4.5 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold"
              placeholder="Pesquise por nome, marca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                className="absolute right-8 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                onClick={() => setSearchTerm('')}
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
            <MagnifyingGlassIcon className="absolute right-3 text-slate-400 w-4 h-4" />
          </div>
        </div>

        <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 shrink-0 self-end md:self-center">
          {sortedAndFiltered.length} {sortedAndFiltered.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
        </div>
      </div>

      {/* Loading overlay/indicator */}
      {loading && sortedAndFiltered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-200 rounded-2xl gap-3 text-slate-400 shadow-xs">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold">Buscando produtos...</p>
        </div>
      ) : sortedAndFiltered.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 bg-white border border-slate-200 rounded-2xl px-6 shadow-xs">
          <MagnifyingGlassIcon className="w-12 h-12 text-slate-200 mb-4" />
          <p className="text-sm font-bold text-slate-800">Nenhum produto correspondente.</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm leading-relaxed font-semibold">
            Nenhum produto cadastrado bate com os filtros atuais.
          </p>
        </div>
      ) : (
        /* Vitrine de Produtos */
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 relative">
          {loading && (
            <div className="absolute inset-0 bg-white/40 backdrop-blur-xs z-10 rounded-2xl transition-all"></div>
          )}
          {sortedAndFiltered.map((p) => {
            const added = isCompared(p.nome)
            const isAtacadao = p.origem === 'atacadao'
            const precoAtacado = Number(p.precoAtacado) || 0
            const precoVarejo = Number(p.precoVarejo) || 0
            const price = precoVarejo || precoAtacado

            // Cruzamento de preços rápido no card
            const match = findCrossMarketMatch(p)
            const matchPrice = match ? (Number(match.precoAtacado) || Number(match.precoVarejo) || 0) : 0
            const currentPrice = price
            const diff = currentPrice > 0 && matchPrice > 0 ? currentPrice - matchPrice : 0

            return (
              <div
                key={p.id}
                className={`flex flex-col bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 relative group/card ${
                  !p.disponivel ? 'opacity-55' : ''
                }`}
              >
                {/* Badge de Origem */}
                <div className="absolute top-3 left-3 z-10">
                  <span
                    className={`text-[9px] font-black tracking-wider px-2 py-0.5 rounded-md shadow-xs text-white uppercase ${
                      isAtacadao ? 'bg-emerald-600' : 'bg-blue-600'
                    }`}
                  >
                    {isAtacadao ? 'Atacadão' : 'Big Master'}
                  </span>
                </div>

                {/* Imagem do Produto com Fallback local */}
                <div className="h-36 bg-white flex items-center justify-center p-3 relative group/img overflow-hidden mt-4">
                  {p.imagemUrl ? (
                    <>
                      <img
                        className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover/img:scale-105"
                        src={getImageUrl(p.imagemUrl) || ''}
                        alt={p.nome}
                        loading="lazy"
                        onError={(e) => {
                          // Esconde imagem quebrada e exibe o fallback
                          ;(e.target as HTMLImageElement).style.display = 'none'
                          const parent = (e.target as HTMLImageElement).parentElement
                          if (parent) {
                            const fallback = parent.querySelector('.fallback-container')
                            if (fallback) (fallback as HTMLElement).style.display = 'flex'
                          }
                        }}
                      />
                      <div className="fallback-container hidden absolute inset-0 items-center justify-center text-slate-300 bg-slate-50">
                        <PhotoIcon className="w-8 h-8" />
                      </div>
                    </>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                      <PhotoIcon className="w-7 h-7" />
                    </div>
                  )}
                </div>

                {/* Detalhes do Produto */}
                <div className="p-4 flex flex-col flex-grow gap-2">
                  <div className="flex flex-col text-left gap-0.5">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider truncate">
                      {p.marca || 'Sem Marca'}
                    </span>
                    <h4
                      className="text-xs font-bold text-slate-800 line-clamp-2 h-8 overflow-hidden leading-tight group-hover/card:text-blue-600 transition-colors"
                      title={p.nome}
                    >
                      {p.nome}
                    </h4>
                  </div>

                  {/* Preços Estilo Atacado */}
                  <div className="flex flex-col gap-1 min-h-[52px] justify-center text-left bg-slate-50 p-2 rounded-xl border border-slate-100">
                    {isAtacadao && precoAtacado > 0 ? (
                      <div>
                        <div className="text-[9px] font-bold text-emerald-600 uppercase tracking-wide">
                          Preço Atacado
                        </div>
                        <div className="flex items-baseline text-emerald-700 font-extrabold">
                          <span className="text-[10px] mr-0.5">R$</span>
                          <span className="text-lg leading-none font-black">{Math.floor(precoAtacado)}</span>
                          <span className="text-[10px] ml-0.5 font-bold">
                            ,{(precoAtacado % 1).toFixed(2).substring(2)}
                          </span>
                          {p.quantidadeMinimaAtacado && (
                            <span className="text-[8px] font-medium text-slate-400 ml-1">
                              (mín. {p.quantidadeMinimaAtacado} un)
                            </span>
                          )}
                        </div>
                        {precoVarejo > 0 && (
                          <div className="text-[9px] text-slate-400 font-medium font-mono mt-0.5">
                            Varejo: R$ {precoVarejo.toFixed(2)}
                          </div>
                        )}
                      </div>
                    ) : price ? (
                      <div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Valor Único</div>
                        <div className="flex items-baseline text-slate-900 font-extrabold">
                          <span className="text-[10px] mr-0.5">R$</span>
                          <span className="text-lg leading-none font-black">{Math.floor(Number(price))}</span>
                          <span className="text-[10px] ml-0.5 font-bold">
                            ,{(Number(price) % 1).toFixed(2).substring(2)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Sob consulta</span>
                    )}
                  </div>

                  {/* Comparação Rápida no Card */}
                  {diff !== 0 && match && (
                    <div className="text-left mt-0.5">
                      {diff < 0 ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/50 px-2 py-1 rounded-md leading-tight">
                          📉 R$ {Math.abs(diff).toFixed(2)} mais barato que no {match.origem === 'atacadao' ? 'Atacadão' : 'Big Master'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-red-600 bg-red-50 border border-red-200/50 px-2 py-1 rounded-md leading-tight">
                          📈 R$ {diff.toFixed(2)} mais caro que no {match.origem === 'atacadao' ? 'Atacadão' : 'Big Master'}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Ação de Adicionar/Remover */}
                  <div className="mt-auto pt-2">
                    {added ? (
                      <button
                        className="w-full py-2 px-3 rounded-xl text-xs font-bold cursor-pointer transition-all bg-emerald-50 text-emerald-700 border border-emerald-600/30 hover:bg-emerald-100"
                        onClick={() => onRemoveFromComparison(p.nome)}
                      >
                        ✓ Adicionado
                      </button>
                    ) : (
                      <button
                        className="w-full py-2 px-3 rounded-xl text-xs font-bold cursor-pointer transition-all bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                        onClick={() => onAddToComparison(p.nome, price || undefined)}
                        disabled={!p.disponivel}
                      >
                        + Adicionar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
