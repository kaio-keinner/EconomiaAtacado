/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  auth: {
    newAccount: {
      store: typeof routes['auth.new_account.store']
    }
    accessTokens: {
      store: typeof routes['auth.access_tokens.store']
    }
  }
  profile: {
    profile: {
      show: typeof routes['profile.profile.show']
    }
    accessTokens: {
      destroy: typeof routes['profile.access_tokens.destroy']
    }
  }
  products: {
    index: typeof routes['products.index']
    stats: typeof routes['products.stats']
    priceHistory: typeof routes['products.price_history']
    categories: typeof routes['products.categories']
    scrape: typeof routes['products.scrape']
    syncAll: typeof routes['products.sync_all']
    syncImages: typeof routes['products.sync_images']
  }
  jobs: {
    show: typeof routes['jobs.show']
  }
  scrapers: {
    health: typeof routes['scrapers.health']
  }
  promotions: {
    basketIndex: typeof routes['promotions.basket_index']
    index: typeof routes['promotions.index']
    insights: typeof routes['promotions.insights']
  }
  comparison: {
    compare: typeof routes['comparison.compare']
    syncBigMaster: typeof routes['comparison.sync_big_master']
  }
  subscriptions: {
    webhook: typeof routes['subscriptions.webhook']
    me: typeof routes['subscriptions.me']
    checkout: typeof routes['subscriptions.checkout']
    portal: typeof routes['subscriptions.portal']
  }
  receipts: {
    index: typeof routes['receipts.index']
    store: typeof routes['receipts.store']
  }
  shoppingLists: {
    index: typeof routes['shopping_lists.index']
    store: typeof routes['shopping_lists.store']
    show: typeof routes['shopping_lists.show']
    update: typeof routes['shopping_lists.update']
    destroy: typeof routes['shopping_lists.destroy']
    compare: typeof routes['shopping_lists.compare']
  }
  productMatches: {
    index: typeof routes['product_matches.index']
    store: typeof routes['product_matches.store']
    reject: typeof routes['product_matches.reject']
    recompute: typeof routes['product_matches.recompute']
  }
}
