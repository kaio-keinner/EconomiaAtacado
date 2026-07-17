import { useState, useEffect } from 'react'
import {
  compareList,
  fetchProducts,
  getImageUrl,
  type ComparisonResult,
  type ComparisonItem,
  LAST_COMPARISON_KEY,
} from '../api/client'
import { type Product } from './ProductTable'
import {
  TrashIcon,
  ShoppingCartIcon,
  ScaleIcon,
  PlusIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  BookmarkIcon,
} from '@heroicons/react/24/outline'

const SAVED_LISTS_KEY = 'produtos-app:saved-lists'

interface ComparisonDashboardProps {
  items: ComparisonItem[]
  onItemsChange: (items: ComparisonItem[]) => void
  allProducts: Product[]
}

function formatCurrency(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function calcPriceDiff(cheaper: number, expensive: number) {
  const diff = expensive - cheaper
  const pct = expensive > 0 ? (diff / expensive) * 100 : 0
  return { diff, pct }
}

function ProductMatchCell({
  match,
  isCheaper,
  isExpensive,
  otherPrice,
}: {
  match: { nome: string; preco: number; imagemUrl: string | null } | null
  isCheaper: boolean
  isExpensive: boolean
  otherPrice: number
}) {
  if (!match) {
    return (
      <span className="inline-block text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/50">
        Não encontrado
      </span>
    )
  }

  const { diff, pct } =
    isExpensive && otherPrice > 0 ? calcPriceDiff(otherPrice, match.preco) : { diff: 0, pct: 0 }

  return (
    <div className="flex gap-2.5 items-start text-left">
      {match.imagemUrl ? (
        <img
          src={getImageUrl(match.imagemUrl) || ''}
          alt={match.nome}
          className="w-10 h-10 object-contain rounded-lg border border-slate-200 bg-white shrink-0 shadow-xs"
          onError={(e) => {
            ;(e.target as HTMLImageElement).style.display = 'none'
          }}
        />
      ) : (
        <div className="w-10 h-10 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-center shrink-0 text-slate-400 text-xs">
          📦
        </div>
      )}
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-slate-700 font-medium line-clamp-2 text-[11px] leading-tight">{match.nome}</span>
        <span
          className={`font-bold text-sm ${
            isCheaper ? 'text-emerald-700' : isExpensive ? 'text-red-600' : 'text-slate-900'
          }`}
        >
          {formatCurrency(match.preco)}
        </span>
        {isCheaper && otherPrice > match.preco && (
          <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded self-start mt-0.5">
            Economiza {formatCurrency(otherPrice - match.preco)} (−
            {(((otherPrice - match.preco) / otherPrice) * 100).toFixed(0)}%)
          </span>
        )}
        {isExpensive && diff > 0 && (
          <span className="text-[10px] font-semibold text-red-500 bg-red-50 px-1 py-0.5 rounded self-start mt-0.5">
            Mais caro {formatCurrency(diff)} (+{pct.toFixed(0)}%)
          </span>
        )}
      </div>
    </div>
  )
}

function BarChart({ totalAtacadao, totalBigMaster }: { totalAtacadao: number; totalBigMaster: number }) {
  const max = Math.max(totalAtacadao, totalBigMaster, 1)
  const atacadaoPct = (totalAtacadao / max) * 100
  const bigmasterPct = (totalBigMaster / max) * 100

  return (
    <div className="flex flex-col gap-3 mt-4 border-t border-slate-200/60 pt-4">
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-bold text-emerald-700 w-20 shrink-0 uppercase tracking-wider">Atacadão</span>
        <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500 flex items-center justify-end pr-2.5 shadow-inner"
            style={{ width: `${atacadaoPct}%`, minWidth: atacadaoPct > 0 ? '2.5rem' : '0' }}
          >
            {atacadaoPct > 15 && (
              <span className="text-[9px] font-mono font-bold text-white">{formatCurrency(totalAtacadao)}</span>
            )}
          </div>
        </div>
        {atacadaoPct <= 15 && (
          <span className="text-[10px] font-mono font-bold text-slate-700 shrink-0">{formatCurrency(totalAtacadao)}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-bold text-blue-700 w-20 shrink-0 uppercase tracking-wider">BigMaster</span>
        <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500 flex items-center justify-end pr-2.5 shadow-inner"
            style={{ width: `${bigmasterPct}%`, minWidth: bigmasterPct > 0 ? '2.5rem' : '0' }}
          >
            {bigmasterPct > 15 && (
              <span className="text-[9px] font-mono font-bold text-white">{formatCurrency(totalBigMaster)}</span>
            )}
          </div>
        </div>
        {bigmasterPct <= 15 && (
          <span className="text-[10px] font-mono font-bold text-slate-700 shrink-0">{formatCurrency(totalBigMaster)}</span>
        )}
      </div>
    </div>
  )
}

export function ComparisonDashboard({ items, onItemsChange }: ComparisonDashboardProps) {
  const [customItemName, setCustomItemName] = useState('')
  const [customItemQty, setCustomItemQty] = useState(1)
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [compareError, setCompareError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<Product[]>([])

  // Estado para gerenciar listas salvas localmente
  const [savedLists, setSavedLists] = useState<Record<string, ComparisonItem[]>>(() => {
    try {
      const raw = localStorage.getItem(SAVED_LISTS_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  })

  useEffect(() => {
    if (items.length === 0) {
      setComparisonResult(null)
      setCompareError(null)
      return
    }

    const runComparison = async () => {
      setLoading(true)
      setCompareError(null)
      try {
        const result = await compareList(items)
        setComparisonResult(result)
        sessionStorage.setItem(LAST_COMPARISON_KEY, JSON.stringify(result))
      } catch (err: any) {
        setCompareError(err.message || 'Erro ao comparar preços')
        console.error('Erro na comparação:', err)
      } finally {
        setLoading(false)
      }
    }

    const timer = setTimeout(runComparison, 500)
    return () => clearTimeout(timer)
  }, [items])

  useEffect(() => {
    if (!customItemName.trim() || customItemName.length < 2) {
      setSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        const data = await fetchProducts({ busca: customItemName })
        setSuggestions(data.products || [])
      } catch (err) {
        console.error('Erro ao buscar sugestões:', err)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [customItemName])

  const handleAddCustomItem = (name: string, qty: number) => {
    if (!name.trim()) return
    const existingIndex = items.findIndex((item) => item.nome.toLowerCase() === name.toLowerCase())
    if (existingIndex !== -1) {
      const updated = [...items]
      updated[existingIndex] = { ...updated[existingIndex], quantidade: updated[existingIndex].quantidade + qty }
      onItemsChange(updated)
    } else {
      onItemsChange([...items, { nome: name.trim(), quantidade: qty }])
    }
    setCustomItemName('')
    setCustomItemQty(1)
    setSuggestions([])
  }

  const handleRemoveItem = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index))
  }

  const handleUpdateQty = (index: number, newQty: number) => {
    if (newQty < 1) return
    const updated = [...items]
    updated[index] = { ...updated[index], quantidade: newQty }
    onItemsChange(updated)
  }

  const clearList = () => onItemsChange([])

  // Salvar lista atual localmente
  const handleSaveCurrentList = () => {
    if (items.length === 0) return
    const name = prompt('Digite um nome amigável para identificar esta lista:')
    if (!name || !name.trim()) return
    const updated = { ...savedLists, [name.trim()]: items }
    setSavedLists(updated)
    localStorage.setItem(SAVED_LISTS_KEY, JSON.stringify(updated))
    alert('Lista de compras salva com sucesso!')
  }

  // Carregar lista salva
  const handleLoadList = (name: string) => {
    const list = savedLists[name]
    if (list) {
      onItemsChange(list)
    }
  }

  // Excluir lista salva
  const handleDeleteList = (name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Tem certeza que deseja excluir a lista "${name}"?`)) return
    const updated = { ...savedLists }
    delete updated[name]
    setSavedLists(updated)
    localStorage.setItem(SAVED_LISTS_KEY, JSON.stringify(updated))
  }

  const melhorOpcao = comparisonResult?.resumo.melhorOpcao
  const economia = comparisonResult?.resumo.economiaTotal ?? 0

  return (
    <div className="flex flex-col gap-6 text-left w-full">
      {/* Passo 1 — Montar Lista */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-200/60">
          <div>
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Passo 1</span>
            <h4 className="text-sm font-bold text-slate-900">Montar Lista de Compras</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Busque produtos, importe de cupons ou use uma lista salva.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4 w-full">
          <div className="relative flex-grow min-w-[200px]">
            <input
              type="text"
              placeholder="Pesquise o produto para adicionar..."
              value={customItemName}
              onChange={(e) => setCustomItemName(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
            />
            {suggestions.length > 0 && (
              <ul className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {suggestions.map((p) => (
                  <li
                    key={p.id}
                    onClick={() => handleAddCustomItem(p.nome, customItemQty)}
                    className="flex items-center justify-between p-3.5 text-xs hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <span
                      className={`px-2 py-0.5 rounded-md text-[9px] font-bold text-white uppercase shrink-0 ${
                        p.origem === 'atacadao' ? 'bg-emerald-600' : 'bg-blue-600'
                      }`}
                    >
                      {p.origem === 'atacadao' ? 'Atacadão' : 'BigMaster'}
                    </span>
                    <span className="flex-grow font-semibold text-slate-800 ml-3 truncate text-left">{p.nome}</span>
                    <span className="font-extrabold text-slate-950 shrink-0 ml-3 font-mono">
                      {formatCurrency(p.precoVarejo ?? p.precoAtacado ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-1 w-20">
            <label htmlFor="qty-input" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Qtd
            </label>
            <input
              id="qty-input"
              type="number"
              min="1"
              value={customItemQty}
              onChange={(e) => setCustomItemQty(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-center outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
            />
          </div>

          <button
            onClick={() => handleAddCustomItem(customItemName, customItemQty)}
            className="flex items-center justify-center gap-1.5 py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed h-[42px] cursor-pointer"
            disabled={!customItemName.trim()}
          >
            <PlusIcon className="w-4 h-4" />
            Adicionar
          </button>
        </div>

        {/* Listas Salvas localmente */}
        {Object.keys(savedLists).length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200/60 text-left">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Recarregar Lista Salva
            </span>
            <div className="flex flex-wrap gap-2">
              {Object.keys(savedLists).map((name) => (
                <div
                  key={name}
                  onClick={() => handleLoadList(name)}
                  className="group flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full hover:bg-indigo-50 hover:border-indigo-200 cursor-pointer text-xs font-semibold text-slate-700 hover:text-indigo-700 transition-all"
                >
                  <BookmarkIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500" />
                  <span>{name}</span>
                  <button
                    onClick={(e) => handleDeleteList(name, e)}
                    className="text-slate-300 hover:text-red-600 transition-colors p-0.5 rounded-full cursor-pointer ml-1"
                    title="Excluir esta lista"
                  >
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Minha Lista */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="text-sm font-bold text-slate-900">Itens Atuais ({items.length})</h4>
            <div className="flex gap-4">
              {items.length > 0 && (
                <>
                  <button
                    onClick={handleSaveCurrentList}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <BookmarkIcon className="w-3.5 h-3.5" />
                    Salvar Lista
                  </button>
                  <button
                    className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 cursor-pointer"
                    onClick={clearList}
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                    Limpar Tudo
                  </button>
                </>
              )}
            </div>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 text-slate-400">
              <ShoppingCartIcon className="w-12 h-12 text-slate-200 mb-3" />
              <p className="text-sm font-bold text-slate-800">Sua lista está vazia</p>
              <p className="text-xs text-slate-400 mt-1 max-w-[240px] leading-relaxed">
                Adicione produtos acima, pelo catálogo ou importando um cupom fiscal.
              </p>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[380px] pr-1">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50/50 transition-all gap-4"
                >
                  <div className="flex flex-col text-left gap-0.5 min-w-0">
                    <span className="text-xs font-bold text-slate-800 truncate">{item.nome}</span>
                    {item.precoOriginal != null && (
                      <span className="text-[10px] text-slate-400 font-medium font-mono">
                        Valor pago original: {formatCurrency(item.precoOriginal)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                      <button
                        className="w-6 h-6 flex items-center justify-center text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                        onClick={() => handleUpdateQty(idx, item.quantidade - 1)}
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-xs font-extrabold text-slate-900">{item.quantidade}</span>
                      <button
                        className="w-6 h-6 flex items-center justify-center text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                        onClick={() => handleUpdateQty(idx, item.quantidade + 1)}
                      >
                        +
                      </button>
                    </div>
                    <button
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      onClick={() => handleRemoveItem(idx)}
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Passo 2 — Análise Comparativa */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs relative flex flex-col gap-4">
          <div>
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Passo 2</span>
            <h4 className="text-sm font-bold text-slate-900">Análise Comparativa</h4>
          </div>

          {loading && (
            <div className="absolute inset-0 z-10 bg-white/90 backdrop-blur-xs flex flex-col items-center justify-center gap-3 rounded-2xl">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-slate-500">Buscando melhores preços...</p>
            </div>
          )}

          {compareError && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl text-xs font-semibold border bg-red-50 text-red-700 border-red-200">
              <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
              {compareError}
            </div>
          )}

          {!comparisonResult && !compareError ? (
            <div className="flex flex-col items-center justify-center text-center py-24 text-slate-400">
              <ScaleIcon className="w-12 h-12 text-slate-200 mb-3" />
              <p className="text-xs text-slate-400">Adicione itens na lista para rodar a análise de economia.</p>
            </div>
          ) : comparisonResult ? (
            <div className="flex flex-col gap-4">
              {/* Card de resultado final */}
              {melhorOpcao && melhorOpcao !== 'empate' && economia > 0 && (
                <div
                  className={`rounded-xl p-5 border-2 ${
                    melhorOpcao === 'atacadao'
                      ? 'bg-emerald-50/50 border-emerald-400'
                      : 'bg-blue-50/50 border-blue-400'
                  }`}
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Conclusão</p>
                  <p className="text-base font-black text-slate-900 mt-1">
                    Comprando no{' '}
                    <span className={melhorOpcao === 'atacadao' ? 'text-emerald-700' : 'text-blue-700'}>
                      {melhorOpcao === 'atacadao' ? 'Atacadão' : 'BigMaster'}
                    </span>{' '}
                    você economiza{' '}
                    <span className="text-emerald-700">{formatCurrency(economia)}</span>
                  </p>
                  <BarChart
                    totalAtacadao={comparisonResult.resumo.totalAtacadao}
                    totalBigMaster={comparisonResult.resumo.totalBigMaster}
                  />
                </div>
              )}

              {melhorOpcao === 'empate' && (
                <div className="rounded-xl p-5 border-2 bg-slate-50 border-slate-300">
                  <p className="text-sm font-black text-slate-900">Empate — custo final idêntico nos dois mercados</p>
                  <BarChart
                    totalAtacadao={comparisonResult.resumo.totalAtacadao}
                    totalBigMaster={comparisonResult.resumo.totalBigMaster}
                  />
                </div>
              )}

              {/* Cards de totais */}
              <div className="grid grid-cols-2 gap-4">
                <div
                  className={`flex flex-col gap-2 p-4 border rounded-xl relative ${
                    melhorOpcao === 'atacadao'
                      ? 'border-2 border-emerald-500 bg-emerald-50/20'
                      : melhorOpcao === 'bigmaster'
                        ? 'border-red-100 bg-red-50/10'
                        : 'border-slate-200 bg-slate-50/30'
                  }`}
                >
                  <span className="self-start text-[9px] font-bold tracking-wider px-2 py-0.5 rounded text-white uppercase bg-emerald-600">
                    Atacadão
                  </span>
                  <div className="text-lg font-black text-slate-900 mt-1 font-mono">
                    {formatCurrency(comparisonResult.resumo.totalAtacadao)}
                  </div>
                  {melhorOpcao === 'atacadao' && (
                    <span className="absolute top-3 right-3 text-[9px] font-bold text-emerald-700 bg-emerald-100/80 py-0.5 px-2 rounded-md border border-emerald-200">
                      Mais Barato
                    </span>
                  )}
                  {melhorOpcao === 'bigmaster' && (
                    <span className="absolute top-3 right-3 text-[9px] font-bold text-red-600 bg-red-100/80 py-0.5 px-2 rounded-md border border-red-200">
                      Mais Caro
                    </span>
                  )}
                </div>

                <div
                  className={`flex flex-col gap-2 p-4 border rounded-xl relative ${
                    melhorOpcao === 'bigmaster'
                      ? 'border-2 border-emerald-500 bg-emerald-50/20'
                      : melhorOpcao === 'atacadao'
                        ? 'border-red-100 bg-red-50/10'
                        : 'border-slate-200 bg-slate-50/30'
                  }`}
                >
                  <span className="self-start text-[9px] font-bold tracking-wider px-2 py-0.5 rounded text-white uppercase bg-blue-600">
                    BigMaster
                  </span>
                  <div className="text-lg font-black text-slate-900 mt-1 font-mono">
                    {formatCurrency(comparisonResult.resumo.totalBigMaster)}
                  </div>
                  {melhorOpcao === 'bigmaster' && (
                    <span className="absolute top-3 right-3 text-[9px] font-bold text-emerald-700 bg-emerald-100/80 py-0.5 px-2 rounded-md border border-emerald-200">
                      Mais Barato
                    </span>
                  )}
                  {melhorOpcao === 'atacadao' && (
                    <span className="absolute top-3 right-3 text-[9px] font-bold text-red-600 bg-red-100/80 py-0.5 px-2 rounded-md border border-red-200">
                      Mais Caro
                    </span>
                  )}
                </div>
              </div>

              {/* Tabela detalhada */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl mt-2 max-h-[350px] overflow-y-auto">
                <table className="w-full border-collapse text-left text-xs font-sans">
                  <thead>
                    <tr className="sticky top-0 z-10 bg-slate-50">
                      <th className="border-b border-slate-200 p-3 text-[10px] font-bold text-slate-500 uppercase">
                        Produto
                      </th>
                      <th className="border-b border-slate-200 p-3 text-[10px] font-bold text-slate-500 uppercase">
                        Atacadão
                      </th>
                      <th className="border-b border-slate-200 p-3 text-[10px] font-bold text-slate-500 uppercase">
                        BigMaster
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonResult.comparedItems.map((item, idx) => {
                      const atacadaoPreco = item.atacadao?.preco ?? 0
                      const bigmasterPreco = item.bigmaster?.preco ?? 0
                      const hasBoth = item.atacadao && item.bigmaster

                      const isAtacadaoCheaper =
                        item.atacadao && (!item.bigmaster || atacadaoPreco < bigmasterPreco)
                      const isBigMasterCheaper =
                        item.bigmaster && (!item.atacadao || bigmasterPreco < atacadaoPreco)
                      const isAtacadaoExpensive = hasBoth && bigmasterPreco < atacadaoPreco
                      const isBigMasterExpensive = hasBoth && atacadaoPreco < bigmasterPreco

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 border-b border-slate-100 align-top">
                            <div className="font-bold text-slate-800 leading-tight">{item.nomeOriginal}</div>
                            <div className="text-[10px] text-slate-400 mt-1">Quantidade: {item.quantidade}</div>
                          </td>
                          <td
                            className={`p-3 border-b border-slate-100 align-top transition-colors ${
                              isAtacadaoCheaper ? 'bg-emerald-50/20' : isAtacadaoExpensive ? 'bg-red-50/10' : ''
                            }`}
                          >
                            <ProductMatchCell
                              match={item.atacadao}
                              isCheaper={!!isAtacadaoCheaper}
                              isExpensive={!!isAtacadaoExpensive}
                              otherPrice={bigmasterPreco}
                            />
                          </td>
                          <td
                            className={`p-3 border-b border-slate-100 align-top transition-colors ${
                              isBigMasterCheaper ? 'bg-emerald-50/20' : isBigMasterExpensive ? 'bg-red-50/10' : ''
                            }`}
                          >
                            <ProductMatchCell
                              match={item.bigmaster}
                              isCheaper={!!isBigMasterCheaper}
                              isExpensive={!!isBigMasterExpensive}
                              otherPrice={atacadaoPreco}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
