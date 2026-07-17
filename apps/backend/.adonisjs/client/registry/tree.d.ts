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
    scrape: typeof routes['products.scrape']
    syncImages: typeof routes['products.sync_images']
  }
  receipts: {
    index: typeof routes['receipts.index']
    store: typeof routes['receipts.store']
  }
  comparison: {
    syncBigMaster: typeof routes['comparison.sync_big_master']
    compare: typeof routes['comparison.compare']
  }
}
