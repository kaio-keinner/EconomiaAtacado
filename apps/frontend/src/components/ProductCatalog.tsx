import { useState, useMemo, useEffect, useRef } from 'react'
import { type Product } from './ProductTable'
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  PhotoIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  PlusIcon,
  FunnelIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline'
import { getImageUrl, fetchProducts } from '../api/client'
import { ProductPriceHistory } from './ProductPriceHistory'

interface ProductCatalogProps {
  products: Product[]
  comparisonItems: Array<{ nome: string; quantidade: number }>
  onAddToComparison: (nome: string, preco?: number) => void
  onRemoveFromComparison: (nome: string) => void
}

const ITEMS_PER_PAGE = 15

// Lista de categorias principais baseada na estrutura oficial do Atacadão
const ATACADAO_CATEGORIES = [
  { id: 'todas', label: 'Todas as Categorias' },
  { id: 'bebidas', label: 'Bebidas' },
  { id: 'mercearia', label: 'Mercearia' },
  { id: 'limpeza', label: 'Limpeza' },
  { id: 'higiene-e-perfumaria', label: 'Higiene e Perfumaria' },
  { id: 'padaria-e-matinais', label: 'Padaria e Matinais' },
  { id: 'papelaria', label: 'Papelaria' },
  { id: 'pet-shop', label: 'Pet Shop' },
  { id: 'automotivo', label: 'Automotivo' },
  { id: 'frios-e-congelados', label: 'Frios e Congelados' },
  { id: 'eletronicos-e-eletroportateis', label: 'Eletrônicos e Eletroportáteis' },
  { id: 'hortifruti', label: 'Hortifrúti' },
  { id: 'carnes-aves-e-peixes', label: 'Carnes, Aves e Peixes' },
  { id: 'vestuario', label: 'Vestuário' },
  { id: 'utilidades-domesticas', label: 'Utilidades Domésticas' },
  { id: 'jardinagem', label: 'Jardinagem' },
  { id: 'descartaveis-e-embalagens', label: 'Descartáveis e Embalagens' },
  { id: 'esporte-e-lazer', label: 'Esporte e Lazer' },
]

export function ProductCatalog({
  products,
  comparisonItems,
  onAddToComparison,
  onRemoveFromComparison,
}: ProductCatalogProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrigem, setSelectedOrigem] = useState<'todos' | 'atacadao' | 'bigmaster'>('todos')
  const [selectedCategory, setSelectedCategory] = useState<string>('todas')
  const [sortBy, setSortBy] = useState<'nome' | 'preco_menor' | 'preco_maior'>('nome')
  const [currentPage, setCurrentPage] = useState(1)

  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)

  const [dbProducts, setDbProducts] = useState<Product[]>(products)
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // Controle de colapso da sidebar em telas mobile
  const [mobileCategoryOpen, setMobileCategoryOpen] = useState(false)

  const gridRef = useRef<HTMLDivElement>(null)

  // Sincroniza dados iniciais
  useEffect(() => {
    setDbProducts(products)
  }, [products])

  // Busca dados dinamicamente com base em busca e filtros
  useEffect(() => {
    const fetchFiltered = async () => {
      setLoading(true)
      try {
        const params: any = {
          busca: searchTerm.trim() || undefined,
          origem: selectedOrigem !== 'todos' ? selectedOrigem : undefined,
          categoria1: selectedCategory !== 'todas' ? selectedCategory : undefined,
        }
        const data = await fetchProducts(params)
        setDbProducts(data.products || [])
        if (data.categories && Array.isArray(data.categories)) {
          setAvailableCategories(data.categories)
        }
      } catch (err) {
        console.error('Erro ao buscar catálogo filtrado:', err)
      } finally {
        setLoading(false)
      }
    }

    const timer = setTimeout(fetchFiltered, 250)
    return () => clearTimeout(timer)
  }, [searchTerm, selectedOrigem, selectedCategory, products])

  // Une as categorias dinâmicas do banco com as categorias do Atacadão
  const fullCategoriesList = useMemo(() => {
    const map = new Map<string, string>()
    ATACADAO_CATEGORIES.forEach((c) => map.set(c.id, c.label))

    availableCategories.forEach((cat) => {
      if (cat && !map.has(cat)) {
        map.set(cat, cat.replace(/-/g, ' '))
      }
    })

    return Array.from(map.entries()).map(([id, label]) => ({ id, label }))
  }, [availableCategories])

  // Reseta para a página 1 ao alterar qualquer filtro
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedOrigem, selectedCategory, sortBy])

  // Rola suavemente para o topo ao trocar de página
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    if (gridRef.current) {
      gridRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Filtragem local (Exibe todos os produtos com ordenação por preço/nome)
  const filteredProducts = useMemo(() => {
    let result = [...dbProducts]

    result.sort((a, b) => {
      const getPrice = (p: Product) => Number(p.precoVarejo || p.precoAtacado) || 0
      if (sortBy === 'preco_menor') {
        return getPrice(a) - getPrice(b)
      }
      if (sortBy === 'preco_maior') {
        return getPrice(b) - getPrice(a)
      }
      return a.nome.localeCompare(b.nome)
    })

    return result
  }, [dbProducts, sortBy])

  // Paginação: Exatamente 15 itens por página
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE))
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredProducts, currentPage])

  // Correspondência cruzada de ofertas no outro mercado
  const findCrossMarketMatch = (product: Product) => {
    const otherOrigem = product.origem === 'atacadao' ? 'bigmaster' : 'atacadao'
    const cleanWords = (str: string) =>
      str.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter((w) => w.length > 2)

    const pWords = cleanWords(product.nome)
    if (pWords.length === 0) return null

    let bestMatch: Product | null = null
    let bestScore = 0

    const candidates = dbProducts.filter((p) => p.origem === otherOrigem)
    for (const cand of candidates) {
      const cWords = cleanWords(cand.nome)
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

  const isCompared = (nome: string) =>
    comparisonItems.some((item) => item.nome.toLowerCase() === nome.toLowerCase())

  // Gera lista de números de páginas
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push('...')
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      for (let i = start; i <= end; i++) pages.push(i)
      if (currentPage < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }

  const selectedCategoryLabel =
    fullCategoriesList.find((c) => c.id === selectedCategory)?.label || 'Todas as Categorias'

  if (selectedProductId !== null) {
    return (
      <ProductPriceHistory
        productId={selectedProductId}
        onBack={() => setSelectedProductId(null)}
      />
    )
  }

  return (
    <div ref={gridRef} className="flex flex-col gap-5 text-left w-full">
      {/* HEADER DE BUSCA E MERCADOS ESTILO ATACADÃO */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Seletor de Mercado */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
              Mercado:
            </span>
            {[
              { id: 'todos', label: 'Todos os Mercados', icon: '🛒' },
              { id: 'bigmaster', label: 'Supermercado BigMaster', icon: '🔵' },
              { id: 'atacadao', label: 'Atacadão', icon: '🟢' },
            ].map((item) => (
              <button
                key={item.id}
                className={`border text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-all duration-200 whitespace-nowrap flex items-center gap-2 ${
                  selectedOrigem === item.id
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200/90 text-slate-700'
                }`}
                onClick={() => setSelectedOrigem(item.id as any)}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* Campo de Pesquisa Estilo Atacadão com Botão Laranja */}
          <div className="flex items-center flex-1 max-w-xl">
            <div className="relative flex-1 flex items-center">
              <input
                type="text"
                className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-l-xl text-xs sm:text-sm outline-none focus:border-[#FF5C26] focus:bg-white transition-all font-semibold"
                placeholder="Pesquisa por produtos ou marcas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                  onClick={() => setSearchTerm('')}
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              className="bg-[#FF5C26] hover:bg-[#E04B18] text-white px-5 py-3 rounded-r-xl font-bold transition-colors cursor-pointer flex items-center justify-center shrink-0 shadow-xs"
              title="Pesquisar"
            >
              <MagnifyingGlassIcon className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>

      {/* CORPO PRINCIPAL COM 2 COLUNAS: SIDEBAR DE CATEGORIAS (ESTILO ATACADAO) + VITRINE */}
      <div className="flex flex-col lg:flex-row items-start gap-6 w-full">
        {/* COLUNA ESQUERDA: SIDEBAR "COMPRE POR CATEGORIA" (ATACADÃO STYLE) */}
        <aside className="w-full lg:w-72 shrink-0 bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
          {/* Cabeçalho da Sidebar / Toggle Mobile */}
          <button
            className="w-full p-4 bg-slate-900 lg:bg-white text-white lg:text-slate-900 border-b border-slate-200/80 flex items-center justify-between font-bold text-xs uppercase tracking-wider cursor-pointer lg:cursor-default"
            onClick={() => setMobileCategoryOpen(!mobileCategoryOpen)}
          >
            <div className="flex items-center gap-2.5">
              <Bars3Icon className="w-5 h-5 text-[#FF5C26]" />
              <span className="font-extrabold text-xs">Compre por categoria</span>
            </div>
            <ChevronDownIcon
              className={`w-4 h-4 text-slate-400 transition-transform lg:hidden ${
                mobileCategoryOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Lista de Categorias Estilo Atacadão com Seta > */}
          <div
            className={`flex flex-col divide-y divide-slate-100 max-h-[600px] overflow-y-auto ${
              mobileCategoryOpen ? 'block' : 'hidden lg:block'
            }`}
          >
            {fullCategoriesList.map((cat) => {
              const isActive = selectedCategory === cat.id
              return (
                <button
                  key={cat.id}
                  className={`w-full px-4 py-3 text-xs font-semibold flex items-center justify-between text-left transition-all cursor-pointer group ${
                    isActive
                      ? 'bg-orange-50/70 text-[#FF5C26] font-extrabold border-l-4 border-[#FF5C26] pl-3'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                  onClick={() => {
                    setSelectedCategory(cat.id)
                    setMobileCategoryOpen(false)
                  }}
                >
                  <span className="capitalize truncate pr-2">{cat.label}</span>
                  <ChevronRightIcon
                    className={`w-3.5 h-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 ${
                      isActive ? 'text-[#FF5C26]' : 'text-slate-300'
                    }`}
                  />
                </button>
              )
            })}
          </div>
        </aside>

        {/* COLUNA DIREITA: ÁREA DA VITRINE DE PRODUTOS */}
        <main className="flex-1 flex flex-col gap-4 w-full">
          {/* BARRA DE ESTATÍSTICA E FILTROS ADICIONAIS */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-slate-900 font-mono">
                {filteredProducts.length}
              </span>
              <span className="text-xs font-bold text-slate-500">produtos encontrados</span>
              {selectedCategory !== 'todas' && (
                <span className="text-xs font-bold text-[#FF5C26] bg-orange-50 border border-orange-200/60 px-2 py-0.5 rounded-md capitalize ml-1">
                  {selectedCategoryLabel}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {/* Ordenação */}
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <FunnelIcon className="w-4 h-4 text-slate-400" />
                <span>Ordenar:</span>
                <select
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 cursor-pointer focus:border-[#FF5C26] outline-none transition-all"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                >
                  <option value="nome">Nome (A-Z)</option>
                  <option value="preco_menor">Menor Preço</option>
                  <option value="preco_maior">Maior Preço</option>
                </select>
              </div>
            </div>
          </div>

          {/* GRID DE PRODUTOS OU SKELETON LOADERS (EXATAMENTE 15 CARDS) */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
              {Array.from({ length: 15 }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 animate-pulse shadow-2xs"
                >
                  <div className="h-4 w-16 bg-slate-200 rounded-md"></div>
                  <div className="h-32 bg-slate-100 rounded-xl my-2"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/3"></div>
                  <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                  <div className="h-12 bg-slate-100 rounded-xl mt-auto"></div>
                  <div className="h-10 bg-slate-200 rounded-xl"></div>
                </div>
              ))}
            </div>
          ) : paginatedProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-20 bg-white border border-slate-200/90 rounded-3xl p-8 shadow-2xs w-full">
              <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center text-[#FF5C26] mb-4">
                <MagnifyingGlassIcon className="w-8 h-8" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">Nenhum produto encontrado</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm font-medium">
                Não encontramos produtos para a categoria ou busca selecionada.
              </p>
              <button
                className="mt-5 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                onClick={() => {
                  setSearchTerm('')
                  setSelectedCategory('todas')
                  setSelectedOrigem('todos')
                }}
              >
                Limpar Filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
              {paginatedProducts.map((p) => {
                const added = isCompared(p.nome)
                const isAtacadao = p.origem === 'atacadao'
                const precoAtacado = Number(p.precoAtacado) || 0
                const precoVarejo = Number(p.precoVarejo) || 0
                const price = precoVarejo || precoAtacado

                const match = findCrossMarketMatch(p)
                const matchPrice = match
                  ? Number(match.precoAtacado) || Number(match.precoVarejo) || 0
                  : 0
                const diff = price > 0 && matchPrice > 0 ? price - matchPrice : 0

                return (
                  <div
                    key={p.id}
                    className="flex flex-col bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs hover:shadow-xl hover:border-slate-300 hover:-translate-y-1 transition-all duration-300 relative group/card"
                  >
                    {/* Badge de Origem */}
                    <div className="absolute top-3 left-3 z-10">
                      <span
                        className={`text-[9px] font-black tracking-wider px-2 py-0.5 rounded-md shadow-2xs text-white uppercase ${
                          isAtacadao ? 'bg-emerald-600' : 'bg-blue-600'
                        }`}
                      >
                        {isAtacadao ? 'Atacadão' : 'Big Master'}
                      </span>
                    </div>

                    {/* Imagem do Produto */}
                    <div
                      onClick={() => setSelectedProductId(p.id)}
                      className="h-40 bg-white flex items-center justify-center p-4 relative overflow-hidden mt-3 group/img cursor-pointer"
                      title="Ver histórico de preço"
                    >
                      {p.imagemUrl ? (
                        <img
                          className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover/card:scale-105"
                          src={getImageUrl(p.imagemUrl) || ''}
                          alt={p.nome}
                          loading="lazy"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).style.display = 'none'
                            const parent = (e.target as HTMLImageElement).parentElement
                            if (parent) {
                              const fallback = parent.querySelector('.fallback-container')
                              if (fallback) (fallback as HTMLElement).style.display = 'flex'
                            }
                          }}
                        />
                      ) : null}
                      <div
                        className={`fallback-container absolute inset-0 flex items-center justify-center text-slate-300 bg-slate-50/50 ${
                          p.imagemUrl ? 'hidden' : ''
                        }`}
                      >
                        <PhotoIcon className="w-10 h-10" />
                      </div>
                    </div>

                    {/* Informações do Produto (Estilo Atacadão) */}
                    <div className="p-4 flex flex-col flex-grow gap-2 text-left">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider truncate">
                          {p.marca || 'Marcas Variadas'}
                        </span>
                        <h4
                          onClick={() => setSelectedProductId(p.id)}
                          className="text-xs font-bold text-slate-800 line-clamp-2 h-8 overflow-hidden leading-snug group-hover/card:text-[#FF5C26] transition-colors cursor-pointer"
                          title={`Clique para ver histórico: ${p.nome}`}
                        >
                          {p.nome}
                        </h4>
                      </div>

                      {/* Bloco de Preços Estilizado */}
                      <div className="flex flex-col gap-0.5 min-h-[52px] justify-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {isAtacadao && precoAtacado > 0 ? (
                          <div>
                            <div className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-wide">
                              Preço Atacado
                            </div>
                            <div className="flex items-baseline text-slate-900 font-black">
                              <span className="text-[10px] mr-0.5 font-bold">R$</span>
                              <span className="text-xl leading-none">{Math.floor(precoAtacado)}</span>
                              <span className="text-[11px] ml-0.5 font-bold">
                                ,{(precoAtacado % 1).toFixed(2).substring(2)}
                              </span>
                              {p.quantidadeMinimaAtacado && (
                                <span className="text-[8px] font-semibold text-slate-400 ml-1">
                                  (mín. {p.quantidadeMinimaAtacado} un)
                                </span>
                              )}
                            </div>
                            {precoVarejo > 0 && (
                              <div className="text-[9px] text-slate-400 font-semibold mt-0.5">
                                Varejo: R$ {precoVarejo.toFixed(2)}
                              </div>
                            )}
                          </div>
                        ) : price ? (
                          <div>
                            <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">
                              Preço Unitário
                            </div>
                            <div className="flex items-baseline text-slate-900 font-black">
                              <span className="text-[10px] mr-0.5 font-bold">R$</span>
                              <span className="text-xl leading-none">{Math.floor(Number(price))}</span>
                              <span className="text-[11px] ml-0.5 font-bold">
                                ,{(Number(price) % 1).toFixed(2).substring(2)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Sob consulta</span>
                        )}
                      </div>

                      {/* Comparativo Cruzado no outro mercado */}
                      {diff !== 0 && match && (
                        <div className="text-left">
                          {diff < 0 ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md leading-tight">
                              📉 R$ {Math.abs(diff).toFixed(2)} menor
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-red-600 bg-red-50 border border-red-200/60 px-2 py-0.5 rounded-md leading-tight">
                              📈 R$ {diff.toFixed(2)} maior
                            </span>
                          )}
                        </div>
                      )}

                      {/* BOTÃO PRINCIPAL DE AÇÃO ESTILO ATACADÃO (LARANJA VIBRANTE) */}
                      <div className="mt-auto pt-2">
                        {added ? (
                          <button
                            className="w-full py-2.5 px-3 rounded-xl text-xs font-black cursor-pointer transition-all bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 uppercase shadow-xs"
                            onClick={() => onRemoveFromComparison(p.nome)}
                          >
                            <CheckCircleIcon className="w-4 h-4 text-white" />
                            <span>ADICIONADO</span>
                          </button>
                        ) : (
                          <button
                            className="w-full py-2.5 px-3 rounded-xl text-xs font-black cursor-pointer transition-all bg-[#FF5C26] hover:bg-[#E04B18] text-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed shadow-xs hover:shadow-md flex items-center justify-center gap-1.5 uppercase tracking-wide"
                            onClick={() => onAddToComparison(p.nome, price || undefined)}
                            disabled={price <= 0}
                          >
                            <PlusIcon className="w-4 h-4 stroke-[3]" />
                            <span>ADICIONAR</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* CONTROLES DE PAGINAÇÃO (EXATAMENTE 15 ITENS POR PÁGINA) */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs mt-2 w-full">
              <div className="text-xs font-bold text-slate-500">
                Página <span className="font-extrabold text-slate-900">{currentPage}</span> de{' '}
                <span className="font-extrabold text-slate-900">{totalPages}</span>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Botão Anterior */}
                <button
                  className="flex items-center gap-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                  <span>Anterior</span>
                </button>

                {/* Números das Páginas */}
                <div className="hidden md:flex items-center gap-1 px-1">
                  {getPageNumbers().map((num, idx) =>
                    num === '...' ? (
                      <span key={`dots-${idx}`} className="px-2 text-slate-400 text-xs font-bold">
                        ...
                      </span>
                    ) : (
                      <button
                        key={`page-${num}`}
                        className={`w-8 h-8 rounded-xl text-xs font-extrabold cursor-pointer transition-all flex items-center justify-center ${
                          currentPage === num
                            ? 'bg-[#FF5C26] text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                        }`}
                        onClick={() => handlePageChange(Number(num))}
                      >
                        {num}
                      </button>
                    )
                  )}
                </div>

                {/* Botão Próximo */}
                <button
                  className="flex items-center gap-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  <span>Próxima</span>
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
