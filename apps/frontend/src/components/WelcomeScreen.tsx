import { useState, useEffect } from 'react'
import {
  ArrowPathIcon,
  CircleStackIcon,
  ShoppingCartIcon,
  DocumentTextIcon,
  ScaleIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  SparklesIcon,
  BanknotesIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline'
import {
  fetchBasketIndex,
  fetchPromotions,
  getImageUrl,
  type MarketStats,
  type ComparisonResult,
  type BasketIndexResponse,
  type PromotionItem,
} from '../api/client'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts'

interface WelcomeScreenProps {
  onNavigate: (view: 'welcome' | 'catalog' | 'scanner' | 'comparison' | 'promotions') => void
  productStats: Record<string, MarketStats> | null
  lastComparison: ComparisonResult | null
  onSyncBigMaster: () => Promise<void>
  syncingBigMaster: boolean
  onSyncBigMasterImages: () => Promise<void>
  syncingImages: boolean
  syncMessage: string | null
  onScrapeComplete: () => void
}

export function WelcomeScreen({
  onNavigate,
  productStats,
  lastComparison,
  onSyncBigMaster,
  syncingBigMaster,
  onSyncBigMasterImages,
  syncingImages,
  syncMessage: initialSyncMessage,
}: WelcomeScreenProps) {
  const [basketData, setBasketData] = useState<BasketIndexResponse | null>(null)
  const [promotions, setPromotions] = useState<PromotionItem[]>([])
  const [loadingDashboard, setLoadingDashboard] = useState(true)

  // Carrega em uma única leva de requests paralelas (sem cascata)
  useEffect(() => {
    async function loadDashboardData() {
      setLoadingDashboard(true)
      try {
        const [basketRes, promoRes] = await Promise.all([
          fetchBasketIndex('90d').catch(() => ({ atacadao: [], bigmaster: [] })),
          fetchPromotions({ limite: 5 }).catch(() => ({ promotions: [] })),
        ])
        setBasketData(basketRes)
        setPromotions(promoRes.promotions || [])
      } catch (err) {
        console.error('Erro ao carregar dados do dashboard:', err)
      } finally {
        setLoadingDashboard(false)
      }
    }

    loadDashboardData()
  }, [])

  // Prepara série combinada do índice de cesta para o recharts
  const basketDates = basketData?.atacadao.length
    ? basketData.atacadao.map((b) => b.dia)
    : basketData?.bigmaster.map((b) => b.dia) || []

  const chartData = basketDates.map((dia, idx) => ({
    dia,
    Atacadão: basketData?.atacadao[idx]?.indice ?? null,
    BigMaster: basketData?.bigmaster[idx]?.indice ?? null,
  }))

  // Identifica qual mercado está mais barato hoje no índice
  let cheaperMarketPhrase = 'Coletando histórico diário para determinar o mercado mais barato.'
  if (basketData && basketData.atacadao.length > 0 && basketData.bigmaster.length > 0) {
    const lastA = basketData.atacadao[basketData.atacadao.length - 1].indice
    const lastB = basketData.bigmaster[basketData.bigmaster.length - 1].indice
    if (lastA < lastB) {
      const diff = (((lastB - lastA) / lastB) * 100).toFixed(1)
      cheaperMarketPhrase = `Hoje o Atacadão está ${diff}% mais barato no acumulado da cesta média!`
    } else if (lastB < lastA) {
      const diff = (((lastA - lastB) / lastA) * 100).toFixed(1)
      cheaperMarketPhrase = `Hoje o BigMaster está ${diff}% mais barato no acumulado da cesta média!`
    } else {
      cheaperMarketPhrase = 'Hoje ambos os mercados apresentam o mesmo custo médio de cesta!'
    }
  }

  // Economia acumulada das comparações salvas
  const economiaMes = lastComparison?.resumo?.economiaTotal || 0

  return (
    <div className="space-y-6 text-left">
      {/* Mensagens de Sincronização */}
      {initialSyncMessage && (
        <div className="flex items-center gap-2.5 p-4 rounded-xl text-xs font-bold border bg-emerald-50 text-emerald-800 border-emerald-200">
          <CheckCircleIcon className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{initialSyncMessage}</span>
        </div>
      )}

      {/* FAIXA SUPERIOR: ÍNDICE DE CESTA 90 DIAS + MENSAGEM */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <ArrowTrendingDownIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Índice de Cesta por Mercado (Base 100)</h2>
              <p className="text-xs font-semibold text-emerald-600 mt-0.5">{cheaperMarketPhrase}</p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100 self-start sm:self-center">
            Últimos 90 dias
          </span>
        </div>

        {/* Gráfico Recharts de Cesta */}
        {loadingDashboard ? (
          <div className="h-48 bg-gray-50 rounded-xl animate-pulse flex items-center justify-center text-xs text-gray-400">
            Carregando índice de cesta...
          </div>
        ) : chartData.length > 0 ? (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(val: any) => [`${val}`, 'Índice']} />
                <Legend />
                <Line type="monotone" dataKey="Atacadão" stroke="#2563eb" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="BigMaster" stroke="#dc2626" strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-100 p-6 rounded-xl text-center text-xs text-gray-500 space-y-1">
            <p className="font-bold">Índice de cesta em consolidação</p>
            <p>O gráfico comparativo será exibido assim que a série diária de preços for populada.</p>
          </div>
        )}
      </div>

      {/* SEÇÃO DOIS CARDS: QUANTO ECONOMIZOU + AÇÕES RÁPIDAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card Quanto Economizou */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-6 shadow-md flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div>
            <div className="flex items-center gap-2 text-emerald-100 mb-2">
              <BanknotesIcon className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Sua Economia Acumulada</span>
            </div>

            {economiaMes > 0 ? (
              <div className="mt-2">
                <span className="text-3xl font-black text-white">
                  R$ {economiaMes.toFixed(2)}
                </span>
                <p className="text-xs text-emerald-100 mt-1">
                  Economizados nas comparações de listas de compras no mês!
                </p>
              </div>
            ) : (
              <div className="mt-2 space-y-1">
                <span className="text-2xl font-bold text-white">Monte sua 1ª Lista!</span>
                <p className="text-xs text-emerald-100">
                  Compare sua lista de supermercado para descobrir quanto vai economizar hoje.
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigate('comparison')}
            className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-white text-emerald-800 rounded-xl text-xs font-bold hover:bg-emerald-50 transition-colors shadow-sm self-start cursor-pointer"
          >
            <span>Ir para Lista de Compras</span>
            <ArrowRightIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Card Ações Rápidas */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">Ações Rápidas</h3>
            <p className="text-xs text-gray-500">Acesse as ferramentas principais em um clique</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onNavigate('catalog')}
              className="p-3 bg-blue-50 border border-blue-100 hover:bg-blue-100/70 rounded-xl text-left transition-colors cursor-pointer space-y-1"
            >
              <ShoppingCartIcon className="w-5 h-5 text-blue-600" />
              <span className="text-xs font-bold text-gray-900 block">Explorar Catálogo</span>
              <span className="text-[10px] text-gray-500 block">Consultar preços</span>
            </button>

            <button
              onClick={() => onNavigate('promotions')}
              className="p-3 bg-red-50 border border-red-100 hover:bg-red-100/70 rounded-xl text-left transition-colors cursor-pointer space-y-1"
            >
              <SparklesIcon className="w-5 h-5 text-red-600" />
              <span className="text-xs font-bold text-gray-900 block">Ver Promoções</span>
              <span className="text-[10px] text-gray-500 block">Maiores descontos</span>
            </button>

            <button
              onClick={() => onNavigate('scanner')}
              className="p-3 bg-purple-50 border border-purple-100 hover:bg-purple-100/70 rounded-xl text-left transition-colors cursor-pointer space-y-1"
            >
              <DocumentTextIcon className="w-5 h-5 text-purple-600" />
              <span className="text-xs font-bold text-gray-900 block">Escanear Cupom</span>
              <span className="text-[10px] text-gray-500 block">Importar via QR Code</span>
            </button>

            <button
              onClick={() => onNavigate('comparison')}
              className="p-3 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100/70 rounded-xl text-left transition-colors cursor-pointer space-y-1"
            >
              <ScaleIcon className="w-5 h-5 text-emerald-600" />
              <span className="text-xs font-bold text-gray-900 block">Comparar Lista</span>
              <span className="text-[10px] text-gray-500 block">Simular carrinho</span>
            </button>
          </div>
        </div>
      </div>

      {/* CARROSSEL/GRID TOP 5 PROMOÇÕES DA SEMANA */}
      {promotions.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold text-gray-900">Destaques da Semana</h3>
            </div>
            <button
              onClick={() => onNavigate('promotions')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Ver todas</span>
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {promotions.map((p) => (
              <div
                key={p.id}
                onClick={() => onNavigate('promotions')}
                className="bg-gray-50 border border-gray-200/80 rounded-xl p-3 hover:border-blue-300 hover:bg-blue-50/40 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[8px] font-bold px-1.5 py-0.5 rounded text-white uppercase ${
                      p.origem === 'atacadao' ? 'bg-blue-600' : 'bg-red-600'
                    }`}
                  >
                    {p.origem === 'atacadao' ? 'Atacadão' : 'BigMaster'}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded">
                    -{p.descontoPercentual}%
                  </span>
                </div>

                <div className="h-16 flex items-center justify-center my-1">
                  {p.imagemUrl ? (
                    <img src={getImageUrl(p.imagemUrl)!} alt={p.nome} className="max-h-full max-w-full object-contain" />
                  ) : (
                    <div className="text-[9px] text-gray-400 font-bold">Sem imagem</div>
                  )}
                </div>

                <div>
                  <h4 className="text-[11px] font-bold text-gray-900 truncate">{p.nome}</h4>
                  <span className="text-xs font-black text-emerald-600">R$ {p.precoAtual.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CARDS DE ESTATÍSTICA DO CATÁLOGO (MENORES) */}
      {productStats && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status do Catálogo</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(productStats).map(([origem, stat]) => (
              <div key={origem} className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  {origem === 'atacadao' ? 'Atacadão' : origem === 'bigmaster' ? 'BigMaster' : origem}
                </span>
                <span className="text-lg font-black text-gray-900 block mt-0.5">{stat.total} produtos</span>
                <span className="text-[10px] text-gray-500 block">{stat.totalCategorias || 0} categorias</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AÇÕES DE SINCRONIZAÇÃO ADMIN (BOTÕES SECUNDÁRIOS) */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <CircleStackIcon className="w-4 h-4 text-gray-400" />
          <span className="font-semibold text-gray-600">Ações de Sincronização de Banco:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onSyncBigMaster}
            disabled={syncingBigMaster}
            className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg font-semibold text-gray-700 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
          >
            {syncingBigMaster && <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />}
            <span>Sync BigMaster</span>
          </button>

          <button
            onClick={onSyncBigMasterImages}
            disabled={syncingImages}
            className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg font-semibold text-gray-700 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
          >
            {syncingImages && <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />}
            <span>Baixar Imagens</span>
          </button>
        </div>
      </div>
    </div>
  )
}
