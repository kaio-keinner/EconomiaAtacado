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

router
  .group(() => {
    router.get('/products', [ProductsController, 'index'])
    router.get('/products/stats', [ProductsController, 'stats'])
    router.post('/scrape', [ProductsController, 'scrape'])
    router.get('/atacadao/categories', [ProductsController, 'categories'])
    router.post('/atacadao/sync-all', [ProductsController, 'syncAll'])
    router.get('/receipts', [ReceiptsController, 'index'])
    router.post('/receipts', [ReceiptsController, 'store'])
    router.post('/bigmaster/sync', [ComparisonController, 'syncBigMaster'])
    router.post('/bigmaster/sync-images', [ProductsController, 'syncImages'])
    router.post('/compare', [ComparisonController, 'compare'])
  })
  .prefix('/api')
