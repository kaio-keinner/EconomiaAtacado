/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractResponse } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'auth.new_account.store': {
    methods: ["POST"]
    pattern: '/api/v1/auth/signup'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').signupValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').signupValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth.access_tokens.store': {
    methods: ["POST"]
    pattern: '/api/v1/auth/login'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').loginValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').loginValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'profile.profile.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/account/profile'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
    }
  }
  'profile.access_tokens.destroy': {
    methods: ["POST"]
    pattern: '/api/v1/account/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['destroy']>>>
    }
  }
  'products.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/products'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/products_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/products_controller').default['index']>>>
    }
  }
  'products.stats': {
    methods: ["GET","HEAD"]
    pattern: '/api/products/stats'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/products_controller').default['stats']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/products_controller').default['stats']>>>
    }
  }
  'products.price_history': {
    methods: ["GET","HEAD"]
    pattern: '/api/products/:id/history'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/products_controller').default['priceHistory']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/products_controller').default['priceHistory']>>>
    }
  }
  'products.categories': {
    methods: ["GET","HEAD"]
    pattern: '/api/atacadao/categories'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/products_controller').default['categories']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/products_controller').default['categories']>>>
    }
  }
  'jobs.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/jobs/:jobId'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { jobId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/jobs_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/jobs_controller').default['show']>>>
    }
  }
  'scrapers.health': {
    methods: ["GET","HEAD"]
    pattern: '/api/scrapers/health'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/scrapers_controller').default['health']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/scrapers_controller').default['health']>>>
    }
  }
  'promotions.basket_index': {
    methods: ["GET","HEAD"]
    pattern: '/api/basket-index'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/promotions_controller').default['basketIndex']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/promotions_controller').default['basketIndex']>>>
    }
  }
  'comparison.compare': {
    methods: ["POST"]
    pattern: '/api/compare'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/comparison_controller').default['compare']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/comparison_controller').default['compare']>>>
    }
  }
  'subscriptions.webhook': {
    methods: ["POST"]
    pattern: '/api/webhooks/stripe'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/subscriptions_controller').default['webhook']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/subscriptions_controller').default['webhook']>>>
    }
  }
  'products.scrape': {
    methods: ["POST"]
    pattern: '/api/admin/scrape'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/products_controller').default['scrape']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/products_controller').default['scrape']>>>
    }
  }
  'products.sync_all': {
    methods: ["POST"]
    pattern: '/api/admin/atacadao/sync-all'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/products_controller').default['syncAll']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/products_controller').default['syncAll']>>>
    }
  }
  'comparison.sync_big_master': {
    methods: ["POST"]
    pattern: '/api/admin/bigmaster/sync'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/comparison_controller').default['syncBigMaster']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/comparison_controller').default['syncBigMaster']>>>
    }
  }
  'products.sync_images': {
    methods: ["POST"]
    pattern: '/api/admin/bigmaster/sync-images'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/products_controller').default['syncImages']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/products_controller').default['syncImages']>>>
    }
  }
  'promotions.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/promotions'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/promotions_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/promotions_controller').default['index']>>>
    }
  }
  'promotions.insights': {
    methods: ["GET","HEAD"]
    pattern: '/api/products/:id/insights'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/promotions_controller').default['insights']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/promotions_controller').default['insights']>>>
    }
  }
  'receipts.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/receipts'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/receipts_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/receipts_controller').default['index']>>>
    }
  }
  'receipts.store': {
    methods: ["POST"]
    pattern: '/api/receipts'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/receipts_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/receipts_controller').default['store']>>>
    }
  }
  'shopping_lists.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/shopping-lists'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/shopping_lists_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/shopping_lists_controller').default['index']>>>
    }
  }
  'shopping_lists.store': {
    methods: ["POST"]
    pattern: '/api/shopping-lists'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/shopping_lists_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/shopping_lists_controller').default['store']>>>
    }
  }
  'shopping_lists.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/shopping-lists/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/shopping_lists_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/shopping_lists_controller').default['show']>>>
    }
  }
  'shopping_lists.update': {
    methods: ["PUT"]
    pattern: '/api/shopping-lists/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/shopping_lists_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/shopping_lists_controller').default['update']>>>
    }
  }
  'shopping_lists.destroy': {
    methods: ["DELETE"]
    pattern: '/api/shopping-lists/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/shopping_lists_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/shopping_lists_controller').default['destroy']>>>
    }
  }
  'shopping_lists.compare': {
    methods: ["POST"]
    pattern: '/api/shopping-lists/:id/compare'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/shopping_lists_controller').default['compare']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/shopping_lists_controller').default['compare']>>>
    }
  }
  'subscriptions.me': {
    methods: ["GET","HEAD"]
    pattern: '/api/subscriptions/me'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/subscriptions_controller').default['me']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/subscriptions_controller').default['me']>>>
    }
  }
  'subscriptions.checkout': {
    methods: ["POST"]
    pattern: '/api/subscriptions/checkout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/subscriptions_controller').default['checkout']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/subscriptions_controller').default['checkout']>>>
    }
  }
  'subscriptions.portal': {
    methods: ["POST"]
    pattern: '/api/subscriptions/portal'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/subscriptions_controller').default['portal']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/subscriptions_controller').default['portal']>>>
    }
  }
  'product_matches.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/matches'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/product_matches_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/product_matches_controller').default['index']>>>
    }
  }
  'product_matches.store': {
    methods: ["POST"]
    pattern: '/api/matches'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/product_matches_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/product_matches_controller').default['store']>>>
    }
  }
  'product_matches.reject': {
    methods: ["PATCH"]
    pattern: '/api/matches/:id/reject'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/product_matches_controller').default['reject']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/product_matches_controller').default['reject']>>>
    }
  }
  'product_matches.recompute': {
    methods: ["POST"]
    pattern: '/api/matches/recompute'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/product_matches_controller').default['recompute']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/product_matches_controller').default['recompute']>>>
    }
  }
}
