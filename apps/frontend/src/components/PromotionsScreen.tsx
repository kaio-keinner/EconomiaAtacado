import { useState, useEffect } from 'react'
import {
  fetchPromotions,
  getImageUrl,
  type PromotionItem,
} from '../api/client'
import {
  TagIcon,
  FunnelIcon,
  ArrowTrendingDownIcon,
  SparklesIcon,
  PlusIcon,
  CheckIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  LineChart,
  Line,
} from 'recharts'

interface PromotionsScreenProps {
  onAddToComparison: (productName: string, preco?: number) => void
  comparisonItems: { nome: string }[]
}

export function PromotionsScreen({ onAddToComparison, comparisonItems }: PromotionsScreenProps) {
  const [promotions, setPromotions] = useState<PromotionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [periodo, setPeriodo] = useState('7d')
  const [categoria, setCategoria] = useState('')
  const [origemFilter, setOrigemFilter] = useState('')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetchPromotions({
          periodo,
          categoria: categoria || undefined,
          origem: origemFilter || undefined,
          limite: 50,
        })
        setPromotions(res.promotions || [])
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar promoções.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [periodo, categoria, origemFilter])

  const isItemInComparison = (nome: string) => {
    return comparisonItems.some((i) => i.nome.toLowerCase() === nome.toLowerCase())
  }

  // Top 3 promoções em destaque
  const topPromos = promotions.slice(0, 3)

  // Top 15 para o gráfico de barras
  const chartData = promotions.slice(0, 15).map((item) => ({
    nomeCurto: item.nome.length > 25 ? `${item.nome.slice(0, 22)}...` : item.nome,
    nomeCompleto: item.nome,
    desconto: item.descontoPercentual,
    origem: item.origem,
  }))

  return (
    <div className="space-y-6">
      {/* Top Header & Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
              <SparklesIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Promoções da Semana</h2>
              <p className="text-xs text-gray-500">Produtos com desconto em relação ao preço de referência</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <TagIcon className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-semibold text-gray-600">
              {promotions.length} promoções encontradas
            </span>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
            <FunnelIcon className="w-4 h-4 text-gray-400" />
            <span>Filtros:</span>
          </div>

          {/* Período */}
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
          </select>

          {/* Categoria */}
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">Todas as categorias</option>
            <option value="bebidas">Bebidas</option>
            <option value="mercearia">Mercearia</option>
            <option value="limpeza">Limpeza</option>
            <option value="higiene-e-perfumaria">Higiene</option>
            <option value="frios-e-congelados">Frios e Congelados</option>
          </select>

          {/* Origem */}
          <select
            value={origemFilter}
            onChange={(e) => setOrigemFilter(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">Todos os mercados</option>
            <option value="atacadao">Atacadão</option>
            <option value="bigmaster">BigMaster</option>
          </select>
        </div>
      </div>

      {/* States */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse space-y-3">
              <div className="w-full h-36 bg-gray-200 rounded-lg" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-semibold">
          <ExclamationCircleIcon className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : promotions.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center space-y-3">
          <ArrowTrendingDownIcon className="w-12 h-12 text-gray-300 mx-auto" />
          <h3 className="text-base font-bold text-gray-900">Ainda estamos acumulando histórico</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Os preços de referência precisam de pelo menos 14 dias de histórico para identificar promoções reais sem alarmes falsos.
          </p>
        </div>
      ) : (
        <>
          {/* Top 3 Cards Destacados */}
          {topPromos.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <SparklesIcon className="w-4 h-4 text-amber-500" />
                <span>Maiores Descontos</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {topPromos.map((item) => {
                  const inComp = isItemInComparison(item.nome)
                  return (
                    <div
                      key={item.id}
                      className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative flex flex-col justify-between"
                    >
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white uppercase tracking-wider ${
                            item.origem === 'atacadao' ? 'bg-blue-600' : 'bg-red-600'
                          }`}
                        >
                          {item.origem === 'atacadao' ? 'Atacadão' : 'BigMaster'}
                        </span>
                        <span className="bg-emerald-500 text-white text-xs font-black px-2 py-0.5 rounded-full shadow-sm">
                          -{item.descontoPercentual}%
                        </span>
                      </div>

                      {/* Imagem + Nome */}
                      <div className="flex gap-3 items-center mb-3">
                        {item.imagemUrl ? (
                          <img
                            src={getImageUrl(item.imagemUrl)!}
                            alt={item.nome}
                            className="w-16 h-16 object-contain rounded-lg border border-gray-100 shrink-0 bg-gray-50"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 text-gray-400 font-bold text-xs">
                            Sem foto
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-gray-900 line-clamp-2 leading-snug">{item.nome}</p>
                          <span className="text-[10px] text-gray-500 block mt-0.5">{item.diasEmPromocao} dia(s) em oferta</span>
                        </div>
                      </div>

                      {/* Preços + Ação */}
                      <div className="pt-3 border-t border-gray-100 flex items-center justify-between mt-auto">
                        <div>
                          <span className="text-xs text-gray-400 line-through block font-medium">
                            R$ {item.precoReferencia.toFixed(2)}
                          </span>
                          <span className="text-lg font-black text-emerald-600">
                            R$ {item.precoAtual.toFixed(2)}
                          </span>
                        </div>
                        <button
                          onClick={() => onAddToComparison(item.nome, item.precoAtual)}
                          disabled={inComp}
                          className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            inComp
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                          }`}
                        >
                          {inComp ? (
                            <>
                              <CheckIcon className="w-4 h-4" />
                              <span>Na lista</span>
                            </>
                          ) : (
                            <>
                              <PlusIcon className="w-4 h-4" />
                              <span>Comparar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Gráfico de Barras Horizontais Top 15 Descontos */}
          {chartData.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-900">Top 15 Maiores Descontos (%)</h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                    <XAxis type="number" unit="%" domain={[0, 'dataMax + 5']} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="nomeCurto" width={95} tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(val: any) => [`${val}% de desconto`, 'Desconto']}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.nomeCompleto || label}
                    />
                    <Bar dataKey="desconto" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, idx) => (
                        <Cell
                          key={`cell-${idx}`}
                          fill={entry.origem === 'atacadao' ? '#2563eb' : '#dc2626'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Lista Completa com Sparkline 30d */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Todas as Ofertas</h3>
              <span className="text-xs text-gray-500">{promotions.length} itens</span>
            </div>

            <div className="divide-y divide-gray-100">
              {promotions.map((item) => {
                const inComp = isItemInComparison(item.nome)
                return (
                  <div key={item.id} className="p-4 hover:bg-gray-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Item details */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {item.imagemUrl ? (
                        <img
                          src={getImageUrl(item.imagemUrl)!}
                          alt={item.nome}
                          className="w-12 h-12 object-contain rounded-lg border border-gray-100 shrink-0 bg-gray-50"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 text-gray-400 font-bold text-[10px]">
                          Sem foto
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded text-white uppercase ${
                              item.origem === 'atacadao' ? 'bg-blue-600' : 'bg-red-600'
                            }`}
                          >
                            {item.origem === 'atacadao' ? 'Atacadão' : 'BigMaster'}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            -{item.descontoPercentual}%
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-gray-900 truncate mt-0.5">{item.nome}</h4>
                        <span className="text-[10px] text-gray-500">
                          Economia de R$ {item.economiaReais.toFixed(2)} vs referência R$ {item.precoReferencia.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Sparkline (30 dias) */}
                    {item.sparkline && item.sparkline.length > 0 && (
                      <div className="w-32 h-10 shrink-0 border-l border-r border-gray-100 px-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={item.sparkline}>
                            <Line type="monotone" dataKey="preco" stroke="#10b981" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Preço + Botão */}
                    <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
                      <div className="text-right">
                        <span className="text-[11px] text-gray-400 line-through block font-medium">
                          R$ {item.precoReferencia.toFixed(2)}
                        </span>
                        <span className="text-base font-black text-emerald-600">
                          R$ {item.precoAtual.toFixed(2)}
                        </span>
                      </div>

                      <button
                        onClick={() => onAddToComparison(item.nome, item.precoAtual)}
                        disabled={inComp}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          inComp
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                        }`}
                      >
                        {inComp ? (
                          <>
                            <CheckIcon className="w-3.5 h-3.5" />
                            <span>Adicionado</span>
                          </>
                        ) : (
                          <>
                            <PlusIcon className="w-3.5 h-3.5" />
                            <span>Adicionar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
