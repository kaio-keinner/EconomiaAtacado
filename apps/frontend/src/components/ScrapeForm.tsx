import { useState, useEffect, type FormEvent } from 'react'
import { triggerScrape } from '../api/client'
import { useJobPolling } from '../hooks/useJobPolling'
import { ArrowPathIcon } from '@heroicons/react/24/outline'

export function ScrapeForm({ onScrapeComplete }: { onScrapeComplete: () => void }) {
  const [categoria1, setCategoria1] = useState('')
  const [categoria2, setCategoria2] = useState('')
  const [maxPaginas, setMaxPaginas] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)

  const { status, progress, result, error: jobError, startPolling } = useJobPolling(1500)

  const isLoading = isSubmitting || status === 'queued' || status === 'running'

  useEffect(() => {
    if (status === 'completed') {
      onScrapeComplete()
    }
  }, [status, onScrapeComplete])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setInitError(null)

    try {
      const res = await triggerScrape({ categoria1, categoria2, maxPaginas })
      if (res.jobId) {
        startPolling(res.jobId)
      } else {
        onScrapeComplete()
      }
    } catch (err: any) {
      setInitError(err.message || 'Não foi possível iniciar o scrape. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const finalError = initError || jobError

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <h2 className="text-base font-bold text-gray-900 mb-4 text-left">Nova Coleta</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-gray-500">Categoria Nível 1</label>
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
            placeholder="Ex: pet-shop"
            value={categoria1}
            onChange={(e) => setCategoria1(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-gray-500">Categoria Nível 2</label>
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
            placeholder="Ex: acessorios-pet-shop"
            value={categoria2}
            onChange={(e) => setCategoria2(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-gray-500">Máximo de Páginas</label>
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
            type="number"
            min={1}
            max={20}
            value={maxPaginas}
            onChange={(e) => setMaxPaginas(Number(e.target.value))}
            required
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-1.5 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
              {status === 'running' ? 'Processando em segundo plano...' : 'Iniciando...'}
            </>
          ) : (
            'Iniciar Scrape'
          )}
        </button>
      </form>

      {progress && (
        <div className="p-3 rounded-lg text-xs font-medium border mt-4 bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-2">
          <ArrowPathIcon className="w-4 h-4 animate-spin flex-shrink-0" />
          <span>{progress}</span>
        </div>
      )}

      {finalError && (
        <div className="p-4 rounded-lg text-xs font-semibold border mt-4 bg-red-50 text-red-700 border-red-200">
          {finalError}
        </div>
      )}

      {status === 'completed' && (
        <div className="p-4 rounded-lg text-xs font-semibold border mt-4 bg-emerald-50 text-emerald-700 border-emerald-200">
          Scrape concluído com sucesso! {result?.total ? `Total de produtos salvos/atualizados: ${result.total}` : ''}
        </div>
      )}
    </div>
  )
}

