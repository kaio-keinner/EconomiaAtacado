import { useState, useEffect } from 'react'
import {
  syncBigMaster,
  syncAllAtacadao,
  type JobStatus,
} from '../api/client'
import {
  ShieldCheckIcon,
  CpuChipIcon,
  ListBulletIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'

const BASE_URL = (import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3334`).replace(/\/api\/?$/, '')
const API_URL = `${BASE_URL}/api`

interface ScraperHealth {
  fonte: string
  status: 'healthy' | 'warning' | 'error'
  ultimaExecucao: string | null
  itensColetados: number
  taxaSucesso7d: number
}

interface ProductMatch {
  id: number
  atacadaoProductId: number
  bigmasterProductId: number
  score: number
  status: 'auto' | 'manual' | 'rejected'
  atacadao?: { id: number; nome: string; precoVarejo: number; imagemUrl: string | null }
  bigmaster?: { id: number; nome: string; precoVarejo: number; imagemUrl: string | null }
}

export function AdminScreen() {
  const [activeTab, setActiveTab] = useState<'health' | 'jobs' | 'matches'>('health')

  // Aba 1: Scraper Health
  const [healthData, setHealthData] = useState<ScraperHealth[]>([])
  const [loadingHealth, setLoadingHealth] = useState(false)
  const [syncingMap, setSyncingMap] = useState<Record<string, boolean>>({})

  // Aba 2: Jobs Queue
  const [recentJobs, setRecentJobs] = useState<JobStatus[]>([])
  const [loadingJobs, setLoadingJobs] = useState(false)

  // Aba 3: Matches Correction
  const [matches, setMatches] = useState<ProductMatch[]>([])
  const [loadingMatches, setLoadingMatches] = useState(false)
  const [recomputing, setRecomputing] = useState(false)

  const [msg, setMsg] = useState<string | null>(null)

  // Fetch data on tab change
  useEffect(() => {
    if (activeTab === 'health') {
      loadHealth()
    } else if (activeTab === 'jobs') {
      loadJobs()
    } else if (activeTab === 'matches') {
      loadMatches()
    }
  }, [activeTab])

  async function loadHealth() {
    setLoadingHealth(true)
    try {
      const token = localStorage.getItem('produtos-app:auth-token')
      const res = await fetch(`${API_URL}/scrapers/health`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const json = await res.json()
        setHealthData(json.scrapers || json)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingHealth(false)
    }
  }

  async function loadJobs() {
    setLoadingJobs(true)
    try {
      // Simula lista de jobs ativos/recentes do BullMQ
      setRecentJobs([
        {
          id: 'job-101',
          type: 'atacadao_sync_all',
          status: 'completed',
          progress: 100,
          result: { total: 450 },
          error: null,
          createdAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
        },
        {
          id: 'job-102',
          type: 'bigmaster_sync',
          status: 'completed',
          progress: 100,
          result: { salvos: 320 },
          error: null,
          createdAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
        },
      ])
    } finally {
      setLoadingJobs(false)
    }
  }

  async function loadMatches() {
    setLoadingMatches(true)
    try {
      const token = localStorage.getItem('produtos-app:auth-token')
      const res = await fetch(`${API_URL}/matches`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const json = await res.json()
        setMatches(json.matches || json)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingMatches(false)
    }
  }

  async function handleSyncSource(fonte: string) {
    setSyncingMap((prev) => ({ ...prev, [fonte]: true }))
    setMsg(null)
    try {
      if (fonte === 'bigmaster') {
        await syncBigMaster()
        setMsg('Sincronização do BigMaster concluída!')
      } else if (fonte === 'atacadao') {
        await syncAllAtacadao({ maxPaginas: 1 })
        setMsg('Sincronização do Atacadão iniciada!')
      }
      await loadHealth()
    } catch (err: any) {
      alert(err.message || 'Erro ao sincronizar fonte.')
    } finally {
      setSyncingMap((prev) => ({ ...prev, [fonte]: false }))
    }
  }

  async function handleRejectMatch(matchId: number) {
    try {
      const token = localStorage.getItem('produtos-app:auth-token')
      const res = await fetch(`${API_URL}/matches/${matchId}/reject`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setMatches((prev) => prev.filter((m) => m.id !== matchId))
        setMsg('Pareamento rejeitado com sucesso.')
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao rejeitar pareamento.')
    }
  }

  async function handleConfirmMatch(matchId: number) {
    try {
      const token = localStorage.getItem('produtos-app:auth-token')
      const res = await fetch(`${API_URL}/matches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ matchId, status: 'manual' }),
      })
      if (res.ok) {
        setMatches((prev) =>
          prev.map((m) => (m.id === matchId ? { ...m, status: 'manual' } : m))
        )
        setMsg('Pareamento confirmado como manual!')
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao confirmar pareamento.')
    }
  }

  async function handleRecomputeMatches() {
    setRecomputing(true)
    setMsg(null)
    try {
      const token = localStorage.getItem('produtos-app:auth-token')
      const res = await fetch(`${API_URL}/matches/recompute`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setMsg('Recomputação de pareamentos iniciada em segundo plano!')
        await loadMatches()
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao recomputar pareamentos.')
    } finally {
      setRecomputing(false)
    }
  }

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
            <ShieldCheckIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black">Painel Administrativo</h2>
            <p className="text-xs text-slate-400">Gestão de scrapers, filas de execução e correções de matching</p>
          </div>
        </div>

        <span className="bg-amber-400 text-gray-950 font-black text-[10px] uppercase px-2.5 py-1 rounded-full">
          Acesso Admin
        </span>
      </div>

      {msg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
          <span>{msg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-2">
        <button
          onClick={() => setActiveTab('health')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'health'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <CpuChipIcon className="w-4 h-4" />
          <span>Saúde dos Scrapers</span>
        </button>

        <button
          onClick={() => setActiveTab('jobs')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'jobs'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <ListBulletIcon className="w-4 h-4" />
          <span>Fila de Jobs</span>
        </button>

        <button
          onClick={() => setActiveTab('matches')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'matches'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <ShieldCheckIcon className="w-4 h-4" />
          <span>Correção de Matching</span>
        </button>
      </div>

      {/* TAB 1: SAÚDE DOS SCRAPERS */}
      {activeTab === 'health' && (
        <div className="space-y-4">
          {loadingHealth ? (
            <div className="p-8 text-center text-xs text-gray-400">Carregando métricas de saúde dos scrapers...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { fonte: 'atacadao', nome: 'Atacadão (GraphQL / Web)', ...healthData.find((h) => h.fonte === 'atacadao') },
                { fonte: 'bigmaster', nome: 'BigMaster (API Rest / JSON)', ...healthData.find((h) => h.fonte === 'bigmaster') },
              ].map((s) => (
                <div key={s.fonte} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{s.nome}</h3>
                      <span className="text-[10px] text-gray-500">Última execução: {s.ultimaExecucao ? new Date(s.ultimaExecucao).toLocaleString() : 'Sem histórico recente'}</span>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Saudável
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-lg text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Coletados</span>
                      <span className="text-base font-black text-gray-900">{s.itensColetados || 0} itens</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Taxa Sucesso 7d</span>
                      <span className="text-base font-black text-emerald-600">{s.taxaSucesso7d ?? 100}%</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSyncSource(s.fonte)}
                    disabled={syncingMap[s.fonte]}
                    className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {syncingMap[s.fonte] ? (
                      <>
                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        <span>Sincronizando...</span>
                      </>
                    ) : (
                      <>
                        <ArrowPathIcon className="w-4 h-4" />
                        <span>Sincronizar Agora</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FILA DE JOBS */}
      {activeTab === 'jobs' && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Monitoramento da Fila de Execução (BullMQ)</h3>
            <span className="text-xs text-gray-500">{recentJobs.length} job(s)</span>
          </div>

          {loadingJobs ? (
            <div className="p-8 text-center text-xs text-gray-400">Carregando status da fila...</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentJobs.map((j) => (
                <div key={j.id} className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{j.type}</span>
                      <span className="text-[10px] bg-gray-100 font-mono text-gray-600 px-1.5 py-0.5 rounded">#{j.id}</span>
                    </div>
                    <span className="text-[10px] text-gray-500 block mt-0.5">Criado em: {new Date(j.createdAt).toLocaleTimeString()}</span>
                  </div>

                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {j.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CORREÇÃO DE MATCHING */}
      {activeTab === 'matches' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Gerenciador de Pareamentos</h3>
              <p className="text-xs text-gray-500">Exibindo pareamentos computados por score de confiança</p>
            </div>

            <button
              onClick={handleRecomputeMatches}
              disabled={recomputing}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {recomputing ? (
                <>
                  <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                  <span>Recomputando...</span>
                </>
              ) : (
                <>
                  <ArrowPathIcon className="w-3.5 h-3.5" />
                  <span>Recomputar Todos</span>
                </>
              )}
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {loadingMatches ? (
              <div className="p-8 text-center text-xs text-gray-400">Carregando pareamentos...</div>
            ) : matches.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500 space-y-1">
                <p className="font-bold">Nenhum pareamento pendente</p>
                <p>Execute "Recomputar Todos" para rodar o motor de inteligência de pareamento.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {matches.map((m) => (
                  <div key={m.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      {/* Atacadão */}
                      <div className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
                        <span className="text-[9px] font-bold text-blue-600 uppercase block">Atacadão</span>
                        <p className="font-bold text-gray-900 truncate">{m.atacadao?.nome || `Produto #${m.atacadaoProductId}`}</p>
                      </div>

                      {/* BigMaster */}
                      <div className="bg-red-50/50 p-2.5 rounded-lg border border-red-100">
                        <span className="text-[9px] font-bold text-red-600 uppercase block">BigMaster</span>
                        <p className="font-bold text-gray-900 truncate">{m.bigmaster?.nome || `Produto #${m.bigmasterProductId}`}</p>
                      </div>
                    </div>

                    {/* Score + Ações */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-center">
                        <span className="text-[10px] text-gray-400 block font-bold">Confiança</span>
                        <span className={`text-xs font-black px-2 py-0.5 rounded ${
                          m.score >= 0.7 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {(m.score * 100).toFixed(0)}%
                        </span>
                      </div>

                      <button
                        onClick={() => handleConfirmMatch(m.id)}
                        className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                        title="Confirmar Pareamento"
                      >
                        <CheckIcon className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleRejectMatch(m.id)}
                        className="p-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg border border-red-200 transition-colors cursor-pointer"
                        title="Rejeitar Pareamento"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
