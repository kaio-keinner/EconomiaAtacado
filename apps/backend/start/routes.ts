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

router
  .group(() => {
    router.get('/products', [ProductsController, 'index'])
    router.post('/scrape', [ProductsController, 'scrape'])
    router.get('/receipts', [ReceiptsController, 'index'])
    router.post('/receipts', [ReceiptsController, 'store'])
  })
  .prefix('/api')
