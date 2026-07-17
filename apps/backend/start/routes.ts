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
import app from '@adonisjs/core/services/app'
import { createReadStream, existsSync } from 'node:fs'
import path from 'node:path'

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
    router.get('/receipts', [ReceiptsController, 'index'])
    router.post('/receipts', [ReceiptsController, 'store'])
    router.post('/bigmaster/sync', [ComparisonController, 'syncBigMaster'])
    router.post('/bigmaster/sync-images', [ProductsController, 'syncImages'])
    router.post('/compare', [ComparisonController, 'compare'])
  })
  .prefix('/api')

/*
|--------------------------------------------------------------------------
| Static file serving for /uploads/*
|--------------------------------------------------------------------------
| @adonisjs/static is incompatible with AdonisJS v7, so we serve
| product images from public/uploads/ via a dedicated route.
*/
router.get('/uploads/:filename', async ({ params, response }) => {
  const filePath = path.join(app.makePath('public/uploads'), params.filename)

  if (!existsSync(filePath)) {
    return response.notFound({ error: 'Arquivo não encontrado' })
  }

  const ext = path.extname(params.filename).toLowerCase()
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  }

  response.header('Content-Type', mimeTypes[ext] || 'application/octet-stream')
  response.header('Cache-Control', 'public, max-age=86400')
  return response.stream(createReadStream(filePath))
})

