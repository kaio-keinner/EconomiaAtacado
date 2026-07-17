import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'profile.access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'products.index': { paramsTuple?: []; params?: {} }
    'products.stats': { paramsTuple?: []; params?: {} }
    'products.scrape': { paramsTuple?: []; params?: {} }
    'products.categories': { paramsTuple?: []; params?: {} }
    'products.sync_all': { paramsTuple?: []; params?: {} }
    'receipts.index': { paramsTuple?: []; params?: {} }
    'receipts.store': { paramsTuple?: []; params?: {} }
    'comparison.sync_big_master': { paramsTuple?: []; params?: {} }
    'products.sync_images': { paramsTuple?: []; params?: {} }
    'comparison.compare': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'products.index': { paramsTuple?: []; params?: {} }
    'products.stats': { paramsTuple?: []; params?: {} }
    'products.categories': { paramsTuple?: []; params?: {} }
    'receipts.index': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'products.index': { paramsTuple?: []; params?: {} }
    'products.stats': { paramsTuple?: []; params?: {} }
    'products.categories': { paramsTuple?: []; params?: {} }
    'receipts.index': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'profile.access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'products.scrape': { paramsTuple?: []; params?: {} }
    'products.sync_all': { paramsTuple?: []; params?: {} }
    'receipts.store': { paramsTuple?: []; params?: {} }
    'comparison.sync_big_master': { paramsTuple?: []; params?: {} }
    'products.sync_images': { paramsTuple?: []; params?: {} }
    'comparison.compare': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}