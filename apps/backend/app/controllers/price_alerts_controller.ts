import type { HttpContext } from '@adonisjs/core/http'
import PriceAlert from '#models/price_alert'
import Product from '#models/product'

export default class PriceAlertsController {
  // GET /api/price-alerts
  async index({ auth, response }: HttpContext) {
    try {
      const user = auth.user!
      const alerts = await PriceAlert.query()
        .where('user_id', user.id)
        .preload('product')
        .orderBy('created_at', 'desc')

      return response.ok({ alerts })
    } catch (error: any) {
      return response.internalServerError({ error: error.message })
    }
  }

  // POST /api/price-alerts
  async store({ auth, request, response }: HttpContext) {
    try {
      const user = auth.user!
      const { productId, tipo, precoAlvo } = request.only(['productId', 'tipo', 'precoAlvo'])

      if (!productId) {
        return response.badRequest({ error: 'O id do produto é obrigatório.' })
      }

      const product = await Product.find(productId)
      if (!product) {
        return response.notFound({ error: 'Produto não encontrado.' })
      }

      // Verifica se já existe um alerta ativo para o mesmo produto/tipo
      const existing = await PriceAlert.query()
        .where('user_id', user.id)
        .where('product_id', productId)
        .first()

      if (existing) {
        existing.tipo = tipo || 'qualquer_queda'
        existing.precoAlvo = precoAlvo ? Number(precoAlvo) : null
        existing.ativo = true
        await existing.save()

        return response.ok({
          mensagem: 'Alerta de preço atualizado com sucesso!',
          alert: existing,
        })
      }

      const alert = await PriceAlert.create({
        userId: user.id,
        productId,
        tipo: tipo || 'qualquer_queda',
        precoAlvo: precoAlvo ? Number(precoAlvo) : null,
        ativo: true,
      })

      await alert.load('product')

      return response.created({
        mensagem: 'Alerta de preço criado com sucesso!',
        alert,
      })
    } catch (error: any) {
      return response.internalServerError({ error: error.message })
    }
  }

  // DELETE /api/price-alerts/:id
  async destroy({ auth, params, response }: HttpContext) {
    try {
      const user = auth.user!
      const alert = await PriceAlert.query()
        .where('id', params.id)
        .where('user_id', user.id)
        .first()

      if (!alert) {
        return response.notFound({ error: 'Alerta não encontrado.' })
      }

      await alert.delete()
      return response.ok({ mensagem: 'Alerta removido com sucesso.' })
    } catch (error: any) {
      return response.internalServerError({ error: error.message })
    }
  }
}
