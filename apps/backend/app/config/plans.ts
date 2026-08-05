export const PLANS = {
  FREE: {
    name: 'free',
    label: 'Plano Gratuito',
    maxShoppingLists: 3,
    maxHistoryDays: 7,
    maxPromotionsLimit: 3,
    hasBasketIndex: false,
    hasPriceAlerts: false,
    hasFullHistory: false,
    hasAdvancedFilters: false,
  },
  PRO: {
    name: 'pro',
    priceIdEnv: 'STRIPE_PRICE_ID_PRO',
    priceAmount: 1000, // R$ 10,00 em centavos
    label: 'Plano Pro',
    maxShoppingLists: Infinity,
    maxHistoryDays: 365,
    maxPromotionsLimit: 50,
    hasBasketIndex: true,
    hasPriceAlerts: true,
    hasFullHistory: true,
    hasAdvancedFilters: true,
  },
} as const

export type PlanName = 'free' | 'pro'

export function getPlanLimits(plan: PlanName) {
  return plan === 'pro' ? PLANS.PRO : PLANS.FREE
}
