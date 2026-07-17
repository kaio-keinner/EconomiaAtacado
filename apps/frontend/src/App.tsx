import { useEffect, useState, useCallback } from 'react'
import {
  fetchProducts,
  fetchProductStats,
  syncBigMaster,
  syncBigMasterImages,
  type MarketStats,
  type ComparisonResult,
  type ComparisonItem,
  LAST_COMPARISON_KEY,
} from './api/client'
import { WelcomeScreen } from './components/WelcomeScreen'
import { ComparisonDashboard } from './components/ComparisonDashboard'
import { ProductCatalog } from './components/ProductCatalog'
import { ReceiptScanner } from './components/ReceiptScanner'
import {
  HomeIcon,
  ShoppingCartIcon,
  DocumentTextIcon,
  ScaleIcon,
  CircleStackIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import './App.css'

type AppView = 'welcome' | 'catalog' | 'scanner' | 'comparison'

function loadLastComparison(): ComparisonResult | null {
  try {
    const raw = sessionStorage.getItem(LAST_COMPARISON_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('welcome')
  const [comparisonItems, setComparisonItems] = useState<ComparisonItem[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [lastComparison, setLastComparison] = useState<ComparisonResult | null>(loadLastComparison)

  const [products, setProducts] = useState<Awaited<ReturnType<typeof fetchProducts>>['products']>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState<string | null>(null)

  const [productStats, setProductStats] = useState<Record<string, MarketStats> | null>(null)

  const [syncingBigMaster, setSyncingBigMaster] = useState(false)
  const [syncingImages, setSyncingImages] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  const loadProducts = useCallback(async () => {
    setProductsLoading(true)
    setProductsError(null)
    try {
      const data = await fetchProducts()
      setProducts(data.products ?? [])
    } catch (err: any) {
      setProductsError(err.message || 'Erro ao carregar produtos.')
    } finally {
      setProductsLoading(false)
    }
  }, [])

  const loadStats = useCallback(async () => {
    try {
      const data = await fetchProductStats()
      setProductStats(data.stats)
    } catch (err) {
      console.error('Erro ao buscar estatísticas:', err)
    }
  }, [])



  useEffect(() => {
    loadProducts()
    loadStats()
  }, [loadProducts, loadStats])

  const refreshAll = useCallback(async () => {
    await Promise.all([loadProducts(), loadStats()])
  }, [loadProducts, loadStats])

  const navigateTo = (view: AppView) => {
    setCurrentView(view)
    if (window.innerWidth <= 768) setSidebarOpen(false)
  }

  const handleAddToComparison = (productName: string, preco?: number) => {
    setComparisonItems((prev) => {
      const exists = prev.some((item) => item.nome.toLowerCase() === productName.toLowerCase())
      if (exists) return prev
      return [...prev, { nome: productName, quantidade: 1, precoOriginal: preco }]
    })
  }

  const handleRemoveFromComparison = (productName: string) => {
    setComparisonItems((prev) => prev.filter((item) => item.nome.toLowerCase() !== productName.toLowerCase()))
  }

  const handleSyncBigMaster = async () => {
    setSyncingBigMaster(true)
    setSyncMessage('Sincronizando produtos BigMaster...')
    try {
      const res = await syncBigMaster()
      setSyncMessage(`Sucesso! ${res.totalSalvo} produtos sincronizados.`)
      await refreshAll()
      setTimeout(() => setSyncMessage(null), 5000)
    } catch (err: any) {
      setSyncMessage(`Erro: ${err.message}`)
    } finally {
      setSyncingBigMaster(false)
    }
  }

  const handleSyncBigMasterImages = async () => {
    setSyncingImages(true)
    setSyncMessage('Baixando e cacheando imagens do BigMaster localmente...')
    try {
      const res = await syncBigMasterImages()
      setSyncMessage(`Sucesso! ${res.baixados} imagens baixadas de ${res.total} produtos (Erros: ${res.erros}).`)
      await refreshAll()
      setTimeout(() => setSyncMessage(null), 6000)
    } catch (err: any) {
      setSyncMessage(`Erro ao baixar imagens: ${err.message}`)
    } finally {
      setSyncingImages(false)
    }
  }

  const handleSendToComparer = (items: ComparisonItem[]) => {
    setComparisonItems(items)
    setCurrentView('comparison')
    if (window.innerWidth <= 768) setSidebarOpen(false)
  }

  // Atualiza resumo da última comparação quando sessionStorage muda
  useEffect(() => {
    const interval = setInterval(() => {
      const latest = loadLastComparison()
      setLastComparison((prev) => {
        if (JSON.stringify(prev) !== JSON.stringify(latest)) return latest
        return prev
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const navItems: { view: AppView; label: string; icon: typeof HomeIcon; badge?: number }[] = [
    { view: 'welcome', label: 'Painel', icon: HomeIcon },
    { view: 'catalog', label: 'Catálogo', icon: ShoppingCartIcon },
    { view: 'comparison', label: 'Lista de Compras', icon: ScaleIcon, badge: comparisonItems.length || undefined },
    { view: 'scanner', label: 'Escanear Cupom', icon: DocumentTextIcon },
  ]

  const pageHeaders: Record<AppView, { title: string; subtitle: string; icon: typeof HomeIcon }> = {
    welcome: { title: 'Painel', subtitle: 'Status das sincronizações e ações rápidas', icon: HomeIcon },
    catalog: { title: 'Catálogo', subtitle: 'Produtos dos dois mercados', icon: ShoppingCartIcon },
    comparison: { title: 'Lista de Compras', subtitle: 'Monte sua lista e compare preços', icon: ScaleIcon },
    scanner: { title: 'Escanear Cupom', subtitle: 'Importe itens via QR Code do cupom fiscal', icon: DocumentTextIcon },
  }

  const header = pageHeaders[currentView]
  const HeaderIcon = header.icon

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row text-gray-900 font-sans">
      <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm shrink-0">
        <button
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          onClick={() => setSidebarOpen(true)}
        >
          <Bars3Icon className="w-6 h-6" />
        </button>
        <div className="flex flex-col text-right">
          <h2 className="text-sm font-bold text-gray-900">Comparador de Preços</h2>
          <p className="text-[10px] text-gray-500">BigMaster vs Atacadão</p>
        </div>
      </header>

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 h-16 shrink-0">
          <div className="flex items-center gap-2.5">
            <CircleStackIcon className="w-6 h-6 text-blue-600" />
            <span className="text-lg font-bold text-gray-900">Comparador</span>
          </div>
          <button
            className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            onClick={() => setSidebarOpen(false)}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto px-3 space-y-1">
          {navItems.map(({ view, label, icon: Icon, badge }) => (
            <button
              key={view}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                currentView === view ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              onClick={() => navigateTo(view)}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="font-semibold flex-1 text-left">{label}</span>
              {badge != null && badge > 0 && (
                <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200 bg-gray-50 mt-auto shrink-0">
          <div className="flex items-center gap-2.5 text-xs font-semibold text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
            <span className="truncate">MySQL Local Conectado</span>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)}></div>
      )}

      <main className="flex-grow p-6 md:p-8 overflow-y-auto min-h-[calc(100vh-64px)] md:min-h-screen bg-gray-50 flex flex-col gap-6">
        <div className="flex items-center gap-4 pb-4 border-b border-gray-200 shrink-0">
          <span className="w-10 h-10 flex items-center justify-center bg-blue-50 border border-blue-200 rounded-lg shrink-0">
            <HeaderIcon className="w-5 h-5 text-blue-600" />
          </span>
          <div className="flex flex-col">
            <h3 className="text-lg font-bold text-gray-900 leading-tight">{header.title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{header.subtitle}</p>
          </div>
        </div>

        {currentView === 'welcome' && (
          <WelcomeScreen
            onNavigate={navigateTo}
            productStats={productStats}
            comparisonItemCount={comparisonItems.length}
            lastComparison={lastComparison}
            onSyncBigMaster={handleSyncBigMaster}
            syncingBigMaster={syncingBigMaster}
            onSyncBigMasterImages={handleSyncBigMasterImages}
            syncingImages={syncingImages}
            syncMessage={syncMessage}
            onScrapeComplete={refreshAll}
          />
        )}

        {currentView === 'catalog' && (
          <>
            {productsError && (
              <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 text-sm font-semibold">{productsError}</div>
            )}
            {productsLoading && products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white border border-gray-200 rounded-xl gap-3 text-gray-500">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="font-semibold text-sm">Carregando produtos...</p>
              </div>
            ) : (
              <ProductCatalog
                products={products}
                comparisonItems={comparisonItems}
                onAddToComparison={handleAddToComparison}
                onRemoveFromComparison={handleRemoveFromComparison}
              />
            )}
          </>
        )}

        {currentView === 'scanner' && (
          <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <ReceiptScanner onSendToComparer={handleSendToComparer} />
          </section>
        )}

        {currentView === 'comparison' && (
          <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <ComparisonDashboard
              items={comparisonItems}
              onItemsChange={setComparisonItems}
              allProducts={products}
            />
          </section>
        )}
      </main>
    </div>
  )
}
