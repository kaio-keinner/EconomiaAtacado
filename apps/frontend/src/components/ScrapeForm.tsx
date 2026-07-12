import { useState, type FormEvent } from 'react'
import { triggerScrape } from '../api/client'

export function ScrapeForm({ onScrapeComplete }: { onScrapeComplete: () => void }) {
  const [categoria1, setCategoria1] = useState('')
  const [categoria2, setCategoria2] = useState('')
  const [maxPaginas, setMaxPaginas] = useState(1)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro(null)
    setSucesso(null)
    try {
      const res = await triggerScrape({ categoria1, categoria2, maxPaginas })
      setSucesso(`Scrape concluído com sucesso! Total de produtos salvos/atualizados: ${res.total}`)
      onScrapeComplete()
    } catch (err: any) {
      setErro(err.message || 'Não foi possível concluir o scrape. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="scrape-card">
      <h2 className="card-title">Nova Coleta</h2>
      <form onSubmit={handleSubmit} className="scrape-form">
        <div className="form-group">
          <label className="form-label">Categoria Nível 1</label>
          <input
            className="form-input"
            placeholder="Ex: pet-shop"
            value={categoria1}
            onChange={(e) => setCategoria1(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Categoria Nível 2</label>
          <input
            className="form-input"
            placeholder="Ex: acessorios-pet-shop"
            value={categoria2}
            onChange={(e) => setCategoria2(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Máximo de Páginas</label>
          <input
            className="form-input"
            type="number"
            min={1}
            max={20}
            value={maxPaginas}
            onChange={(e) => setMaxPaginas(Number(e.target.value))}
            required
          />
        </div>
        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? (
            <span className="spinner-container">
              <span className="spinner"></span> Coletando...
            </span>
          ) : 'Iniciar Scrape'}
        </button>
      </form>
      {erro && <div className="alert alert-error">{erro}</div>}
      {sucesso && <div className="alert alert-success">{sucesso}</div>}
    </div>
  )
}
