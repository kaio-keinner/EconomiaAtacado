import { getAuthToken } from '../contexts/AuthContext'

const BASE_URL = (import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3334`).replace(/\/api\/?$/, '')
const API_URL = `${BASE_URL}/api`

// ─── Authenticated Fetch Wrapper ─────────────────────────────────────────────
/**
 * Wrapper around fetch that automatically injects the Authorization header
 * and handles 401 responses by clearing the token and redirecting to login.
 */
async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken()
  const headers = new Headers(options.headers || {})

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(url, { ...options, headers })

  if (res.status === 401) {
    // Dispatch event so AuthContext can clear state
    window.dispatchEvent(new Event('auth:unauthorized'))
    throw new Error('Sessão expirada. Faça login novamente.')
  }

  return res
}

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Promoções & Insights (Bloco 3) ─────────────────────────────────────────

export interface PromotionItem {
  id: number
  nome: string
  origem: string
  imagemUrl: string | null
  precoAtual: number
  precoReferencia: number
  descontoPercentual: number
  economiaReais: number
  diasEmPromocao: number
  sparkline: { dia: string; preco: number }[]
}

export interface ProductInsights {
  produto: {
    id: number
    nome: string
    origem: string
    precoAtual: number | null
    precoReferencia: number | null
    emPromocao: boolean
  }
  series: {
    atacadao: { dia: string; preco: number | null }[]
    bigmaster: { dia: string; preco: number | null }[]
  }
  resumo: {
    menorPreco: number | null
    maiorPreco: number | null
    precoAtual: number | null
    variacaoPercentual: number | null
  }
}

export interface BasketIndexEntry {
  dia: string
  indice: number
  produtosConsiderados: number
}

export interface BasketIndexResponse {
  atacadao: BasketIndexEntry[]
  bigmaster: BasketIndexEntry[]
}

// ─── Price Alerts (Bloco 4) ─────────────────────────────────────────────────

export interface PriceAlert {
  id: number
  productId: number
  tipo: 'abaixo_de' | 'qualquer_queda'
  precoAlvo: number | null
  ativo: boolean
  ultimoDisparoEm: string | null
  produto?: { id: number; nome: string; precoVarejo: number | null; imagemUrl: string | null }
  createdAt: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const LAST_COMPARISON_KEY = 'produtos-app:last-comparison'

// ─── API Functions ───────────────────────────────────────────────────────────

export async function fetchJobStatus(jobId: string): Promise<JobStatus> {
  const res = await apiFetch(`${API_URL}/jobs/${jobId}`)
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

  const res = await apiFetch(`${API_URL}/products?${query.toString()}`)
  if (!res.ok) throw new Error('Falha ao buscar produtos')
  const json = await res.json()
  // AdonisJS serialize() wraps the response in { data: { ... } }
  return json.data ?? json
}

export async function fetchProductStats(): Promise<{ stats: Record<string, MarketStats> }> {
  const res = await apiFetch(`${API_URL}/products/stats`)
  if (!res.ok) throw new Error('Falha ao buscar estatísticas')
  return res.json()
}

export async function triggerScrape(params: {
  categoria1: string
  categoria2: string
  maxPaginas?: number
}) {
  const res = await apiFetch(`${API_URL}/admin/scrape`, {
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

export async function fetchReceipts(): Promise<{ receipts: Receipt[] }> {
  const res = await apiFetch(`${API_URL}/receipts`)
  if (!res.ok) throw new Error('Falha ao buscar cupons fiscais')
  return res.json()
}

export async function scanReceipt(params: { chaveAcesso?: string; qrCodeUrl?: string }): Promise<{
  mensagem: string
  receipt: Receipt
}> {
  const res = await apiFetch(`${API_URL}/receipts`, {
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
  const res = await apiFetch(`${API_URL}/admin/bigmaster/sync`, {
    method: 'POST'
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    const errMsg = errorData.errors?.[0]?.message || errorData.error || errorData.detalhes || errorData.mensagem || 'Falha ao sincronizar BigMaster'
    throw new Error(errMsg)
  }
  return res.json()
}

export async function compareList(items: Array<{ nome: string; quantidade: number; precoOriginal?: number }>): Promise<ComparisonResult> {
  const res = await apiFetch(`${API_URL}/compare`, {
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
  const res = await apiFetch(`${API_URL}/admin/bigmaster/sync-images`, {
    method: 'POST'
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Falha ao sincronizar imagens do BigMaster')
  }
  return res.json()
}

export async function fetchAtacadaoCategories(): Promise<Record<string, string[]>> {
  const res = await apiFetch(`${API_URL}/atacadao/categories`)
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
  const res = await apiFetch(`${API_URL}/admin/atacadao/sync-all`, {
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

// ─── Shopping Lists ──────────────────────────────────────────────────────────

export async function fetchShoppingLists(): Promise<{ lists: ShoppingListData[] }> {
  const res = await apiFetch(`${API_URL}/shopping-lists`)
  if (!res.ok) throw new Error('Falha ao buscar listas de compras')
  return res.json()
}

export async function createShoppingList(data: {
  nome: string
  items?: Array<{ nome: string; quantidade: number; precoOriginal?: number }>
}): Promise<{ mensagem: string; list: ShoppingListData }> {
  const res = await apiFetch(`${API_URL}/shopping-lists`, {
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
  const res = await apiFetch(`${API_URL}/shopping-lists/${id}`, {
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
  const res = await apiFetch(`${API_URL}/shopping-lists/${id}/compare`, {
    method: 'POST',
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Falha ao comparar lista de compras')
  }
  return res.json()
}

// ─── Subscriptions ───────────────────────────────────────────────────────────

export async function fetchMySubscription(): Promise<SubscriptionResponse> {
  const res = await apiFetch(`${API_URL}/subscriptions/me`)
  if (!res.ok) throw new Error('Falha ao buscar dados da assinatura')
  return res.json()
}

export async function createCheckoutSession(params: { successUrl?: string; cancelUrl?: string } = {}): Promise<{
  checkoutUrl?: string
  simulated?: boolean
  mensagem?: string
  subscription?: UserSubscription
}> {
  const res = await apiFetch(`${API_URL}/subscriptions/checkout`, {
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

export async function createPortalSession(): Promise<{ portalUrl: string }> {
  const res = await apiFetch(`${API_URL}/subscriptions/portal`, {
    method: 'POST',
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Falha ao abrir portal de assinatura')
  }
  return res.json()
}

// ─── Promotions (Bloco 3) ────────────────────────────────────────────────────

export async function fetchPromotions(params: {
  periodo?: string
  categoria?: string
  origem?: string
  limite?: number
} = {}): Promise<{ promotions: PromotionItem[] }> {
  const query = new URLSearchParams()
  if (params.periodo) query.set('periodo', params.periodo)
  if (params.categoria) query.set('categoria', params.categoria)
  if (params.origem) query.set('origem', params.origem)
  if (params.limite) query.set('limite', String(params.limite))

  const res = await apiFetch(`${API_URL}/promotions?${query.toString()}`)
  if (!res.ok) throw new Error('Falha ao buscar promoções')
  return res.json()
}

export async function fetchProductInsights(productId: number, periodo?: string): Promise<ProductInsights> {
  const query = periodo ? `?periodo=${periodo}` : ''
  const res = await apiFetch(`${API_URL}/products/${productId}/insights${query}`)
  if (!res.ok) throw new Error('Falha ao buscar insights do produto')
  return res.json()
}

export async function fetchBasketIndex(periodo?: string): Promise<BasketIndexResponse> {
  const query = periodo ? `?periodo=${periodo}` : ''
  const res = await apiFetch(`${API_URL}/basket-index${query}`)
  if (!res.ok) throw new Error('Falha ao buscar índice de cesta')
  return res.json()
}

// ─── Price History ───────────────────────────────────────────────────────────

export async function fetchPriceHistory(productId: number, periodo?: string): Promise<{
  produto: { id: number; nome: string; externalId: string; origem: string }
  historico: Array<{ precoVarejo: number; precoAtacado: number; disponivel: boolean; capturadoEm: string }>
  resumo: { precoMinimo: number | null; precoMaximo: number | null; precoAtual: number | null; variacaoPercentual: number | null }
}> {
  const query = periodo ? `?periodo=${periodo}` : ''
  const res = await apiFetch(`${API_URL}/products/${productId}/history${query}`)
  if (!res.ok) throw new Error('Falha ao buscar histórico de preço')
  return res.json()
}

// ─── Price Alerts (Bloco 4) ──────────────────────────────────────────────────

export async function fetchPriceAlerts(): Promise<{ alerts: PriceAlert[] }> {
  const res = await apiFetch(`${API_URL}/price-alerts`)
  if (!res.ok) throw new Error('Falha ao buscar alertas de preço')
  return res.json()
}

export async function createPriceAlert(data: {
  productId: number
  tipo: 'abaixo_de' | 'qualquer_queda'
  precoAlvo?: number
}): Promise<{ mensagem: string; alert: PriceAlert }> {
  const res = await apiFetch(`${API_URL}/price-alerts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Falha ao criar alerta de preço')
  }
  return res.json()
}

export async function deletePriceAlert(id: number): Promise<{ mensagem: string }> {
  const res = await apiFetch(`${API_URL}/price-alerts/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Falha ao remover alerta de preço')
  }
  return res.json()
}
