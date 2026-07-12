import type { HttpContext } from '@adonisjs/core/http'
import Product from '#models/product'
import ProductTransformer from '#transformers/product_transformer'
import AtacadaoScraperService from '#services/atacadao_scraper_service'

export default class ProductsController {
  // GET /api/products?categoria1=pet-shop&categoria2=acessorios-pet-shop
  async index({ request, serialize }: HttpContext) {
    const categoria1 = request.input('categoria1')
    const categoria2 = request.input('categoria2')

    const query = Product.query().orderBy('createdAt', 'desc').limit(200)
    if (categoria1) query.where('categoria1', categoria1)
    if (categoria2) query.where('categoria2', categoria2)

    const products = await query

    return serialize({ products: ProductTransformer.transform(products) })
  }

  // POST /api/scrape  { categoria1, categoria2, maxPaginas? }
  async scrape({ request, response }: HttpContext) {
    const categoria1 = request.input('categoria1')
    const categoria2 = request.input('categoria2')

    if (!categoria1 || !categoria2) {
      return response.badRequest({ error: 'categoria1 e categoria2 são obrigatórios' })
    }

    try {
      const scraper = new AtacadaoScraperService()
      const produtos = await scraper.scrapeCategory(categoria1, categoria2, {
        maxPaginas: request.input('maxPaginas', 5),
        delayMs: 3000,
      })

      let salvos = 0
      for (const p of produtos) {
        if (!p.id) continue
        await Product.updateOrCreate(
          { externalId: p.id },
          {
            externalId: p.id,
            sku: p.sku,
            nome: p.nome ?? '',
            marca: p.marca,
            disponivel: p.disponivel,
            precoVarejo: p.precoVarejo,
            precoAtacado: p.precoAtacado,
            quantidadeMinimaAtacado: p.quantidadeMinimaAtacado,
            imagemUrl: p.imagemUrl,
            categoria1,
            categoria2,
          }
        )
        salvos++
      }

      return response.ok({ mensagem: 'Scrape concluído', total: salvos })
    } catch (error: any) {
      return response.internalServerError({ error: error.message })
    }
  }
}
