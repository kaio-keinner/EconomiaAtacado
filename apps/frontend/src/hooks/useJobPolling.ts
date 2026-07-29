import { useState, useEffect, useRef } from 'react'
import { fetchJobStatus } from '../api/client'

interface UseJobPollingReturn {
  status: 'idle' | 'queued' | 'running' | 'completed' | 'failed'
  progress: string | null
  result: any
  error: string | null
  startPolling: (jobId: string) => void
  reset: () => void
}

export function useJobPolling(intervalMs = 2000): UseJobPollingReturn {
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'queued' | 'running' | 'completed' | 'failed'>('idle')
  const [progress, setProgress] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const pollingRef = useRef<number | null>(null)

  const reset = () => {
    setJobId(null)
    setStatus('idle')
    setProgress(null)
    setResult(null)
    setError(null)
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  const startPolling = (newJobId: string) => {
    reset()
    setJobId(newJobId)
    setStatus('queued')
  }

  useEffect(() => {
    if (!jobId) return
    if (status === 'completed' || status === 'failed') return

    const poll = async () => {
      try {
        const job = await fetchJobStatus(jobId)
        setStatus(job.status)
        setProgress(job.progress ? String(job.progress) : null)
        
        if (job.status === 'completed') {
          setResult(job.result)
          if (pollingRef.current) window.clearInterval(pollingRef.current)
        } else if (job.status === 'failed') {
          setError(job.error || 'Job falhou desconhecidamente')
          if (pollingRef.current) window.clearInterval(pollingRef.current)
        }
      } catch (err: any) {
        setError(err.message || 'Erro ao consultar status do job')
        setStatus('failed')
        if (pollingRef.current) window.clearInterval(pollingRef.current)
      }
    }

    // Polling imediato e em seguida com setInterval
    poll()
    pollingRef.current = window.setInterval(poll, intervalMs)

    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [jobId, status, intervalMs])

  return { status, progress, result, error, startPolling, reset }
}
