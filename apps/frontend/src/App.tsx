import { useEffect, useState, useCallback } from 'react'
import { fetchProducts, fetchReceipts, type Receipt } from './api/client'
import { ScrapeForm } from './components/ScrapeForm'
import { ProductTable, type Product } from './components/ProductTable'
import { ReceiptScanner } from './components/ReceiptScanner'
import { WelcomeScreen } from './components/WelcomeScreen'
import './App.css'

export default function App() {
  const [currentView, setCurrentView] = useState<'welcome' | 'extractor' | 'scanner'>('welcome')
  const [sidebarOpen, setSidebarOpen] = useState(true) // Abre por padrão para dar destaque visual
  const [roadmapExpanded, setRoadmapExpanded] = useState(true) // Abre dropdown de Estoque/Roadmap por padrão
  
  // Dados do Extrator Atacadão
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState<string | null>(null)

  // Dados do Leitor de Cupom
  const [receipts, setReceipts] = useState<Receipt[]>([])

  // Carrega produtos do Atacadão
  const loadProducts = useCallback(async () => {
    setProductsLoading(true)
    setProductsError(null)
    try {
      const data = await fetchProducts()
      setProducts(data.products ?? [])
    } catch (err: any) {
      setProductsError(err.message || 'Erro ao carregar lista de produtos.')
    } finally {
      setProductsLoading(false)
    }
  }, [])

  // Carrega histórico de Notas Fiscais
  const loadReceipts = useCallback(async () => {
    try {
      const data = await fetchReceipts()
      setReceipts(data.receipts ?? [])
    } catch (err: any) {
      console.error('Erro ao buscar histórico de recibos:', err)
    }
  }, [])

  // Carrega tudo na inicialização
  useEffect(() => {
    loadProducts()
    loadReceipts()
  }, [loadProducts, loadReceipts])

  // Estatísticas computadas para a tela de boas-vindas
  const appStats = {
    totalProducts: products.length,
    totalReceipts: receipts.length,
    totalSpent: receipts.reduce((acc, r) => acc + (r.valorTotal || 0), 0)
  }

  // Atalho de navegação fechando sidebar no mobile
  const navigateTo = (view: 'welcome' | 'extractor' | 'scanner') => {
    setCurrentView(view)
    if (window.innerWidth <= 768) {
      setSidebarOpen(false)
    }
  }

  return (
    <div className="app-layout">
      {/* Top Header persistente estilo do exemplo do usuário */}
      <header className="app-top-header">
        <button 
          className="sidebar-toggle-btn-top" 
          onClick={() => setSidebarOpen(true)}
          title="Abrir Menu"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="top-header-text-group">
          <h2 className="top-header-title">Coletor Pro</h2>
          <p className="top-header-subtitle">Painel de controle e inteligência de mercado</p>
        </div>
      </header>

      {/* Menu Lateral (Sidebar) estilo Fábrica de Escovas */}
      <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-group">
            {/* Ícone de fábrica/painel em azul */}
            <svg className="logo-svg-blue" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18" />
              <path d="M3 7v14h18V7" />
              <path d="M9 21V11h6v10" />
              <path d="m3 7 9-4 9 4" />
            </svg>
            <span className="sidebar-title-blue">Coletor Pro</span>
          </div>
          {/* Botão X para fechar o menu */}
          <button 
            className="sidebar-close-btn" 
            onClick={() => setSidebarOpen(false)} 
            title="Fechar Menu"
          >
            ✕
          </button>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${currentView === 'welcome' ? 'active' : ''}`}
            onClick={() => navigateTo('welcome')}
          >
            <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="9" />
              <rect x="14" y="3" width="7" height="5" />
              <rect x="14" y="12" width="7" height="9" />
              <rect x="3" y="16" width="7" height="5" />
            </svg>
            <span className="nav-text">Dashboard</span>
          </button>
          
          <button
            className={`nav-item ${currentView === 'extractor' ? 'active' : ''}`}
            onClick={() => navigateTo('extractor')}
          >
            <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            <span className="nav-text">Extrator Atacadão</span>
          </button>

          <button
            className={`nav-item ${currentView === 'scanner' ? 'active' : ''}`}
            onClick={() => navigateTo('scanner')}
          >
            <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" />
              <path d="M16 8h-6a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h4a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H8" />
              <path d="M12 5v14" />
            </svg>
            <span className="nav-text">Leitor de Cupom NFC-e</span>
          </button>

          {/* Grupo com Dropdown: ROADMAP (ESTOQUE) */}
          <div className="nav-category-wrapper">
            <button 
              className="nav-category-header" 
              onClick={() => setRoadmapExpanded(!roadmapExpanded)}
            >
              <span className="category-title-text">ROADMAP / FUTURO</span>
              <svg className={`chevron-icon-svg ${roadmapExpanded ? 'expanded' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            
            {roadmapExpanded && (
              <div className="nav-category-sublist">
                <button className="nav-item sub-item disabled" disabled>
                  <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                  <span className="nav-text">Analytics Preços</span>
                </button>
                <button className="nav-item sub-item disabled" disabled>
                  <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                  </svg>
                  <span className="nav-text">Lista Otimizada</span>
                </button>
              </div>
            )}
          </div>

          <button className="nav-item disabled" disabled>
            <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
            <span className="nav-text">Minha Conta</span>
          </button>

          <button className="nav-item disabled" disabled>
            <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span className="nav-text">Configurações</span>
          </button>

          <button className="nav-item disabled" disabled>
            <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
              <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
            </svg>
            <span className="nav-text">Banco & Backup</span>
          </button>
        </nav>

        {/* Rodapé do Menu com Pulse de Status */}
        <div className="sidebar-footer">
          <div className="status-indicator">
            <span className="status-pulse-green"></span>
            <span className="status-text">SQLite Local Conectado</span>
          </div>
        </div>
      </aside>

      {/* Overlay de desfoque/sombra idêntico ao do exemplo */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* Conteúdo Principal com cabeçalho de página customizado */}
      <main className="app-content-body-drawer">
        {currentView === 'welcome' && (
          <>
            <div className="page-view-header">
              <span className="page-header-icon-blue">🏠</span>
              <div className="page-header-text">
                <h3 className="page-header-title">Dashboard</h3>
                <p className="page-header-subtitle">Visão geral da plataforma e estatísticas</p>
              </div>
            </div>
            <WelcomeScreen onNavigate={navigateTo} stats={appStats} />
          </>
        )}

        {currentView === 'extractor' && (
          <>
            <div className="page-view-header">
              <span className="page-header-icon-blue">📦</span>
              <div className="page-header-text">
                <h3 className="page-header-title">Extrator Atacadão</h3>
                <p className="page-header-subtitle">Pesquise e gerencie informações de produtos</p>
              </div>
            </div>
            
            <div className="extractor-view-grid">
              <section className="control-panel">
                <ScrapeForm onScrapeComplete={loadProducts} />
              </section>

              <section className="results-panel">
                {productsError && <div className="error-banner">{productsError}</div>}
                {productsLoading && products.length === 0 ? (
                  <div className="table-loading">
                    <div className="spinner"></div>
                    <p>Carregando produtos...</p>
                  </div>
                ) : (
                  <ProductTable products={products} />
                )}
              </section>
            </div>
          </>
        )}

        {currentView === 'scanner' && (
          <>
            <div className="page-view-header">
              <span className="page-header-icon-blue">🧾</span>
              <div className="page-header-text">
                <h3 className="page-header-title">Leitor de Cupom Fiscal</h3>
                <p className="page-header-subtitle">Importe notas fiscais digitalizadas e leia seus itens</p>
              </div>
            </div>
            <section className="scanner-panel">
              <ReceiptScanner />
            </section>
          </>
        )}
      </main>
    </div>
  )
}
