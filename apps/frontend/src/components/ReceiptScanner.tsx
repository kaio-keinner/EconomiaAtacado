import { useState, useEffect, useRef } from 'react'
import jsQR from 'jsqr'
import { scanReceipt, fetchReceipts, type Receipt } from '../api/client'

export function ReceiptScanner() {
  const [activeInputMethod, setActiveInputMethod] = useState<'camera' | 'upload' | 'manual'>('upload')
  const [chaveAcesso, setChaveAcesso] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [currentReceipt, setCurrentReceipt] = useState<Receipt | null>(null)
  const [history, setHistory] = useState<Receipt[]>([])
  
  // Webcam scan states
  const [cameraActive, setCameraActive] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameIdRef = useRef<number | null>(null)

  // Carrega histórico de notas fiscais
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
  }, [])

  // Para a câmera ao desmontar ou mudar de aba
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioCtx.destination)
      
      oscillator.type = 'sine'
      oscillator.frequency.value = 1200 // Beep agudo de scanner
      
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

  // Lógica de câmera e escaneamento QR Code
  const startCamera = async () => {
    setError(null)
    setCameraActive(true)
    try {
      let stream: MediaStream
      try {
        // Tenta primeiro a câmera traseira (ideal para ler QR Code no celular)
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
      } catch (fallbackErr) {
        console.warn('Câmera traseira não disponível, tentando câmera padrão:', fallbackErr)
        // Fallback para qualquer câmera disponível (notebooks/desktops)
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        })
      }
      
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', 'true') // iOS fix
        videoRef.current.play()
        animationFrameIdRef.current = requestAnimationFrame(scanFrame)
      }
    } catch (err: any) {
      setCameraActive(false)
      setError('Não foi possível acessar a câmera. Certifique-se de que possui uma webcam conectada e deu permissão no navegador.')
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
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      })

      if (code) {
        // Encontrou QR Code!
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

  // Lógica de envio da chave ou QR URL
  const handleScanSubmit = async (value: string) => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await scanReceipt({ chaveAcesso: value, qrCodeUrl: value })
      setSuccess(res.mensagem || 'Cupom fiscal importado com sucesso!')
      setCurrentReceipt(res.receipt)
      loadHistory()
    } catch (err: any) {
      setError(err.message || 'Falha ao importar cupom fiscal.')
    } finally {
      setLoading(false)
    }
  };

  // Upload de Imagem contendo QR Code
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          setError('Erro ao iniciar o decodificador de imagem.')
          setLoading(false)
          return
        }

        // Limita tamanho para não sobrecarregar
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
          setError(
            'Não foi possível encontrar um QR Code legível na imagem. Tente tirar uma foto mais aproximada e focada, ou digite a chave de acesso manualmente.'
          )
        }
      }
      img.onerror = () => {
        setError('Falha ao processar a imagem do upload.')
        setLoading(false)
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  // Preenche a chave do cupom da foto de exemplo
  const prefillExampleKey = () => {
    setChaveAcesso('51260719300772000843650010002465571284548371')
  }

  return (
    <div className="scanner-container-grid">
      {/* Coluna Esquerda: Controles de Input */}
      <div className="scanner-controls-panel">
        <div className="scrape-card">
          <h2 className="card-title">Escanear Nota Fiscal</h2>
          <p className="card-desc">Colete automaticamente itens e preços de compras através do QR Code do Cupom Fiscal (NFC-e).</p>
          
          {/* Abas de método de input */}
          <div className="input-method-tabs">
            <button
              className={`method-tab-btn ${activeInputMethod === 'upload' ? 'active' : ''}`}
              onClick={() => {
                stopCamera()
                setActiveInputMethod('upload')
              }}
            >
              📁 Enviar Imagem
            </button>
            <button
              className={`method-tab-btn ${activeInputMethod === 'camera' ? 'active' : ''}`}
              onClick={() => {
                setActiveInputMethod('camera')
                startCamera()
              }}
            >
              📷 Câmera ao Vivo
            </button>
            <button
              className={`method-tab-btn ${activeInputMethod === 'manual' ? 'active' : ''}`}
              onClick={() => {
                stopCamera()
                setActiveInputMethod('manual')
              }}
            >
              ⌨️ Digitar Chave
            </button>
          </div>

          <div className="input-method-content">
            {/* Método: Imagem */}
            {activeInputMethod === 'upload' && (
              <div className="upload-zone">
                <label className="upload-dropzone">
                  <div className="dropzone-inner">
                    <span className="upload-icon">📤</span>
                    <span className="dropzone-text">Clique ou arraste a foto do QR Code aqui</span>
                    <span className="dropzone-subtext">Formatos aceitos: JPG, PNG, WEBP</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="file-input-hidden"
                    disabled={loading}
                  />
                </label>
                
                <div className="example-hint-box">
                  <p>💡 <strong>Dica de Teste:</strong> Faça o download e envie a imagem do cupom de exemplo que você enviou no chat para ver a decodificação real funcionar.</p>
                </div>
              </div>
            )}

            {/* Método: Câmera */}
            {activeInputMethod === 'camera' && (
              <div className="camera-zone">
                <div className="video-viewport">
                  <video ref={videoRef} className="video-element" style={{ display: cameraActive ? 'block' : 'none' }} />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  
                  {!cameraActive && (
                    <div className="camera-offline">
                      <span className="camera-offline-icon">📷</span>
                      <button onClick={startCamera} className="submit-btn" style={{ width: 'auto' }}>
                        Ativar Câmera
                      </button>
                    </div>
                  )}
                  {cameraActive && (
                    <div className="scanner-target-overlay">
                      <div className="scanner-laser-line"></div>
                      <div className="scanner-target-box"></div>
                      <p className="scanner-tip">Aponte a câmera para o QR Code impresso no cupom</p>
                    </div>
                  )}
                </div>
                {cameraActive && (
                  <button onClick={stopCamera} className="submit-btn stop-btn">
                    Desativar Câmera
                  </button>
                )}
              </div>
            )}

            {/* Método: Manual */}
            {activeInputMethod === 'manual' && (
              <div className="manual-zone">
                <div className="form-group">
                  <label className="form-label">Chave de Acesso (44 dígitos)</label>
                  <input
                    className="form-input"
                    placeholder="Ex: 5126 0719 3007 7200 0843..."
                    maxLength={55} // Permite espaços
                    value={chaveAcesso}
                    onChange={(e) => setChaveAcesso(e.target.value)}
                  />
                </div>
                
                <div className="button-group-row">
                  <button
                    onClick={() => handleScanSubmit(chaveAcesso)}
                    disabled={loading || !chaveAcesso.trim()}
                    className="submit-btn"
                  >
                    {loading ? 'Processando...' : 'Consultar Chave'}
                  </button>
                  
                  <button
                    onClick={prefillExampleKey}
                    type="button"
                    className="secondary-btn"
                  >
                    Usar Chave de Exemplo
                  </button>
                </div>

                <div className="example-hint-box">
                  <p>📝 A chave de exemplo corresponde ao cupom impresso na foto (Lenço Mundo Bita + Energético Monster).</p>
                </div>
              </div>
            )}
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
        </div>

        {/* Lista de Histórico */}
        <div className="scrape-card history-card">
          <h2 className="card-title">Cupons Importados ({history.length})</h2>
          {history.length === 0 ? (
            <p className="empty-history-text">Nenhum cupom escaneado ainda nesta sessão.</p>
          ) : (
            <div className="history-list">
              {history.map((h) => (
                <div
                  key={h.id}
                  className={`history-item ${currentReceipt?.id === h.id ? 'active' : ''}`}
                  onClick={() => setCurrentReceipt(h)}
                >
                  <div className="history-item-header">
                    <span className="history-store-name">{h.estabelecimento}</span>
                    <span className="history-date">
                      {new Date(h.dataEmissao).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className="history-item-footer">
                    <span className="history-key-sub">Chave: ...{h.chaveAcesso.slice(-8)}</span>
                    <span className="history-price">R$ {h.valorTotal.toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Coluna Direita: Exibição do Recibo (Thermal Paper) */}
      <div className="receipt-view-panel">
        {currentReceipt ? (
          <div className="receipt-thermal-paper">
            {/* Efeito Serrilhado Superior */}
            <div className="receipt-serrated-edge-top"></div>
            
            <div className="receipt-inner">
              <div className="receipt-header">
                <h3 className="receipt-store-title">{currentReceipt.estabelecimento}</h3>
                {currentReceipt.cnpj && <p className="receipt-meta">CNPJ: {currentReceipt.cnpj}</p>}
                <p className="receipt-meta">Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica</p>
                <div className="receipt-divider-dashed"></div>
              </div>

              {/* Tabela de Itens */}
              <div className="receipt-items-table">
                <div className="receipt-table-row receipt-table-header">
                  <span className="col-desc">CÓD / DESCRIÇÃO</span>
                  <span className="col-qty text-center">QTD UN</span>
                  <span className="col-price text-right">VL UN</span>
                  <span className="col-total text-right">VL LIQ</span>
                </div>
                
                {currentReceipt.itens.map((item, idx) => (
                  <div key={idx} className="receipt-item-row">
                    <div className="receipt-item-line1">
                      <span className="receipt-item-code">{item.codigo}</span>
                      <span className="receipt-item-desc">{item.nome}</span>
                    </div>
                    <div className="receipt-item-line2">
                      <span className="col-desc"></span>
                      <span className="col-qty text-center">{item.quantidade} {item.unidade}</span>
                      <span className="col-price text-right">R$ {item.precoUnitario.toFixed(2).replace('.', ',')}</span>
                      <span className="col-total text-right">R$ {item.precoTotal.toFixed(2).replace('.', ',')}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="receipt-divider-dashed"></div>

              {/* Totais */}
              <div className="receipt-totals-section">
                <div className="totals-row">
                  <span>Qtde. total de itens</span>
                  <span>{currentReceipt.itens.reduce((acc, curr) => acc + curr.quantidade, 0)}</span>
                </div>
                <div className="totals-row font-bold">
                  <span>VALOR A PAGAR R$</span>
                  <span>{currentReceipt.valorTotal.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="totals-row">
                  <span>Forma Pagto:</span>
                  <span>{currentReceipt.formaPagamento || 'N/A'}</span>
                </div>
                <div className="totals-row font-bold">
                  <span>VALOR PAGO R$</span>
                  <span>{currentReceipt.valorTotal.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>

              <div className="receipt-divider-dashed"></div>

              {/* Consulta Sefaz */}
              <div className="receipt-sefaz-section">
                <p className="sefaz-text-bold">Consulte pela Chave de Acesso em</p>
                <p className="sefaz-url">http://www.sefaz.{currentReceipt.cnpj ? 'mt' : 'sp'}.gov.br/nfce/consultanfce</p>
                <p className="sefaz-key">
                  {currentReceipt.chaveAcesso.replace(/(\d{4})/g, '$1 ')}
                </p>
              </div>

              {/* Consumidor */}
              {currentReceipt.consumidorCpf && (
                <>
                  <div className="receipt-divider-dashed"></div>
                  <div className="receipt-consumer-section">
                    <p className="consumer-title">CONSUMIDOR</p>
                    <p>CPF: {currentReceipt.consumidorCpf}</p>
                    {currentReceipt.consumidorNome && <p>NOME: {currentReceipt.consumidorNome}</p>}
                  </div>
                </>
              )}

              <div className="receipt-divider-dashed"></div>

              {/* NFC-e details */}
              <div className="receipt-footer-meta text-center">
                <p>NFC-e nº {currentReceipt.id} Série 001</p>
                <p>Data de Emissão: {new Date(currentReceipt.dataEmissao).toLocaleString('pt-BR')}</p>
                <div className="receipt-badge-authorized">
                  ✓ PROTOCOLO DE AUTORIZAÇÃO SEFAZ
                </div>
              </div>
            </div>

            {/* Efeito Serrilhado Inferior */}
            <div className="receipt-serrated-edge-bottom"></div>
          </div>
        ) : (
          <div className="receipt-placeholder-card">
            <span className="placeholder-icon">🧾</span>
            <h3>Visualização do Cupom</h3>
            <p>Escaneie um QR code ou selecione um cupom no histórico para visualizar os itens e valores impressos.</p>
          </div>
        )}
      </div>
    </div>
  )
}
