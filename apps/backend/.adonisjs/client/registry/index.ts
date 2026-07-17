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
  'products.scrape': {
    methods: ["POST"],
    pattern: '/api/scrape',
    tokens: [{"old":"/api/scrape","type":0,"val":"api","end":""},{"old":"/api/scrape","type":0,"val":"scrape","end":""}],
    types: placeholder as Registry['products.scrape']['types'],
  },
  'products.categories': {
    methods: ["GET","HEAD"],
    pattern: '/api/atacadao/categories',
    tokens: [{"old":"/api/atacadao/categories","type":0,"val":"api","end":""},{"old":"/api/atacadao/categories","type":0,"val":"atacadao","end":""},{"old":"/api/atacadao/categories","type":0,"val":"categories","end":""}],
    types: placeholder as Registry['products.categories']['types'],
  },
  'products.sync_all': {
    methods: ["POST"],
    pattern: '/api/atacadao/sync-all',
    tokens: [{"old":"/api/atacadao/sync-all","type":0,"val":"api","end":""},{"old":"/api/atacadao/sync-all","type":0,"val":"atacadao","end":""},{"old":"/api/atacadao/sync-all","type":0,"val":"sync-all","end":""}],
    types: placeholder as Registry['products.sync_all']['types'],
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
  'comparison.compare': {
    methods: ["POST"],
    pattern: '/api/compare',
    tokens: [{"old":"/api/compare","type":0,"val":"api","end":""},{"old":"/api/compare","type":0,"val":"compare","end":""}],
    types: placeholder as Registry['comparison.compare']['types'],
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
