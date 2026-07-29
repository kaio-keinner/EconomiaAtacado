const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3334/api`

export interface JobStatus {
  id: string
  type: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  progress: any
  result: any
  error: string | null
  createdAt: string
  finishedAt: string | null
}

export async function fetchJobStatus(jobId: string): Promise<JobStatus> {
  const res = await fetch(`${API_URL}/jobs/${jobId}`)
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Falha ao buscar status do job')
  }
  return res.json()
}

export async function fetchProducts(params: { categoria1?: string; categoria2?: string; origem?: string; busca?: string } = {}) {
  const query = new URLSearchParams()
  if (params.categoria1) query.set('categoria1', params.categoria1)
  if (params.categoria2) query.set('categoria2', params.categoria2)
  if (params.origem) query.set('origem', params.origem)
  if (params.busca) query.set('busca', params.busca)

  const res = await fetch(`${API_URL}/products?${query.toString()}`)
  if (!res.ok) throw new Error('Falha ao buscar produtos')
  const json = await res.json()
  // AdonisJS serialize() wraps the response in { data: { ... } }
  return json.data ?? json
}


export interface MarketStats {
  total: number
  ultimaAtualizacao: string | null
  categorias: string[]
  totalCategorias?: number
}

export type ComparisonItem = {
  nome: string
  quantidade: number
  precoOriginal?: number
}

export const LAST_COMPARISON_KEY = 'produtos-app:last-comparison'

export async function fetchProductStats(): Promise<{ stats: Record<string, MarketStats> }> {
  const res = await fetch(`${API_URL}/products/stats`)
  if (!res.ok) throw new Error('Falha ao buscar estatísticas')
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

export async function syncBigMaster(): Promise<{ mensagem: string; totalRecebido?: number; totalSalvo?: number; total?: number; salvos?: number; result?: any; dataPromocao?: string }> {
  const res = await fetch(`${API_URL}/bigmaster/sync`, {
    method: 'POST'
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    const errMsg = errorData.errors?.[0]?.message || errorData.error || errorData.detalhes || errorData.mensagem || 'Falha ao sincronizar BigMaster'
    throw new Error(errMsg)
  }
  return res.json()
}

export interface ComparedItem {
  nomeOriginal: string
  quantidade: number
  precoOriginal?: number
  atacadao: {
    id: number
    externalId: string
    nome: string
    preco: number
    marca: string | null
    imagemUrl: string | null
    quantidadeMinimaAtacado?: number
  } | null
  bigmaster: {
    id: number
    externalId: string
    nome: string
    preco: number
    marca: string | null
    imagemUrl: string | null
  } | null
}

export interface ComparisonResult {
  comparedItems: ComparedItem[]
  resumo: {
    totalAtacadao: number
    totalBigMaster: number
    economiaTotal: number
    melhorOpcao: 'atacadao' | 'bigmaster' | 'empate'
  }
}

export async function compareList(items: Array<{ nome: string; quantidade: number; precoOriginal?: number }>): Promise<ComparisonResult> {
  const res = await fetch(`${API_URL}/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Falha ao processar comparação de preços')
  }
  return res.json()
}

export async function syncBigMasterImages(): Promise<{ mensagem: string; total: number; baixados: number; erros: number }> {
  const res = await fetch(`${API_URL}/bigmaster/sync-images`, {
    method: 'POST'
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Falha ao sincronizar imagens do BigMaster')
  }
  return res.json()
}

export async function fetchAtacadaoCategories(): Promise<Record<string, string[]>> {
  const res = await fetch(`${API_URL}/atacadao/categories`)
  if (!res.ok) {
    throw new Error('Falha ao buscar as categorias do Atacadão')
  }
  return res.json()
}

export async function syncAllAtacadao(params: { maxPaginas: number }): Promise<{
  mensagem: string
  totalSalvosGlobal: number
  relatorio: Array<{ cat1: string; cat2: string; total: number; erro?: string }>
}> {
  const res = await fetch(`${API_URL}/atacadao/sync-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || errorData.mensagem || 'Falha na sincronização em lote do Atacadão')
  }
  return res.json()
}

export function getImageUrl(url: string | null): string | null {
  if (!url) return null
  // Se a URL já for absoluta (S3, R2, CDN), retorna direto
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  // Fallback: imagens locais do backend (modo disco)
  const backendBase = API_URL.replace('/api', '')
  return `${backendBase}${url}`
}

export interface ShoppingListItemData {
  id?: number
  nome: string
  quantidade: number
  precoOriginal?: number
}

export interface ShoppingListData {
  id: number
  userId: number
  nome: string
  items: ShoppingListItemData[]
  createdAt: string
  updatedAt: string
}

export async function fetchShoppingLists(): Promise<{ lists: ShoppingListData[] }> {
  const res = await fetch(`${API_URL}/shopping-lists`)
  if (!res.ok) throw new Error('Falha ao buscar listas de compras')
  return res.json()
}

export async function createShoppingList(data: {
  nome: string
  items?: Array<{ nome: string; quantidade: number; precoOriginal?: number }>
}): Promise<{ mensagem: string; list: ShoppingListData }> {
  const res = await fetch(`${API_URL}/shopping-lists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Falha ao criar lista de compras')
  }
  return res.json()
}

export async function deleteShoppingList(id: number): Promise<{ mensagem: string }> {
  const res = await fetch(`${API_URL}/shopping-lists/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Falha ao deletar lista de compras')
  }
  return res.json()
}

export async function compareShoppingList(id: number): Promise<{
  listId: number
  nome: string
  comparison: ComparisonResult
}> {
  const res = await fetch(`${API_URL}/shopping-lists/${id}/compare`, {
    method: 'POST',
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Falha ao comparar lista de compras')
  }
  return res.json()
}

export interface UserSubscription {
  id: number
  userId: number
  plan: 'free' | 'pro'
  status: 'active' | 'canceled' | 'past_due' | 'incomplete'
  currentPeriodEnd: string | null
}

export interface SubscriptionResponse {
  subscription: UserSubscription
  limits: {
    plan: 'free' | 'pro'
    isPro: boolean
    maxLists: number
    unlimitedSync: boolean
  }
}

export async function fetchMySubscription(): Promise<SubscriptionResponse> {
  const res = await fetch(`${API_URL}/subscriptions/me`)
  if (!res.ok) throw new Error('Falha ao buscar dados da assinatura')
  return res.json()
}

export async function createCheckoutSession(params: { successUrl?: string; cancelUrl?: string } = {}): Promise<{
  checkoutUrl?: string
  simulated?: boolean
  mensagem?: string
  subscription?: UserSubscription
}> {
  const res = await fetch(`${API_URL}/subscriptions/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Falha ao iniciar checkout da assinatura')
  }
  return res.json()
}





