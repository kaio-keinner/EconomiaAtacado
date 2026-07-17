import { useState, useEffect } from 'react'
import {
  ArrowPathIcon,
  CircleStackIcon,
  ShoppingCartIcon,
  DocumentTextIcon,
  ScaleIcon,
  CalendarIcon,
  ArrowRightIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline'
import {
  triggerScrape,
  fetchAtacadaoCategories,
  syncAllAtacadao,
  type MarketStats,
  type ComparisonResult
} from '../api/client'

interface WelcomeScreenProps {
  onNavigate: (view: 'welcome' | 'catalog' | 'scanner' | 'comparison') => void
  productStats: Record<string, MarketStats> | null
  comparisonItemCount: number
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
  comparisonItemCount,
  lastComparison,
  onSyncBigMaster,
  syncingBigMaster,
  onSyncBigMasterImages,
  syncingImages,
  syncMessage: initialSyncMessage,
  onScrapeComplete,
}: WelcomeScreenProps) {
  const [showScrapeModal, setShowScrapeModal] = useState(false)
  const [cat1, setCat1] = useState('bebidas')
  const [cat2, setCat2] = useState('cervejas')
  const [pages, setPages] = useState(1)
  const [scraping, setScraping] = useState(false)
  const [scrapeError, setScrapeError] = useState<string | null>(null)
  const [scrapeSuccess, setScrapeSuccess] = useState<string | null>(null)

  // Estados do Scraper de Lote do Atacadão
  const [atacadaoCategories, setAtacadaoCategories] = useState<Record<string, string[]>>({})
  const [syncingAllAtacadao, setSyncingAllAtacadao] = useState(false)
  const [localSyncMessage, setLocalSyncMessage] = useState<string | null>(null)

  // Carrega as categorias do backend ao inicializar
  useEffect(() => {
    async function loadCategories() {
      try {
        const cats = await fetchAtacadaoCategories()
        setAtacadaoCategories(cats)
        
        // Define categorias padrão iniciais seguras baseadas nas disponíveis
        const firstCat = Object.keys(cats)[0] || 'bebidas'
        setCat1(firstCat)
        const subCats = cats[firstCat] || []
        setCat2(subCats[0] || '')
      } catch (err) {
        console.error('Erro ao carregar categorias do Atacadão:', err)
      }
    }
    loadCategories()
  }, [])

  // Sincroniza subcategorias dinamicamente ao selecionar a categoria raiz
  useEffect(() => {
    if (atacadaoCategories[cat1]) {
      const subcats = atacadaoCategories[cat1]
      if (subcats.length > 0) {
        // Se a subcategoria atual não pertence à nova categoria pai selecionada, reseta para a primeira da lista
        if (!subcats.includes(cat2)) {
          setCat2(subcats[0])
        }
      } else {
        setCat2('')
      }
    }
  }, [cat1, atacadaoCategories])

  const handleRunSyncAll = async () => {
    setSyncingAllAtacadao(true)
    setLocalSyncMessage('Iniciando sincronização geral do Atacadão (isso pode demorar alguns minutos)...')
    try {
      const res = await syncAllAtacadao({ maxPaginas: 1 }) // 1 página por categoria para rodar limpo
      setLocalSyncMessage(`Sucesso! Sincronização em lote concluída: ${res.totalSalvosGlobal} produtos importados/atualizados.`)
      onScrapeComplete()
    } catch (err: any) {
      setLocalSyncMessage(`Erro na sincronização em lote: ${err.message}`)
    } finally {
      setSyncingAllAtacadao(false)
    }
  }

  // Consolida mensagens de sync
  const syncMessage = localSyncMessage || initialSyncMessage


  function formatDateTime(dateStr: string | null): string {
    if (!dateStr) return 'Nunca sincronizado'
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return dateStr // Retorna original se falhar parse
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return 'Data inválida'
    }
  }

  const handleRunScrape = async (e: React.FormEvent) => {
    e.preventDefault()
    setScraping(true)
    setScrapeError(null)
    setScrapeSuccess(null)
    try {
      const res = await triggerScrape({ categoria1: cat1, categoria2: cat2, maxPaginas: pages })
      setScrapeSuccess(`Sucesso! ${res.total} produtos importados/atualizados.`)
      onScrapeComplete()
      setTimeout(() => {
        setShowScrapeModal(false)
        setScrapeSuccess(null)
      }, 2500)
    } catch (err: any) {
      setScrapeError(err.message || 'Falha ao rodar o scraper do Atacadão.')
    } finally {
      setScraping(false)
    }
  }

  // Estatísticas dos mercados com fallbacks seguros
  const statsAtacadao = productStats?.atacadao || { total: 0, ultimaAtualizacao: null, categorias: [] }
  const statsBigMaster = productStats?.bigmaster || { total: 0, ultimaAtualizacao: null, categorias: [] }

  return (
    <div className="flex flex-col gap-8">
      {/* Banner de Boas-vindas Premium */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 text-white rounded-2xl p-6 md:p-8 shadow-lg border border-slate-800 gap-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.15),transparent_50%)]"></div>
        <div className="flex flex-col gap-2 max-w-2xl text-left z-10">
          <span className="self-start bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full uppercase">
            Painel de Inteligência
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Avaliação de Preços Inteligente</h2>
          <p className="text-sm text-slate-300 leading-relaxed mt-1">
            Compare custos de compras entre o <b>BigMaster</b> e o <b>Atacadão</b>. Atualize as bases de dados, monte sua lista manual ou importe direto do cupom fiscal.
          </p>
        </div>
        <div className="text-5xl md:text-6xl select-none shrink-0 self-center z-10 animate-pulse">📊</div>
      </div>

      {/* Mensagem de Sincronização Ativa */}
      {syncMessage && (
        <div className={`p-4 rounded-xl text-sm font-semibold border flex items-center gap-3 text-left ${
          syncMessage.includes('Erro')
            ? 'bg-red-50 text-red-800 border-red-200'
            : syncMessage.includes('Sucesso')
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-blue-50 text-blue-800 border-blue-200 animate-pulse'
        }`}>
          {syncingBigMaster ? (
            <ArrowPathIcon className="w-5 h-5 animate-spin shrink-0 text-blue-600" />
          ) : syncMessage.includes('Erro') ? (
            <ExclamationCircleIcon className="w-5 h-5 text-red-600 shrink-0" />
          ) : (
            <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0" />
          )}
          <span>{syncMessage}</span>
        </div>
      )}

      {/* Grid de Status dos Mercados */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
        {/* Card BigMaster */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg border border-amber-200/50">
                Supermercado BigMaster
              </span>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">API Oficial</span>
            </div>
            <div className="space-y-3">
              <div>
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{statsBigMaster.total}</span>
                <span className="text-sm font-semibold text-slate-500 ml-1.5">itens em promoção</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CalendarIcon className="w-4 h-4 text-slate-400" />
                <span>Última Sync: <b>{formatDateTime(statsBigMaster.ultimaAtualizacao)}</b></span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CircleStackIcon className="w-4 h-4 text-slate-400" />
                <span>Categorias mapeadas: <b>{statsBigMaster.categorias.length}</b></span>
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={onSyncBigMaster}
              disabled={syncingBigMaster || syncingImages}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer"
            >
              {syncingBigMaster ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <ArrowPathIcon className="w-4 h-4" />
                  Sincronizar API
                </>
              )}
            </button>
            <button
              onClick={onSyncBigMasterImages}
              disabled={syncingBigMaster || syncingImages}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-slate-200 hover:text-white font-bold rounded-xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm border border-slate-700 cursor-pointer"
            >
              {syncingImages ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  Baixando...
                </>
              ) : (
                <>
                  <PhotoIcon className="w-4 h-4 text-slate-400" />
                  Baixar Imagens
                </>
              )}
            </button>
          </div>
        </div>

        {/* Card Atacadão */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-200/50">
                Atacadão
              </span>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">GraphQL Scraper</span>
            </div>
            <div className="space-y-3">
              <div>
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{statsAtacadao.total}</span>
                <span className="text-sm font-semibold text-slate-500 ml-1.5">produtos coletados</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CalendarIcon className="w-4 h-4 text-slate-400" />
                <span>Último Scrape: <b>{formatDateTime(statsAtacadao.ultimaAtualizacao)}</b></span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CircleStackIcon className="w-4 h-4 text-slate-400" />
                <span>Categorias catalogadas: <b>{statsAtacadao.categorias.length}</b></span>
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleRunSyncAll}
              disabled={syncingAllAtacadao || scraping}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {syncingAllAtacadao ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  Sincronizando Tudo...
                </>
              ) : (
                <>
                  <ArrowPathIcon className="w-4 h-4" />
                  Sincronizar Tudo
                </>
              )}
            </button>
            <button
              onClick={() => setShowScrapeModal(true)}
              disabled={syncingAllAtacadao || scraping}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              Coletar Uma Categoria
            </button>
          </div>
        </div>
      </div>

      {/* Seção Central de Fluxo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ações Rápidas */}
        <div className="lg:col-span-2 flex flex-col gap-4 text-left">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Atividades Principais</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Ação 1: Comparar */}
            <div
              onClick={() => onNavigate('comparison')}
              className="group p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:border-indigo-500 hover:shadow-md cursor-pointer transition-all duration-200 flex flex-col justify-between min-h-[140px]"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-200 shrink-0">
                  <ScaleIcon className="w-5 h-5" />
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                    Montar Lista de Compras
                  </h4>
                  <p className="text-xs text-slate-500 leading-normal">
                    Adicione itens à lista e veja qual dos dois mercados compensa mais.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 mt-2">
                <span>Ir para Comparação</span>
                {comparisonItemCount > 0 && (
                  <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ml-1">
                    {comparisonItemCount} {comparisonItemCount === 1 ? 'item' : 'itens'}
                  </span>
                )}
                <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform ml-auto" />
              </div>
            </div>

            {/* Ação 2: Scanner */}
            <div
              onClick={() => onNavigate('scanner')}
              className="group p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:border-emerald-500 hover:shadow-md cursor-pointer transition-all duration-200 flex flex-col justify-between min-h-[140px]"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-200 shrink-0">
                  <DocumentTextIcon className="w-5 h-5" />
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="font-bold text-slate-900 text-sm group-hover:text-emerald-600 transition-colors">
                    Escanear Última Compra
                  </h4>
                  <p className="text-xs text-slate-500 leading-normal">
                    Leia o QR Code do cupom fiscal da SEFAZ para carregar os produtos automaticamente.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 mt-2">
                <span>Escanear Cupom</span>
                <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Ação 3: Catálogo */}
            <div
              onClick={() => onNavigate('catalog')}
              className="group p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:border-blue-500 hover:shadow-md cursor-pointer transition-all duration-200 flex flex-col justify-between min-h-[140px] sm:col-span-2"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 flex items-center justify-center bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors duration-200 shrink-0">
                  <ShoppingCartIcon className="w-5 h-5" />
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                    Catálogo Unificado
                  </h4>
                  <p className="text-xs text-slate-500 leading-normal">
                    Navegue e explore todos os produtos atualmente cadastrados, pesquise preços e veja o catálogo completo.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 mt-2">
                <span>Ver Catálogo Geral</span>
                <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>

        {/* Resumo da Última Comparação */}
        <div className="flex flex-col gap-4 text-left">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Última Comparação</h3>
          {lastComparison ? (
            <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 shadow-sm border border-slate-800 flex flex-col justify-between h-full">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Resultado</span>
                  <span className="text-[10px] px-2 py-0.5 bg-indigo-500/20 text-indigo-300 font-bold rounded border border-indigo-400/20">
                    {lastComparison.comparedItems.length} Itens
                  </span>
                </div>

                <div className="pt-2">
                  <span className="text-xs text-slate-400">Melhor opção de compra:</span>
                  <div className="text-lg font-extrabold mt-1 text-emerald-400 flex items-center gap-1">
                    🎉 {lastComparison.resumo.melhorOpcao === 'atacadao' ? 'Atacadão' : lastComparison.resumo.melhorOpcao === 'bigmaster' ? 'BigMaster' : 'Empate!'}
                  </div>
                </div>

                <div className="space-y-2 border-t border-slate-800 pt-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Total Atacadão:</span>
                    <span className="font-mono font-bold">R$ {lastComparison.resumo.totalAtacadao.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Total BigMaster:</span>
                    <span className="font-mono font-bold">R$ {lastComparison.resumo.totalBigMaster.toFixed(2)}</span>
                  </div>
                  {lastComparison.resumo.economiaTotal > 0 && (
                    <div className="flex justify-between text-xs pt-2 border-t border-slate-800/50">
                      <span className="text-emerald-400 font-bold">Economia Estimada:</span>
                      <span className="text-emerald-400 font-mono font-extrabold">
                        R$ {lastComparison.resumo.economiaTotal.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => onNavigate('comparison')}
                className="mt-6 w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold border border-slate-700 cursor-pointer transition-colors"
              >
                Reabrir Análise Completa
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center h-full text-slate-400 min-h-[200px]">
              <span className="text-3xl mb-2">⚖️</span>
              <p className="text-xs font-semibold leading-relaxed max-w-[200px] mx-auto">
                Nenhuma comparação ativa. Adicione itens para calcular.
              </p>
              <button
                onClick={() => onNavigate('comparison')}
                className="mt-4 text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
              >
                Iniciar Comparação →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal do Scraper Atacadão */}
      {showScrapeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden text-left transform transition-all duration-300">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <CircleStackIcon className="w-5 h-5 text-blue-600" />
                Coletar Preços do Atacadão
              </h3>
              <button
                onClick={() => {
                  setShowScrapeModal(false)
                  setScrapeError(null)
                  setScrapeSuccess(null)
                }}
                className="text-slate-400 hover:bg-slate-100 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRunScrape} className="p-5 flex flex-col gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 leading-relaxed">
                ℹ️ O scraping lê a API GraphQL oficial do Atacadão e atualiza nosso banco MySQL local.
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-500">Categoria Geral (Nível 1)</label>
                <select
                  required
                  value={cat1}
                  onChange={(e) => setCat1(e.target.value)}
                  className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all bg-white"
                >
                  {Object.keys(atacadaoCategories).map((c) => (
                    <option key={c} value={c}>
                      {c.replace(/-/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-500">Subcategoria (Nível 2)</label>
                <select
                  required
                  value={cat2}
                  onChange={(e) => setCat2(e.target.value)}
                  className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all bg-white"
                  disabled={!atacadaoCategories[cat1] || atacadaoCategories[cat1].length === 0}
                >
                  {atacadaoCategories[cat1] && atacadaoCategories[cat1].length > 0 ? (
                    atacadaoCategories[cat1].map((sc) => (
                      <option key={sc} value={sc}>
                        {sc.replace(/-/g, ' ')}
                      </option>
                    ))
                  ) : (
                    <option value="">Sem subcategorias</option>
                  )}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-500">Número Máximo de Páginas</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={pages}
                  onChange={(e) => setPages(Number(e.target.value))}
                  className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={scraping}
                className="mt-2 w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {scraping ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    Coletando dados da Web...
                  </>
                ) : (
                  'Iniciar Coleta'
                )}
              </button>

              {scrapeError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-200 text-xs font-semibold mt-2">
                  ❌ {scrapeError}
                </div>
              )}

              {scrapeSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 text-xs font-semibold mt-2">
                  ✅ {scrapeSuccess}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
