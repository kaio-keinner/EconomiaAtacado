import { useState, useEffect } from 'react'
import {
  fetchPriceAlerts,
  createPriceAlert,
  deletePriceAlert,
  createCheckoutSession,
  getImageUrl,
  type PriceAlert,
} from '../api/client'
import {
  BellIcon,
  PlusIcon,
  TrashIcon,
  SparklesIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'

export function PriceAlertsScreen() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [planLimitError, setPlanLimitError] = useState<string | null>(null)

  const [productIdInput, setProductIdInput] = useState('')
  const [tipo, setTipo] = useState<'qualquer_queda' | 'abaixo_de'>('qualquer_queda')
  const [precoAlvoInput, setPrecoAlvoInput] = useState('')
  const [creating, setCreating] = useState(false)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  async function loadAlerts() {
    setLoading(true)
    setError(null)
    setPlanLimitError(null)
    try {
      const res = await fetchPriceAlerts()
      setAlerts(res.alerts || [])
    } catch (err: any) {
      if (err.message && (err.message.includes('PLAN_LIMIT') || err.message.includes('exclusiva para assinantes'))) {
        setPlanLimitError(err.message)
      } else {
        setError(err.message || 'Erro ao carregar alertas.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAlerts()
  }, [])

  async function handleCreateAlert(e: React.FormEvent) {
    e.preventDefault()
    if (!productIdInput) return

    setCreating(true)
    setActionMsg(null)
    try {
      await createPriceAlert({
        productId: Number(productIdInput),
        tipo,
        precoAlvo: precoAlvoInput ? Number(precoAlvoInput) : undefined,
      })
      setActionMsg('Alerta de preço configurado com sucesso!')
      setProductIdInput('')
      setPrecoAlvoInput('')
      await loadAlerts()
    } catch (err: any) {
      if (err.message && err.message.includes('PLAN_LIMIT')) {
        setPlanLimitError(err.message)
      } else {
        setError(err.message || 'Erro ao criar alerta.')
      }
    } finally {
      setCreating(false)
    }
  }

  async function handleDeleteAlert(id: number) {
    try {
      await deletePriceAlert(id)
      setAlerts((prev) => prev.filter((a) => a.id !== id))
    } catch (err: any) {
      alert(err.message || 'Erro ao remover alerta.')
    }
  }

  async function handleUpgradePro() {
    setCheckoutLoading(true)
    try {
      const res = await createCheckoutSession()
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl
      } else if (res.simulated) {
        alert(res.mensagem || 'Plano Pro ativado!')
        window.location.reload()
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao iniciar checkout do Pro.')
    } finally {
      setCheckoutLoading(false)
    }
  }

  if (planLimitError) {
    return (
      <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white rounded-2xl p-8 shadow-xl max-w-2xl mx-auto space-y-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center mx-auto text-amber-300">
          <SparklesIcon className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black">Recurso Exclusivo do Plano Pro</h2>
          <p className="text-sm text-indigo-200 max-w-md mx-auto">
            Monitore a queda de preço dos seus produtos favoritos e seja notificado no instante em que entrarem em promoção!
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 text-xs space-y-2 text-indigo-100 max-w-sm mx-auto text-left">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Alertas de queda imediata de preço</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Notificações quando atingir seu preço alvo</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Listas salvas ilimitadas + Histórico completo</span>
          </div>
        </div>

        <button
          onClick={handleUpgradePro}
          disabled={checkoutLoading}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-400 hover:bg-amber-300 text-gray-950 font-black rounded-xl text-sm transition-all shadow-lg shadow-amber-400/20 cursor-pointer disabled:opacity-50"
        >
          {checkoutLoading ? (
            <span>Iniciando checkout...</span>
          ) : (
            <>
              <span>Assinar Plano Pro por R$ 10,00/mês</span>
              <ArrowRightIcon className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <BellIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Alertas de Preço</h2>
            <p className="text-xs text-gray-500">Configure avisos de queda de preço para produtos do catálogo</p>
          </div>
        </div>

        {/* Form para criar alerta */}
        <form onSubmit={handleCreateAlert} className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
          <div>
            <label className="text-[11px] font-bold text-gray-500 block mb-1">ID do Produto</label>
            <input
              type="number"
              placeholder="Ex: 12"
              value={productIdInput}
              onChange={(e) => setProductIdInput(e.target.value)}
              required
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-500 block mb-1">Tipo de Alerta</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as any)}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:border-blue-500 outline-none bg-white cursor-pointer"
            >
              <option value="qualquer_queda">Qualquer Queda de Preço</option>
              <option value="abaixo_de">Preço Abaixo De (Alvo)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-500 block mb-1">
              {tipo === 'abaixo_de' ? 'Preço Alvo (R$)' : 'Opcional'}
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="Ex: 15.90"
              value={precoAlvoInput}
              onChange={(e) => setPrecoAlvoInput(e.target.value)}
              disabled={tipo === 'qualquer_queda'}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:border-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={creating}
              className="w-full px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Criar Alerta</span>
            </button>
          </div>
        </form>
      </div>

      {actionMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
          <span>{actionMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
          <ExclamationCircleIcon className="w-4 h-4 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Lista de Alertas Ativos */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">Seus Alertas Ativos</h3>
          <span className="text-xs text-gray-500">{alerts.length} alerta(s)</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-gray-400">Carregando alertas...</div>
        ) : alerts.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500 space-y-1">
            <p className="font-bold">Nenhum alerta cadastrado</p>
            <p>Cadastre um alerta no formulário acima ou clique no botão de alerta nas telas de produto.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {alerts.map((alertItem) => {
              const prod = alertItem.produto
              return (
                <div key={alertItem.id} className="p-4 flex items-center justify-between gap-4 hover:bg-gray-50/80 transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {prod?.imagemUrl ? (
                      <img src={getImageUrl(prod.imagemUrl)!} alt={prod.nome} className="w-10 h-10 object-contain rounded border border-gray-100 shrink-0 bg-gray-50" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-400 font-bold text-[9px] shrink-0">
                        Foto
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-gray-900 truncate">{prod?.nome || `Produto #${alertItem.productId}`}</h4>
                      <span className="text-[10px] text-gray-500 block">
                        Tipo: {alertItem.tipo === 'abaixo_de' ? `Abaixo de R$ ${alertItem.precoAlvo?.toFixed(2)}` : 'Qualquer Queda de Preço'}
                        {alertItem.ultimoDisparoEm ? ` • Último disparo em: ${new Date(alertItem.ultimoDisparoEm).toLocaleDateString()}` : ''}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteAlert(alertItem.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Remover alerta"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
