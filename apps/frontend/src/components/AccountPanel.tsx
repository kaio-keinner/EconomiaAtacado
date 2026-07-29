import { useState, useEffect } from 'react'
import {
  fetchMySubscription,
  createCheckoutSession,
  type SubscriptionResponse,
} from '../api/client'
import {
  SparklesIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  CreditCardIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'

export function AccountPanel() {
  const [data, setData] = useState<SubscriptionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const loadSubscription = async () => {
    try {
      setLoading(true)
      const res = await fetchMySubscription()
      setData(res)
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar informações da conta')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSubscription()
  }, [])

  const handleUpgrade = async () => {
    try {
      setUpgrading(true)
      setError(null)
      setMessage(null)
      const res = await createCheckoutSession()
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl
      } else if (res.simulated) {
        setMessage(res.mensagem || 'Plano Pro ativado!')
        loadSubscription()
      }
    } catch (err: any) {
      setError(err.message || 'Falha ao iniciar upgrade')
    } finally {
      setUpgrading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex items-center justify-center gap-2 text-sm text-gray-500">
        <ArrowPathIcon className="w-5 h-5 animate-spin text-blue-600" />
        Carregando informações da conta...
      </div>
    )
  }

  const isPro = data?.limits.isPro ?? false

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col gap-6 text-left">
      <div className="flex items-center justify-between border-b pb-4 border-gray-100">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Meu Plano e Assinatura</h2>
          <p className="text-xs text-gray-500">Gerencie seu plano e recursos liberados na plataforma</p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
            isPro
              ? 'bg-amber-100 text-amber-800 border border-amber-300'
              : 'bg-gray-100 text-gray-700 border border-gray-200'
          }`}
        >
          {isPro ? (
            <>
              <SparklesIcon className="w-4 h-4 text-amber-600" /> Plano PRO
            </>
          ) : (
            'Plano Gratuito'
          )}
        </span>
      </div>

      {message && (
        <div className="p-4 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-2">
          <CheckCircleIcon className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex flex-col gap-2">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Limites de Listas</span>
          <span className="text-xl font-extrabold text-gray-900">
            {isPro ? 'Ilimitadas' : 'Até 3 Listas Salvas'}
          </span>
          <p className="text-xs text-gray-500">
            {isPro
              ? 'Você pode criar quantas listas de compras desejar.'
              : 'Faça upgrade para salvar listas sem restrições.'}
          </p>
        </div>

        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex flex-col gap-2">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Frequência de Sincronização</span>
          <span className="text-xl font-extrabold text-gray-900">
            {isPro ? 'Ilimitada / Alta Frequência' : 'Cooldown Padrão (2 min)'}
          </span>
          <p className="text-xs text-gray-500">
            {isPro
              ? 'Sem bloqueios de frequências de raspagem no Atacadão/BigMaster.'
              : 'Respeita cooldown de 2 minutos por sync.'}
          </p>
        </div>
      </div>

      <div className="border-t pt-4 border-gray-100 flex flex-col gap-3">
        <h3 className="text-sm font-bold text-gray-800">Recursos Incluídos:</h3>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
          <li className="flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 text-emerald-500" /> Leitura automática de cupons fiscais SEFAZ
          </li>
          <li className="flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 text-emerald-500" /> Comparação inteligente de preços
          </li>
          <li className="flex items-center gap-2">
            <CheckCircleIcon className={`w-4 h-4 ${isPro ? 'text-emerald-500' : 'text-gray-300'}`} /> Listas salvas ilimitadas {isPro ? '(Liberado)' : '(Exclusivo Pro)'}
          </li>
          <li className="flex items-center gap-2">
            <CheckCircleIcon className={`w-4 h-4 ${isPro ? 'text-emerald-500' : 'text-gray-300'}`} /> Suporte priorizado e sem anúncios {isPro ? '(Liberado)' : '(Exclusivo Pro)'}
          </li>
        </ul>
      </div>

      {!isPro && (
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl p-5 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 font-extrabold text-base">
              <SparklesIcon className="w-5 h-5" /> Faça Upgrade para o Plano PRO
            </div>
            <p className="text-xs text-amber-100">
              Apenas R$ 29,90/mês. Cancele a qualquer momento.
            </p>
          </div>
          <button
            onClick={handleUpgrade}
            disabled={upgrading}
            className="w-full sm:w-auto px-5 py-2.5 bg-white text-amber-900 hover:bg-amber-50 rounded-lg font-bold text-xs shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {upgrading ? (
              <>
                <ArrowPathIcon className="w-4 h-4 animate-spin" /> Processando...
              </>
            ) : (
              <>
                <CreditCardIcon className="w-4 h-4" /> Assinar Agora com Stripe
              </>
            )}
          </button>
        </div>
      )}

      {isPro && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldCheckIcon className="w-5 h-5 text-emerald-600" />
            Sua assinatura Pro está ativa. Obrigado por apoiar a plataforma!
          </div>
        </div>
      )}
    </div>
  )
}
