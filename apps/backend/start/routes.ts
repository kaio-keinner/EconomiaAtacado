/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'

router.get('/', () => {
  return { hello: 'world' }
})

router
  .group(() => {
    router
      .group(() => {
        router.post('signup', [controllers.NewAccount, 'store'])
        router.post('login', [controllers.AccessTokens, 'store'])
      })
      .prefix('auth')
      .as('auth')

    router
      .group(() => {
        router.get('profile', [controllers.Profile, 'show'])
        router.post('logout', [controllers.AccessTokens, 'destroy'])
      })
      .prefix('account')
      .as('profile')
      .use(middleware.auth())
  })
  .prefix('/api/v1')

const ProductsController = () => import('#controllers/products_controller')
const ReceiptsController = () => import('#controllers/receipts_controller')
const ComparisonController = () => import('#controllers/comparison_controller')
const ShoppingListsController = () => import('#controllers/shopping_lists_controller')
const SubscriptionsController = () => import('#controllers/subscriptions_controller')
const ProductMatchesController = () => import('#controllers/product_matches_controller')
const ScrapersController = () => import('#controllers/scrapers_controller')
const JobsController = () => import('#controllers/jobs_controller')
const PromotionsController = () => import('#controllers/promotions_controller')

// Rotas Públicas (Leitura e consulta de catálogo geral & webhooks & health & compare & basket-index)
router
  .group(() => {
    router.get('/products', [ProductsController, 'index'])
    router.get('/products/stats', [ProductsController, 'stats'])
    router.get('/products/:id/history', [ProductsController, 'priceHistory'])
    router.get('/atacadao/categories', [ProductsController, 'categories'])
    router.get('/jobs/:jobId', [JobsController, 'show'])
    router.get('/scrapers/health', [ScrapersController, 'health'])
    router.get('/basket-index', [PromotionsController, 'basketIndex'])

    // Comparação de preços instantânea
    router.post('/compare', [ComparisonController, 'compare'])

    // Webhook Stripe (Recebe notificações do Gateway sem auth Bearer)
    router.post('/webhooks/stripe', [SubscriptionsController, 'webhook'])
  })
  .prefix('/api')

// Rotas Administrativas (Requerem autenticação + role admin)
router
  .group(() => {
    router.post('/scrape', [ProductsController, 'scrape']).use(middleware.syncRateLimiter())
    router.post('/atacadao/sync-all', [ProductsController, 'syncAll']).use(middleware.syncRateLimiter())
    router.post('/bigmaster/sync', [ComparisonController, 'syncBigMaster']).use(middleware.syncRateLimiter())
    router.post('/bigmaster/sync-images', [ProductsController, 'syncImages']).use(middleware.syncRateLimiter())
  })
  .prefix('/api/admin')
  .use([middleware.auth(), middleware.admin()])


// Rotas Protegidas (Requerem autenticação via token para ações do usuário)
router
  .group(() => {
    // Promoções e Insights de Produto
    router.get('/promotions', [PromotionsController, 'index'])
    router.get('/products/:id/insights', [PromotionsController, 'insights'])

    // Recibos e Cupons Fiscais (Isolados por Usuário)
    router.get('/receipts', [ReceiptsController, 'index'])
    router.post('/receipts', [ReceiptsController, 'store'])

    // Listas de Compras Persistentes (Isoladas por Usuário)
    router.get('/shopping-lists', [ShoppingListsController, 'index'])
    router.post('/shopping-lists', [ShoppingListsController, 'store'])
    router.get('/shopping-lists/:id', [ShoppingListsController, 'show'])
    router.put('/shopping-lists/:id', [ShoppingListsController, 'update'])
    router.delete('/shopping-lists/:id', [ShoppingListsController, 'destroy'])
    router.post('/shopping-lists/:id/compare', [ShoppingListsController, 'compare'])

    // Assinaturas e Checkout (Stripe)
    router.get('/subscriptions/me', [SubscriptionsController, 'me'])
    router.post('/subscriptions/checkout', [SubscriptionsController, 'checkout'])
    router.post('/subscriptions/portal', [SubscriptionsController, 'portal'])

    // Gestão e Correção Manual de Pareamentos (Matching Engine)
    router.get('/matches', [ProductMatchesController, 'index'])
    router.post('/matches', [ProductMatchesController, 'store'])
    router.patch('/matches/:id/reject', [ProductMatchesController, 'reject'])
    router.post('/matches/recompute', [ProductMatchesController, 'recompute'])
  })
  .prefix('/api')
  .use(middleware.auth())




