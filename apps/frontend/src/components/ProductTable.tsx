import { useState, useMemo } from 'react'

export interface Product {
  id: number
  sku: string | null
  nome: string
  marca: string | null
  disponivel: boolean
  precoVarejo: number | null
  precoAtacado: number | null
  quantidadeMinimaAtacado: number | null
  imagemUrl: string | null
}

export function ProductTable({ products }: { products: Product[] }) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products
    const lower = searchTerm.toLowerCase()
    return products.filter((p) => 
      p.nome.toLowerCase().includes(lower) || 
      (p.marca && p.marca.toLowerCase().includes(lower)) ||
      (p.sku && p.sku.toLowerCase().includes(lower))
    )
  }, [products, searchTerm])

  if (products.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon">📦</span>
        <p className="empty-text">Nenhum produto cadastrado no banco de dados.</p>
        <p className="empty-subtext">Preencha o formulário acima e inicie uma coleta para carregar dados do Atacadão.</p>
      </div>
    )
  }

  return (
    <div className="table-card">
      <div className="table-header">
        <h2 className="card-title">Produtos Coletados ({filteredProducts.length})</h2>
        <div className="search-box">
          <input
            className="search-input"
            placeholder="Filtrar por nome, marca ou SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-search" onClick={() => setSearchTerm('')}>
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="table-wrapper">
        <table className="product-table">
          <thead>
            <tr>
              <th>Imagem</th>
              <th>Produto</th>
              <th>Marca / SKU</th>
              <th className="text-right">Preço Varejo</th>
              <th className="text-right">Preço Atacado</th>
              <th className="text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p) => (
              <tr key={p.id} className={!p.disponivel ? 'tr-unavailable' : ''}>
                <td className="td-img">
                  {p.imagemUrl ? (
                    <img className="product-img" src={p.imagemUrl} alt={p.nome} loading="lazy" />
                  ) : (
                    <div className="product-img-fallback">📷</div>
                  )}
                </td>
                <td className="td-name">
                  <div className="product-name" title={p.nome}>{p.nome}</div>
                </td>
                <td className="td-meta">
                  <div className="product-brand">{p.marca ?? '-'}</div>
                  <div className="product-sku">SKU: {p.sku ?? 'N/A'}</div>
                </td>
                <td className="td-price text-right">
                  {p.precoVarejo ? `R$ ${p.precoVarejo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                </td>
                <td className="td-price text-right">
                  {p.precoAtacado ? (
                    <div>
                      <div className="wholesale-price">
                        R$ {p.precoAtacado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="wholesale-min">
                        Mín. {p.quantidadeMinimaAtacado} un.
                      </div>
                    </div>
                  ) : '-'}
                </td>
                <td className="td-status text-center">
                  <span className={`status-badge ${p.disponivel ? 'status-in-stock' : 'status-out'}`}>
                    {p.disponivel ? 'Disponível' : 'Indisponível'}
                  </span>
                </td>
              </tr>
            ))}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={6} className="no-results text-center">
                  Nenhum produto corresponde à busca "{searchTerm}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
