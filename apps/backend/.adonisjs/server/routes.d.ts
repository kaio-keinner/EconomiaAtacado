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
    'products.price_history': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'products.categories': { paramsTuple?: []; params?: {} }
    'jobs.show': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
    'scrapers.health': { paramsTuple?: []; params?: {} }
    'promotions.basket_index': { paramsTuple?: []; params?: {} }
    'comparison.compare': { paramsTuple?: []; params?: {} }
    'subscriptions.webhook': { paramsTuple?: []; params?: {} }
    'products.scrape': { paramsTuple?: []; params?: {} }
    'products.sync_all': { paramsTuple?: []; params?: {} }
    'comparison.sync_big_master': { paramsTuple?: []; params?: {} }
    'products.sync_images': { paramsTuple?: []; params?: {} }
    'price_alerts.index': { paramsTuple?: []; params?: {} }
    'price_alerts.store': { paramsTuple?: []; params?: {} }
    'price_alerts.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'promotions.index': { paramsTuple?: []; params?: {} }
    'promotions.insights': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'receipts.index': { paramsTuple?: []; params?: {} }
    'receipts.store': { paramsTuple?: []; params?: {} }
    'shopping_lists.index': { paramsTuple?: []; params?: {} }
    'shopping_lists.store': { paramsTuple?: []; params?: {} }
    'shopping_lists.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shopping_lists.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shopping_lists.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shopping_lists.compare': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'subscriptions.me': { paramsTuple?: []; params?: {} }
    'subscriptions.checkout': { paramsTuple?: []; params?: {} }
    'subscriptions.portal': { paramsTuple?: []; params?: {} }
    'product_matches.index': { paramsTuple?: []; params?: {} }
    'product_matches.store': { paramsTuple?: []; params?: {} }
    'product_matches.reject': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'product_matches.recompute': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'products.index': { paramsTuple?: []; params?: {} }
    'products.stats': { paramsTuple?: []; params?: {} }
    'products.price_history': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'products.categories': { paramsTuple?: []; params?: {} }
    'jobs.show': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
    'scrapers.health': { paramsTuple?: []; params?: {} }
    'promotions.basket_index': { paramsTuple?: []; params?: {} }
    'price_alerts.index': { paramsTuple?: []; params?: {} }
    'promotions.index': { paramsTuple?: []; params?: {} }
    'promotions.insights': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'receipts.index': { paramsTuple?: []; params?: {} }
    'shopping_lists.index': { paramsTuple?: []; params?: {} }
    'shopping_lists.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'subscriptions.me': { paramsTuple?: []; params?: {} }
    'product_matches.index': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'products.index': { paramsTuple?: []; params?: {} }
    'products.stats': { paramsTuple?: []; params?: {} }
    'products.price_history': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'products.categories': { paramsTuple?: []; params?: {} }
    'jobs.show': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
    'scrapers.health': { paramsTuple?: []; params?: {} }
    'promotions.basket_index': { paramsTuple?: []; params?: {} }
    'price_alerts.index': { paramsTuple?: []; params?: {} }
    'promotions.index': { paramsTuple?: []; params?: {} }
    'promotions.insights': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'receipts.index': { paramsTuple?: []; params?: {} }
    'shopping_lists.index': { paramsTuple?: []; params?: {} }
    'shopping_lists.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'subscriptions.me': { paramsTuple?: []; params?: {} }
    'product_matches.index': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'profile.access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'comparison.compare': { paramsTuple?: []; params?: {} }
    'subscriptions.webhook': { paramsTuple?: []; params?: {} }
    'products.scrape': { paramsTuple?: []; params?: {} }
    'products.sync_all': { paramsTuple?: []; params?: {} }
    'comparison.sync_big_master': { paramsTuple?: []; params?: {} }
    'products.sync_images': { paramsTuple?: []; params?: {} }
    'price_alerts.store': { paramsTuple?: []; params?: {} }
    'receipts.store': { paramsTuple?: []; params?: {} }
    'shopping_lists.store': { paramsTuple?: []; params?: {} }
    'shopping_lists.compare': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'subscriptions.checkout': { paramsTuple?: []; params?: {} }
    'subscriptions.portal': { paramsTuple?: []; params?: {} }
    'product_matches.store': { paramsTuple?: []; params?: {} }
    'product_matches.recompute': { paramsTuple?: []; params?: {} }
  }
  DELETE: {
    'price_alerts.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shopping_lists.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PUT: {
    'shopping_lists.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PATCH: {
    'product_matches.reject': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}