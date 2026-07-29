import { useState, useEffect, useRef } from 'react'
import jsQR from 'jsqr'
import { scanReceipt, fetchReceipts, type Receipt } from '../api/client'
import { useJobPolling } from '../hooks/useJobPolling'
import {
  FolderIcon,
  CameraIcon,
  PencilSquareIcon,
  ArrowUpTrayIcon,
  DocumentTextIcon,
  ScaleIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'

type ScanPhase = 'idle' | 'decoding' | 'consulting' | 'processing' | 'done'

interface ReceiptScannerProps {
  onSendToComparer?: (items: Array<{ nome: string; quantidade: number; precoOriginal?: number }>) => void
}

export function ReceiptScanner({ onSendToComparer }: ReceiptScannerProps) {
  const [activeInputMethod, setActiveInputMethod] = useState<'camera' | 'upload' | 'manual'>('upload')
  const [chaveAcesso, setChaveAcesso] = useState('')
  const [loading, setLoading] = useState(false)
  const [scanPhase, setScanPhase] = useState<ScanPhase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [currentReceipt, setCurrentReceipt] = useState<Receipt | null>(null)
  const [history, setHistory] = useState<Receipt[]>([])
  const [cameraActive, setCameraActive] = useState(false)

  const { status: jobStatus, result: jobResult, error: jobError } = useJobPolling(1500)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameIdRef = useRef<number | null>(null)

  const loadHistory = async () => {
    try {
      const data = await fetchReceipts()
      setHistory(data.receipts || [])
    } catch (err: any) {
      console.error('Erro ao carregar histórico:', err)
    }
  }

  useEffect(() => {
    loadHistory()
    return () => stopCamera()
  }, [])

  useEffect(() => {
    if (jobStatus === 'running' || jobStatus === 'queued') {
      setScanPhase('processing')
    } else if (jobStatus === 'completed' && jobResult) {
      const receiptData = jobResult.receipt || jobResult
      if (receiptData) {
        setCurrentReceipt(receiptData)
        setSuccess(`${jobResult.mensagem || 'Cupom importado com sucesso!'} — ${receiptData.itens?.length || 0} itens encontrados.`)
      }
      setScanPhase('done')
      setLoading(false)
      loadHistory()
      setTimeout(() => setScanPhase('idle'), 2000)
    } else if (jobStatus === 'failed') {
      setError(jobError || 'Falha no processamento do cupom.')
      setScanPhase('idle')
      setLoading(false)
    }
  }, [jobStatus, jobResult, jobError])

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(audioCtx.destination)
      oscillator.type = 'sine'
      oscillator.frequency.value = 1200
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime)
      oscillator.start()
      setTimeout(() => {
        oscillator.stop()
        audioCtx.close()
      }, 120)
    } catch (e) {
      console.warn('Erro ao reproduzir beep:', e)
    }
  }

  const startCamera = async () => {
    setError(null)
    setCameraActive(true)
    try {
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true })
      }
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', 'true')
        videoRef.current.play()
        animationFrameIdRef.current = requestAnimationFrame(scanFrame)
      }
    } catch (err: any) {
      setCameraActive(false)
      setError('Não foi possível acessar a câmera. Verifique as permissões do navegador.')
      console.error(err)
    }
  }

  const stopCamera = () => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current)
      animationFrameIdRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
  }

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current || !cameraActive) return
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (ctx && video.readyState === video.HAVE_CURRENT_DATA) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' })
      if (code) {
        playBeep()
        stopCamera()
        handleScanSubmit(code.data)
        return
      }
    }
    if (streamRef.current) {
      animationFrameIdRef.current = requestAnimationFrame(scanFrame)
    }
  }

  const handleScanSubmit = async (value: string) => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    setScanPhase('consulting')
    try {
      setScanPhase('processing')
      const res = await scanReceipt({ chaveAcesso: value, qrCodeUrl: value })
      setCurrentReceipt(res.receipt)
      setSuccess(`${res.mensagem || 'Cupom importado!'} — ${res.receipt.itens.length} itens encontrados.`)
      setScanPhase('done')
      loadHistory()
    } catch (err: any) {
      setError(err.message || 'Falha ao importar cupom fiscal.')
      setScanPhase('idle')
    } finally {
      setLoading(false)
      setTimeout(() => setScanPhase('idle'), 2000)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setError(null)
    setSuccess(null)
    setScanPhase('decoding')

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          setError('Erro ao iniciar o decodificador de imagem.')
          setLoading(false)
          setScanPhase('idle')
          return
        }
        const maxDim = 1000
        let w = img.width
        let h = img.height
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = (maxDim / w) * h
            w = maxDim
          } else {
            w = (maxDim / h) * w
            h = maxDim
          }
        }
        canvas.width = w
        canvas.height = h
        ctx.drawImage(img, 0, 0, w, h)
        const imageData = ctx.getImageData(0, 0, w, h)
        const code = jsQR(imageData.data, imageData.width, imageData.height)
        if (code) {
          playBeep()
          handleScanSubmit(code.data)
        } else {
          setLoading(false)
          setScanPhase('idle')
          setError('QR Code não encontrado na imagem. Tente uma foto mais nítida ou digite a chave manualmente.')
        }
      }
      img.onerror = () => {
        setError('Falha ao processar a imagem.')
        setLoading(false)
        setScanPhase('idle')
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const prefillExampleKey = () => {
    setChaveAcesso('51260719300772000843650010002465571284548371')
  }

  const sendToComparer = (receipt: Receipt) => {
    if (!onSendToComparer) return
    const items = receipt.itens.map((item) => ({
      nome: item.nome,
      quantidade: item.quantidade,
      precoOriginal: item.precoUnitario,
    }))
    onSendToComparer(items)
  }



  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start w-full">
      <div className="flex flex-col gap-6 text-left">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-gray-900">Escanear Nota Fiscal</h2>
          <p className="text-xs text-gray-500 mt-1 mb-4">
            Importe itens e preços do cupom fiscal (NFC-e) via QR Code.
          </p>

          <div className="grid grid-cols-3 bg-gray-100 p-1 rounded-full border border-gray-200 mb-6">
            {(
              [
                ['upload', FolderIcon, 'Enviar Imagem'],
                ['camera', CameraIcon, 'Câmera ao Vivo'],
                ['manual', PencilSquareIcon, 'Digitar Chave'],
              ] as const
            ).map(([method, Icon, label]) => (
              <button
                key={method}
                className={`w-full flex items-center justify-center gap-1.5 py-2 px-1 text-xs font-semibold rounded-full transition-colors cursor-pointer ${
                  activeInputMethod === method ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-gray-200'
                }`}
                onClick={() => {
                  stopCamera()
                  if (method === 'camera') {
                    setActiveInputMethod('camera')
                    startCamera()
                  } else {
                    setActiveInputMethod(method)
                  }
                }}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          <div className="mt-2">
            {activeInputMethod === 'upload' && (
              <div className="flex flex-col gap-4">
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 bg-gray-50 hover:bg-blue-50/30 hover:border-blue-500 cursor-pointer transition-all">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <ArrowUpTrayIcon className="w-8 h-8 text-gray-400" />
                    <span className="text-sm font-bold text-gray-700">Clique ou arraste a foto do QR Code aqui</span>
                    <span className="text-xs text-gray-400">JPG, PNG, WEBP</span>
                  </div>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={loading} />
                </label>
              </div>
            )}

            {activeInputMethod === 'camera' && (
              <div className="flex flex-col gap-4">
                <div className="relative aspect-square w-full max-w-sm mx-auto overflow-hidden bg-black rounded-xl border border-gray-800">
                  <video ref={videoRef} className="w-full h-full object-cover" style={{ display: cameraActive ? 'block' : 'none' }} />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  {!cameraActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-gray-500">
                      <CameraIcon className="w-12 h-12 text-gray-600" />
                      <button
                        onClick={startCamera}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        Ativar Câmera
                      </button>
                    </div>
                  )}
                  {cameraActive && (
                    <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none">
                      <div className="w-full text-center text-white text-[10px] bg-black/40 py-1 rounded">Lendo QR Code...</div>
                      <div className="w-1/2 aspect-square max-w-[200px] border-2 border-blue-500 rounded-lg self-center shadow-[0_0_0_2000px_rgba(0,0,0,0.6)]"></div>
                      <p className="text-center text-white text-xs bg-black/40 py-1 rounded">Aponte para o QR Code do cupom</p>
                    </div>
                  )}
                </div>
                {cameraActive && (
                  <button
                    onClick={stopCamera}
                    className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-colors cursor-pointer"
                  >
                    Desativar Câmera
                  </button>
                )}
              </div>
            )}

            {activeInputMethod === 'manual' && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500">Chave de Acesso (44 dígitos)</label>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none"
                    placeholder="Ex: 5126 0719 3007 7200 0843..."
                    maxLength={55}
                    value={chaveAcesso}
                    onChange={(e) => setChaveAcesso(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleScanSubmit(chaveAcesso)}
                    disabled={loading || !chaveAcesso.trim()}
                    className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {loading ? 'Processando...' : 'Consultar Chave'}
                  </button>
                  <button
                    onClick={prefillExampleKey}
                    type="button"
                    className="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 rounded-lg text-sm font-bold cursor-pointer"
                  >
                    Chave de Exemplo
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Feedback de progresso */}
          {loading && (
            <div className="p-5 rounded-2xl border mt-4 bg-slate-50 text-slate-800 border-slate-200 text-left space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0"></div>
                <span className="text-sm font-bold text-slate-900">Importação em Andamento</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                  <span className="text-slate-500 line-through">1. Decodificar QR Code</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${scanPhase === 'consulting' ? 'bg-blue-600 animate-pulse' : scanPhase === 'processing' || scanPhase === 'done' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                  <span className={scanPhase === 'consulting' ? 'font-bold text-blue-600 animate-pulse' : scanPhase === 'processing' || scanPhase === 'done' ? 'text-slate-500 line-through' : 'text-slate-400'}>
                    2. Consultar nota fiscal na SEFAZ
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${scanPhase === 'processing' ? 'bg-blue-600 animate-pulse' : scanPhase === 'done' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                  <span className={scanPhase === 'processing' ? 'font-bold text-blue-600 animate-pulse' : scanPhase === 'done' ? 'text-slate-500' : 'text-slate-400'}>
                    3. Processar e indexar itens para comparação
                  </span>
                </div>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 rounded-xl text-xs font-bold border mt-4 bg-red-50 text-red-700 border-red-200">
              ❌ {error}
            </div>
          )}
          {success && !loading && (
            <div className="p-4 rounded-xl text-xs font-bold border mt-4 bg-emerald-50 text-emerald-800 border-emerald-200 flex items-center gap-2.5">
              <CheckIcon className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{success}</span>
            </div>
          )}
        </div>

        {/* Histórico */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-gray-900">Cupons Importados ({history.length})</h2>
          {history.length === 0 ? (
            <p className="text-xs text-gray-400 italic mt-3">Nenhum cupom escaneado ainda.</p>
          ) : (
            <div className="space-y-3 mt-4 overflow-y-auto max-h-[360px] pr-1">
              {history.map((h) => (
                <div
                  key={h.id}
                  className={`flex flex-col gap-2 p-4 border rounded-lg bg-white hover:bg-gray-50 hover:border-blue-500 cursor-pointer transition-all ${
                    currentReceipt?.id === h.id ? 'border-2 border-blue-500 bg-blue-50/20' : 'border-gray-200'
                  }`}
                  onClick={() => setCurrentReceipt(h)}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-900">{h.estabelecimento}</span>
                    <span className="text-gray-400 font-medium">{new Date(h.dataEmissao).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-mono text-[10px]">
                      {h.itens.length} itens · ...{h.chaveAcesso.slice(-8)}
                    </span>
                    <span className="font-extrabold text-gray-900 text-sm">
                      R$ {h.valorTotal.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  {onSendToComparer && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        sendToComparer(h)
                      }}
                      className="mt-1 w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                    >
                      <ScaleIcon className="w-3.5 h-3.5" />
                      Analisar Preços
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Coluna direita */}
      <div className="flex flex-col gap-4 text-left">
        {currentReceipt ? (
          <>
            {/* Resumo dos itens importados */}
            <div className="bg-white border border-emerald-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-3">
                Itens Importados ({currentReceipt.itens.length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
                {currentReceipt.itens.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-100 last:border-0">
                    <span className="font-semibold text-gray-800 truncate flex-1 mr-2">{item.nome}</span>
                    <span className="text-gray-500 shrink-0">{item.quantidade}x</span>
                    <span className="font-bold text-gray-900 shrink-0 ml-2 w-20 text-right">
                      R$ {item.precoTotal.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-200">
                <span>Total do cupom</span>
                <span>R$ {currentReceipt.valorTotal.toFixed(2).replace('.', ',')}</span>
              </div>

              {onSendToComparer && (
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md transition-colors cursor-pointer mt-4"
                  onClick={() => sendToComparer(currentReceipt)}
                >
                  <ScaleIcon className="w-5 h-5 shrink-0" />
                  Analisar Preços nos Mercados
                </button>
              )}
            </div>

            {/* Cupom térmico */}
            <div className="bg-amber-50/15 border border-gray-400 text-black font-mono text-[11px] p-6 shadow-md relative leading-tight max-w-md mx-auto w-full">
              <div className="absolute top-0 left-0 w-full h-1 border-t-2 border-dashed border-gray-400"></div>
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <h3 className="font-bold text-sm leading-tight">{currentReceipt.estabelecimento}</h3>
                  {currentReceipt.cnpj && <p className="text-[10px] text-gray-500">CNPJ: {currentReceipt.cnpj}</p>}
                  <p className="text-[9px] text-gray-500">Documento Auxiliar da NFC-e</p>
                  <div className="border-t border-dashed border-gray-400 my-2"></div>
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-12 font-bold text-gray-700 border-b border-dashed border-gray-400 pb-1">
                    <span className="col-span-6">DESCRIÇÃO</span>
                    <span className="col-span-2 text-center">QTD</span>
                    <span className="col-span-2 text-right">VL UN</span>
                    <span className="col-span-2 text-right">TOTAL</span>
                  </div>
                  {currentReceipt.itens.map((item, idx) => (
                    <div key={idx} className="border-b border-dashed border-gray-200 pb-1.5 last:border-b-0">
                      <div className="font-bold text-gray-900">{item.nome}</div>
                      <div className="grid grid-cols-12 mt-0.5 text-gray-600">
                        <span className="col-span-6"></span>
                        <span className="col-span-2 text-center">
                          {item.quantidade} {item.unidade}
                        </span>
                        <span className="col-span-2 text-right">R$ {item.precoUnitario.toFixed(2).replace('.', ',')}</span>
                        <span className="col-span-2 text-right font-bold text-gray-900">
                          R$ {item.precoTotal.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-dashed border-gray-400 my-2"></div>
                <div className="flex justify-between font-bold text-sm">
                  <span>VALOR A PAGAR R$</span>
                  <span>{currentReceipt.valorTotal.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="text-center text-[10px] text-gray-500">
                  <p className="font-mono tracking-wider bg-gray-50 border border-gray-200 py-1 px-2 rounded mt-1">
                    {currentReceipt.chaveAcesso.replace(/(\d{4})/g, '$1 ')}
                  </p>
                  <span className="flex items-center justify-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 py-1 px-3 rounded border border-emerald-200 mt-2">
                    <CheckIcon className="w-3.5 h-3.5 shrink-0" />
                    AUTORIZADO SEFAZ
                  </span>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 w-full h-1 border-b-2 border-dashed border-gray-400"></div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-24 bg-white border border-gray-200 rounded-xl px-6">
            <DocumentTextIcon className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-base font-bold text-gray-800">Visualização do Cupom</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-xs leading-relaxed">
              Escaneie um QR Code ou selecione um cupom no histórico para importar os itens.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
