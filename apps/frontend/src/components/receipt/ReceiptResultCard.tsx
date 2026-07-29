import { type Receipt } from '../../api/client'
import { DocumentTextIcon, ScaleIcon } from '@heroicons/react/24/outline'

interface ReceiptResultCardProps {
  receipt: Receipt
  onSendToComparer?: (items: Array<{ nome: string; quantidade: number; precoOriginal?: number }>) => void
}

export function ReceiptResultCard({ receipt, onSendToComparer }: ReceiptResultCardProps) {
  const handleSend = () => {
    if (!onSendToComparer) return
    const mapped = receipt.itens.map((item) => ({
      nome: item.nome,
      quantidade: item.quantidade,
      precoOriginal: item.precoTotal,
    }))
    onSendToComparer(mapped)
  }

  return (
    <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-5 flex flex-col gap-4 text-left">
      <div className="flex items-center justify-between border-b border-blue-100 pb-3">
        <div>
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
            <DocumentTextIcon className="w-4 h-4 text-blue-600" />
            {receipt.estabelecimento}
          </h3>
          <p className="text-xs text-gray-500">Chave: {receipt.chaveAcesso}</p>
        </div>
        <span className="text-sm font-extrabold text-blue-700">
          R$ {receipt.valorTotal.toFixed(2)}
        </span>
      </div>

      <div className="max-h-60 overflow-y-auto flex flex-col gap-1.5 pr-1">
        {receipt.itens.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs bg-white p-2 rounded border border-gray-100">
            <div className="flex flex-col">
              <span className="font-semibold text-gray-800">{item.nome}</span>
              <span className="text-gray-400 text-[10px]">
                {item.quantidade} {item.unidade} x R$ {item.precoUnitario.toFixed(2)}
              </span>
            </div>
            <span className="font-bold text-gray-700">R$ {item.precoTotal.toFixed(2)}</span>
          </div>
        ))}
      </div>

      {onSendToComparer && (
        <button
          onClick={handleSend}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
        >
          <ScaleIcon className="w-4 h-4" /> Enviar Itens deste Cupom para Comparação
        </button>
      )}
    </div>
  )
}
