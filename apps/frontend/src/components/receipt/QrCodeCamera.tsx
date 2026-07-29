import { useEffect, useRef } from 'react'
import jsQR from 'jsqr'
import { CameraIcon } from '@heroicons/react/24/outline'

interface QrCodeCameraProps {
  onScan: (codeData: string) => void
  onClose: () => void
}

export function QrCodeCamera({ onScan, onClose }: QrCodeCameraProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number | null>(null)

  useEffect(() => {
    let active = true

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        if (!active) return
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.setAttribute('playsinline', 'true')
          videoRef.current.play()
          requestAnimationFrame(scanFrame)
        }
      } catch (e) {
        console.error('Erro ao acessar câmera:', e)
      }
    }

    function scanFrame() {
      if (!videoRef.current || !canvasRef.current) return
      if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const canvas = canvasRef.current
        const video = videoRef.current
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          })
          if (code) {
            onScan(code.data)
            return
          }
        }
      }
      if (streamRef.current) {
        animFrameRef.current = requestAnimationFrame(scanFrame)
      }
    }

    startCamera()

    return () => {
      active = false
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }
  }, [onScan])

  return (
    <div className="relative border border-gray-300 rounded-xl overflow-hidden bg-black flex flex-col items-center justify-center p-4 min-h-[300px]">
      <video ref={videoRef} className="w-full max-h-[350px] object-cover rounded-lg" />
      <canvas ref={canvasRef} className="hidden" />
      <div className="absolute inset-0 border-2 border-dashed border-blue-400 m-8 rounded-lg pointer-events-none flex items-center justify-center">
        <span className="bg-black/60 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
          <CameraIcon className="w-4 h-4 animate-pulse" /> Aponte para o QR Code
        </span>
      </div>
      <button
        onClick={onClose}
        className="absolute top-3 right-3 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-xs font-bold shadow cursor-pointer"
      >
        Fechar Câmera
      </button>
    </div>
  )
}
