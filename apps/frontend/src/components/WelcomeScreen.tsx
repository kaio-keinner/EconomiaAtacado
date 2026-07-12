interface WelcomeScreenProps {
  onNavigate: (view: 'extractor' | 'scanner') => void
  stats: {
    totalProducts: number
    totalReceipts: number
    totalSpent: number
  }
}

export function WelcomeScreen({ onNavigate, stats }: WelcomeScreenProps) {
  return (
    <div className="welcome-container">
      {/* Banner de Boas-vindas */}
      <div className="welcome-hero-card">
        <div className="welcome-hero-content">
          <span className="welcome-hero-badge">PAINEL DE CONTROLE</span>
          <h2 className="welcome-hero-title">Bem-vindo ao Coletor Pro</h2>
          <p className="welcome-hero-desc">
            Sua plataforma centralizada de inteligência de varejo e controle fiscal. Colete preços de concorrentes e gerencie suas compras em um só lugar.
          </p>
        </div>
        <div className="welcome-hero-icon">⚡</div>
      </div>

      {/* Grid de Estatísticas Gerais */}
      <div className="welcome-stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper p-products">📦</div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalProducts}</span>
            <span className="stat-label">Produtos Indexados</span>
            <span className="stat-sublabel">Atacadão GraphQL Engine</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper p-receipts">🧾</div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalReceipts}</span>
            <span className="stat-label">Cupons Escaneados</span>
            <span className="stat-sublabel">Notas Fiscais Consumidor</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper p-spent">💰</div>
          <div className="stat-info">
            <span className="stat-value">
              R$ {stats.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="stat-label">Despesa Acumulada</span>
            <span className="stat-sublabel">Soma de cupons importados</span>
          </div>
        </div>
      </div>

      {/* Ações Rápidas */}
      <h3 className="section-title">Ações Rápidas</h3>
      <div className="welcome-actions-grid">
        <div className="action-card" onClick={() => onNavigate('extractor')}>
          <div className="action-card-header">
            <span className="action-card-icon">📦</span>
            <h4 className="action-card-title">Extrator Atacadão</h4>
          </div>
          <p className="action-card-desc">
            Faça pesquisas automáticas no portal Atacadão. Extraia informações de novos produtos, preços de atacado, varejo e status de disponibilidade por categoria.
          </p>
          <span className="action-card-link">Acessar Extrator →</span>
        </div>

        <div className="action-card" onClick={() => onNavigate('scanner')}>
          <div className="action-card-header">
            <span className="action-card-icon">🧾</span>
            <h4 className="action-card-title">Leitor de Cupom Fiscal</h4>
          </div>
          <p className="action-card-desc">
            Escaneie cupons fiscais (NFC-e) usando a câmera de seu aparelho ou fazendo upload do QR Code. Guarde e analise os produtos e valores de suas notas de compras.
          </p>
          <span className="action-card-link">Acessar Leitor →</span>
        </div>
      </div>

      {/* Expansão e Futuros Módulos */}
      <h3 className="section-title">Roadmap da Plataforma (Módulos Futuros)</h3>
      <div className="welcome-future-grid">
        <div className="future-card">
          <span className="future-status">EM DESENVOLVIMENTO</span>
          <span className="future-icon">📈</span>
          <h5 className="future-title">Histórico & Analytics de Preços</h5>
          <p className="future-desc">
            Gráficos comparativos de variação de preços de concorrentes ao longo das semanas, prevendo tendências de inflação e ofertas sazonais.
          </p>
        </div>

        <div className="future-card">
          <span className="future-status">EM BREVE</span>
          <span className="future-icon">🛒</span>
          <h5 className="future-title">Lista de Compras Otimizada</h5>
          <p className="future-desc">
            Crie sua lista de compras semanal e deixe o sistema sugerir qual atacado ou supermercado local possui o menor custo total com base no histórico de cupons.
          </p>
        </div>

        <div className="future-card">
          <span className="future-status">PLANEJADO</span>
          <span className="future-icon">🔔</span>
          <h5 className="future-title">Alertas de Preço Alvo</h5>
          <p className="future-desc">
            Seja notificado automaticamente quando o preço de um item específico no Atacadão cair abaixo do valor estipulado no seu perfil.
          </p>
        </div>
      </div>
    </div>
  )
}
