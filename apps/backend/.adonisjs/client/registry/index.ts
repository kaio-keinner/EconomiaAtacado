/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'auth.new_account.store': {
    methods: ["POST"],
    pattern: '/api/v1/auth/signup',
    tokens: [{"old":"/api/v1/auth/signup","type":0,"val":"api","end":""},{"old":"/api/v1/auth/signup","type":0,"val":"v1","end":""},{"old":"/api/v1/auth/signup","type":0,"val":"auth","end":""},{"old":"/api/v1/auth/signup","type":0,"val":"signup","end":""}],
    types: placeholder as Registry['auth.new_account.store']['types'],
  },
  'auth.access_tokens.store': {
    methods: ["POST"],
    pattern: '/api/v1/auth/login',
    tokens: [{"old":"/api/v1/auth/login","type":0,"val":"api","end":""},{"old":"/api/v1/auth/login","type":0,"val":"v1","end":""},{"old":"/api/v1/auth/login","type":0,"val":"auth","end":""},{"old":"/api/v1/auth/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['auth.access_tokens.store']['types'],
  },
  'profile.profile.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/account/profile',
    tokens: [{"old":"/api/v1/account/profile","type":0,"val":"api","end":""},{"old":"/api/v1/account/profile","type":0,"val":"v1","end":""},{"old":"/api/v1/account/profile","type":0,"val":"account","end":""},{"old":"/api/v1/account/profile","type":0,"val":"profile","end":""}],
    types: placeholder as Registry['profile.profile.show']['types'],
  },
  'profile.access_tokens.destroy': {
    methods: ["POST"],
    pattern: '/api/v1/account/logout',
    tokens: [{"old":"/api/v1/account/logout","type":0,"val":"api","end":""},{"old":"/api/v1/account/logout","type":0,"val":"v1","end":""},{"old":"/api/v1/account/logout","type":0,"val":"account","end":""},{"old":"/api/v1/account/logout","type":0,"val":"logout","end":""}],
    types: placeholder as Registry['profile.access_tokens.destroy']['types'],
  },
  'products.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/products',
    tokens: [{"old":"/api/products","type":0,"val":"api","end":""},{"old":"/api/products","type":0,"val":"products","end":""}],
    types: placeholder as Registry['products.index']['types'],
  },
  'products.stats': {
    methods: ["GET","HEAD"],
    pattern: '/api/products/stats',
    tokens: [{"old":"/api/products/stats","type":0,"val":"api","end":""},{"old":"/api/products/stats","type":0,"val":"products","end":""},{"old":"/api/products/stats","type":0,"val":"stats","end":""}],
    types: placeholder as Registry['products.stats']['types'],
  },
  'products.price_history': {
    methods: ["GET","HEAD"],
    pattern: '/api/products/:id/history',
    tokens: [{"old":"/api/products/:id/history","type":0,"val":"api","end":""},{"old":"/api/products/:id/history","type":0,"val":"products","end":""},{"old":"/api/products/:id/history","type":1,"val":"id","end":""},{"old":"/api/products/:id/history","type":0,"val":"history","end":""}],
    types: placeholder as Registry['products.price_history']['types'],
  },
  'products.categories': {
    methods: ["GET","HEAD"],
    pattern: '/api/atacadao/categories',
    tokens: [{"old":"/api/atacadao/categories","type":0,"val":"api","end":""},{"old":"/api/atacadao/categories","type":0,"val":"atacadao","end":""},{"old":"/api/atacadao/categories","type":0,"val":"categories","end":""}],
    types: placeholder as Registry['products.categories']['types'],
  },
  'jobs.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/jobs/:jobId',
    tokens: [{"old":"/api/jobs/:jobId","type":0,"val":"api","end":""},{"old":"/api/jobs/:jobId","type":0,"val":"jobs","end":""},{"old":"/api/jobs/:jobId","type":1,"val":"jobId","end":""}],
    types: placeholder as Registry['jobs.show']['types'],
  },
  'scrapers.health': {
    methods: ["GET","HEAD"],
    pattern: '/api/scrapers/health',
    tokens: [{"old":"/api/scrapers/health","type":0,"val":"api","end":""},{"old":"/api/scrapers/health","type":0,"val":"scrapers","end":""},{"old":"/api/scrapers/health","type":0,"val":"health","end":""}],
    types: placeholder as Registry['scrapers.health']['types'],
  },
  'comparison.compare': {
    methods: ["POST"],
    pattern: '/api/compare',
    tokens: [{"old":"/api/compare","type":0,"val":"api","end":""},{"old":"/api/compare","type":0,"val":"compare","end":""}],
    types: placeholder as Registry['comparison.compare']['types'],
  },
  'products.scrape': {
    methods: ["POST"],
    pattern: '/api/scrape',
    tokens: [{"old":"/api/scrape","type":0,"val":"api","end":""},{"old":"/api/scrape","type":0,"val":"scrape","end":""}],
    types: placeholder as Registry['products.scrape']['types'],
  },
  'products.sync_all': {
    methods: ["POST"],
    pattern: '/api/atacadao/sync-all',
    tokens: [{"old":"/api/atacadao/sync-all","type":0,"val":"api","end":""},{"old":"/api/atacadao/sync-all","type":0,"val":"atacadao","end":""},{"old":"/api/atacadao/sync-all","type":0,"val":"sync-all","end":""}],
    types: placeholder as Registry['products.sync_all']['types'],
  },
  'comparison.sync_big_master': {
    methods: ["POST"],
    pattern: '/api/bigmaster/sync',
    tokens: [{"old":"/api/bigmaster/sync","type":0,"val":"api","end":""},{"old":"/api/bigmaster/sync","type":0,"val":"bigmaster","end":""},{"old":"/api/bigmaster/sync","type":0,"val":"sync","end":""}],
    types: placeholder as Registry['comparison.sync_big_master']['types'],
  },
  'products.sync_images': {
    methods: ["POST"],
    pattern: '/api/bigmaster/sync-images',
    tokens: [{"old":"/api/bigmaster/sync-images","type":0,"val":"api","end":""},{"old":"/api/bigmaster/sync-images","type":0,"val":"bigmaster","end":""},{"old":"/api/bigmaster/sync-images","type":0,"val":"sync-images","end":""}],
    types: placeholder as Registry['products.sync_images']['types'],
  },
  'subscriptions.webhook': {
    methods: ["POST"],
    pattern: '/api/webhooks/stripe',
    tokens: [{"old":"/api/webhooks/stripe","type":0,"val":"api","end":""},{"old":"/api/webhooks/stripe","type":0,"val":"webhooks","end":""},{"old":"/api/webhooks/stripe","type":0,"val":"stripe","end":""}],
    types: placeholder as Registry['subscriptions.webhook']['types'],
  },
  'receipts.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/receipts',
    tokens: [{"old":"/api/receipts","type":0,"val":"api","end":""},{"old":"/api/receipts","type":0,"val":"receipts","end":""}],
    types: placeholder as Registry['receipts.index']['types'],
  },
  'receipts.store': {
    methods: ["POST"],
    pattern: '/api/receipts',
    tokens: [{"old":"/api/receipts","type":0,"val":"api","end":""},{"old":"/api/receipts","type":0,"val":"receipts","end":""}],
    types: placeholder as Registry['receipts.store']['types'],
  },
  'shopping_lists.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/shopping-lists',
    tokens: [{"old":"/api/shopping-lists","type":0,"val":"api","end":""},{"old":"/api/shopping-lists","type":0,"val":"shopping-lists","end":""}],
    types: placeholder as Registry['shopping_lists.index']['types'],
  },
  'shopping_lists.store': {
    methods: ["POST"],
    pattern: '/api/shopping-lists',
    tokens: [{"old":"/api/shopping-lists","type":0,"val":"api","end":""},{"old":"/api/shopping-lists","type":0,"val":"shopping-lists","end":""}],
    types: placeholder as Registry['shopping_lists.store']['types'],
  },
  'shopping_lists.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/shopping-lists/:id',
    tokens: [{"old":"/api/shopping-lists/:id","type":0,"val":"api","end":""},{"old":"/api/shopping-lists/:id","type":0,"val":"shopping-lists","end":""},{"old":"/api/shopping-lists/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['shopping_lists.show']['types'],
  },
  'shopping_lists.update': {
    methods: ["PUT"],
    pattern: '/api/shopping-lists/:id',
    tokens: [{"old":"/api/shopping-lists/:id","type":0,"val":"api","end":""},{"old":"/api/shopping-lists/:id","type":0,"val":"shopping-lists","end":""},{"old":"/api/shopping-lists/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['shopping_lists.update']['types'],
  },
  'shopping_lists.destroy': {
    methods: ["DELETE"],
    pattern: '/api/shopping-lists/:id',
    tokens: [{"old":"/api/shopping-lists/:id","type":0,"val":"api","end":""},{"old":"/api/shopping-lists/:id","type":0,"val":"shopping-lists","end":""},{"old":"/api/shopping-lists/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['shopping_lists.destroy']['types'],
  },
  'shopping_lists.compare': {
    methods: ["POST"],
    pattern: '/api/shopping-lists/:id/compare',
    tokens: [{"old":"/api/shopping-lists/:id/compare","type":0,"val":"api","end":""},{"old":"/api/shopping-lists/:id/compare","type":0,"val":"shopping-lists","end":""},{"old":"/api/shopping-lists/:id/compare","type":1,"val":"id","end":""},{"old":"/api/shopping-lists/:id/compare","type":0,"val":"compare","end":""}],
    types: placeholder as Registry['shopping_lists.compare']['types'],
  },
  'subscriptions.me': {
    methods: ["GET","HEAD"],
    pattern: '/api/subscriptions/me',
    tokens: [{"old":"/api/subscriptions/me","type":0,"val":"api","end":""},{"old":"/api/subscriptions/me","type":0,"val":"subscriptions","end":""},{"old":"/api/subscriptions/me","type":0,"val":"me","end":""}],
    types: placeholder as Registry['subscriptions.me']['types'],
  },
  'subscriptions.checkout': {
    methods: ["POST"],
    pattern: '/api/subscriptions/checkout',
    tokens: [{"old":"/api/subscriptions/checkout","type":0,"val":"api","end":""},{"old":"/api/subscriptions/checkout","type":0,"val":"subscriptions","end":""},{"old":"/api/subscriptions/checkout","type":0,"val":"checkout","end":""}],
    types: placeholder as Registry['subscriptions.checkout']['types'],
  },
  'product_matches.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/matches',
    tokens: [{"old":"/api/matches","type":0,"val":"api","end":""},{"old":"/api/matches","type":0,"val":"matches","end":""}],
    types: placeholder as Registry['product_matches.index']['types'],
  },
  'product_matches.store': {
    methods: ["POST"],
    pattern: '/api/matches',
    tokens: [{"old":"/api/matches","type":0,"val":"api","end":""},{"old":"/api/matches","type":0,"val":"matches","end":""}],
    types: placeholder as Registry['product_matches.store']['types'],
  },
  'product_matches.reject': {
    methods: ["PATCH"],
    pattern: '/api/matches/:id/reject',
    tokens: [{"old":"/api/matches/:id/reject","type":0,"val":"api","end":""},{"old":"/api/matches/:id/reject","type":0,"val":"matches","end":""},{"old":"/api/matches/:id/reject","type":1,"val":"id","end":""},{"old":"/api/matches/:id/reject","type":0,"val":"reject","end":""}],
    types: placeholder as Registry['product_matches.reject']['types'],
  },
  'product_matches.recompute': {
    methods: ["POST"],
    pattern: '/api/matches/recompute',
    tokens: [{"old":"/api/matches/recompute","type":0,"val":"api","end":""},{"old":"/api/matches/recompute","type":0,"val":"matches","end":""},{"old":"/api/matches/recompute","type":0,"val":"recompute","end":""}],
    types: placeholder as Registry['product_matches.recompute']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
