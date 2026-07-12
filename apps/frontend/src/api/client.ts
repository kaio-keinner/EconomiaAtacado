const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3334/api`

export async function fetchProducts(params: { categoria1?: string; categoria2?: string } = {}) {
  const query = new URLSearchParams()
  if (params.categoria1) query.set('categoria1', params.categoria1)
  if (params.categoria2) query.set('categoria2', params.categoria2)

  const res = await fetch(`${API_URL}/products?${query.toString()}`)
  if (!res.ok) throw new Error('Falha ao buscar produtos')
  return res.json()
}

export async function triggerScrape(params: {
  categoria1: string
  categoria2: string
  maxPaginas?: number
}) {
  const res = await fetch(`${API_URL}/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Falha ao iniciar scrape')
  }
  return res.json()
}

export interface ReceiptItem {
  codigo: string
  nome: string
  quantidade: number
  unidade: string
  precoUnitario: number
  desconto: number
  precoTotal: number
}

export interface Receipt {
  id: number
  chaveAcesso: string
  estabelecimento: string
  cnpj: string | null
  dataEmissao: string
  valorTotal: number
  formaPagamento: string | null
  consumidorCpf: string | null
  consumidorNome: string | null
  itens: ReceiptItem[]
  createdAt: string
  updatedAt: string
}

export async function fetchReceipts(): Promise<{ receipts: Receipt[] }> {
  const res = await fetch(`${API_URL}/receipts`)
  if (!res.ok) throw new Error('Falha ao buscar cupons fiscais')
  return res.json()
}

export async function scanReceipt(params: { chaveAcesso?: string; qrCodeUrl?: string }): Promise<{
  mensagem: string
  receipt: Receipt
}> {
  const res = await fetch(`${API_URL}/receipts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Falha ao processar cupom fiscal')
  }
  return res.json()
}

