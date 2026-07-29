import { useState, useEffect } from 'react'
import {
  fetchProductInsights,
  type ProductInsights,
} from '../api/client'
import {
  ArrowLeftIcon,
  BellIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts'

interface ProductPriceHistoryProps {
  productId: number
  onBack: () => void
}

export function ProductPriceHistory({ productId, onBack }: ProductPriceHistoryProps) {
  const [data, setData] = useState<ProductInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [periodo, setPeriodo] = useState('90d')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetchProductInsights(productId, periodo)
        setData(res)
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar histórico do produto.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [productId, periodo])

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-gray-500">Carregando dados de variação de preço...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 cursor-pointer"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span>Voltar para o catálogo</span>
        </button>
        <div className="flex items-center gap-2 bg-red-50 text-red-700 p-4 rounded-xl text-sm font-semibold border border-red-200">
          <ExclamationCircleIcon className="w-5 h-5 shrink-0" />
          <span>{error || 'Não foi possível carregar os dados.'}</span>
        </div>
      </div>
    )
  }

  const { produto, series, resumo } = data

  // Prepara dados combinados para o recharts
  const dates = series.atacadao.length > 0
    ? series.atacadao.map((s) => s.dia)
    : series.bigmaster.map((s) => s.dia)

  const chartData = dates.map((dia, idx) => ({
    dia,
    Atacadão: series.atacadao[idx]?.preco ?? null,
    BigMaster: series.bigmaster[idx]?.preco ?? null,
  }))

  const hasTwoSeries = series.atacadao.some((s) => s.preco !== null) && series.bigmaster.some((s) => s.preco !== null)
  const totalPoints = chartData.filter((d) => d.Atacadão !== null || d.BigMaster !== null).length

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
      {/* Header com botão voltar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div className="space-y-1">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer mb-2"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Voltar ao catálogo</span>
          </button>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">{produto.nome}</h2>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white uppercase ${
              produto.origem === 'atacadao' ? 'bg-blue-600' : 'bg-red-600'
            }`}>
              {produto.origem === 'atacadao' ? 'Atacadão' : 'BigMaster'}
            </span>
          </div>
        </div>

        {/* Botão Alerta (Desabilitado com Tooltip) */}
        <div className="relative group self-start sm:self-center">
          <button
            disabled
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-400 border border-gray-200 rounded-lg text-xs font-bold cursor-not-allowed"
          >
            <BellIcon className="w-4 h-4" />
            <span>Criar alerta de queda</span>
          </button>
          <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-[10px] font-medium py-1 px-2.5 rounded shadow-lg whitespace-nowrap">
            Recurso disponível em breve!
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Preço Atual</span>
          <p className="text-lg font-black text-gray-900 mt-0.5">
            {resumo.precoAtual ? `R$ ${resumo.precoAtual.toFixed(2)}` : 'N/D'}
          </p>
          {produto.emPromocao && (
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 mt-1 inline-block">
              Em oferta agora!
            </span>
          )}
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Menor Preço</span>
          <p className="text-lg font-black text-emerald-600 mt-0.5">
            {resumo.menorPreco ? `R$ ${resumo.menorPreco.toFixed(2)}` : 'N/D'}
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Maior Preço</span>
          <p className="text-lg font-black text-rose-600 mt-0.5">
            {resumo.maiorPreco ? `R$ ${resumo.maiorPreco.toFixed(2)}` : 'N/D'}
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Variação ({periodo})</span>
          <div className="flex items-center gap-1 mt-0.5">
            {resumo.variacaoPercentual !== null ? (
              <>
                {resumo.variacaoPercentual < 0 ? (
                  <ArrowTrendingDownIcon className="w-4 h-4 text-emerald-600" />
                ) : (
                  <ArrowTrendingUpIcon className="w-4 h-4 text-rose-600" />
                )}
                <span className={`text-base font-black ${resumo.variacaoPercentual < 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {resumo.variacaoPercentual > 0 ? `+${resumo.variacaoPercentual}` : resumo.variacaoPercentual}%
                </span>
              </>
            ) : (
              <span className="text-base font-black text-gray-400">N/D</span>
            )}
          </div>
        </div>
      </div>

      {/* Seletor de Período & Legenda */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-gray-900">Histórico de Preços</h3>
          {hasTwoSeries && (
            <span className="text-[10px] bg-blue-50 border border-blue-200 text-blue-700 font-bold px-2 py-0.5 rounded-full">
              Atacadão vs BigMaster
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
          {['7d', '30d', '90d', 'tudo'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                periodo === p ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Gráfico ou Mensagem de dados insuficientes */}
      {totalPoints < 7 ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-6 rounded-xl text-center space-y-2">
          <InformationCircleIcon className="w-8 h-8 text-amber-600 mx-auto" />
          <h4 className="text-sm font-bold">Histórico em construção</h4>
          <p className="text-xs text-amber-700 max-w-md mx-auto">
            Este produto possui apenas {totalPoints} ponto(s) capturado(s) no período. Conforme o sistema realiza varreduras diárias, o gráfico completo de tendências será exibido aqui.
          </p>
        </div>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
              <YAxis domain={['auto', 'auto']} tickFormatter={(v) => `R$${v}`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(val: any) => [`R$ ${Number(val).toFixed(2)}`, 'Preço']} />
              <Legend />

              {produto.precoReferencia && (
                <ReferenceLine
                  y={produto.precoReferencia}
                  label={{ value: `Ref: R$${produto.precoReferencia.toFixed(2)}`, fill: '#eab308', fontSize: 10, position: 'top' }}
                  stroke="#eab308"
                  strokeDasharray="3 3"
                />
              )}

              {series.atacadao.some((s) => s.preco !== null) && (
                <Line
                  type="monotone"
                  dataKey="Atacadão"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  connectNulls
                />
              )}

              {series.bigmaster.some((s) => s.preco !== null) && (
                <Line
                  type="monotone"
                  dataKey="BigMaster"
                  stroke="#dc2626"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  connectNulls
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
