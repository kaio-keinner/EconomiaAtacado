import type { HttpContext } from '@adonisjs/core/http'
import ProductMatch from '#models/product_match'
import { syncQueue } from '#services/queue_service'

export default class ProductMatchesController {
  // GET /api/matches
  async index({ request, response }: HttpContext) {
    try {
      const status = request.input('status') // 'auto' | 'manual' | 'rejected'
      const minScore = request.input('minScore')

      const query = ProductMatch.query()
        .preload('atacadaoProduct')
        .preload('bigmasterProduct')
        .orderBy('score', 'desc')

      if (status) {
        query.where('status', status)
      }

      if (minScore) {
        query.where('score', '>=', Number(minScore))
      }

      const matches = await query

      return response.ok({ matches })
    } catch (error: any) {
      return response.internalServerError({ error: error.message })
    }
  }

  // POST /api/matches (Criar ou sobrescrever pareamento manual)
  async store({ request, response }: HttpContext) {
    try {
      const { atacadaoProductId, bigmasterProductId, score } = request.only([
        'atacadaoProductId',
        'bigmasterProductId',
        'score',
      ])

      if (!atacadaoProductId || !bigmasterProductId) {
        return response.badRequest({ error: 'atacadaoProductId e bigmasterProductId são obrigatórios' })
      }

      let match = await ProductMatch.query()
        .where('atacadaoProductId', atacadaoProductId)
        .where('bigmasterProductId', bigmasterProductId)
        .first()

      if (match) {
        match.status = 'manual'
        match.score = score ? Number(score) : 1.0
        await match.save()
      } else {
        match = await ProductMatch.create({
          atacadaoProductId,
          bigmasterProductId,
          score: score ? Number(score) : 1.0,
          status: 'manual',
        })
      }

      await match.load('atacadaoProduct')
      await match.load('bigmasterProduct')

      return response.ok({ mensagem: 'Pareamento manual gravado com sucesso', match })
    } catch (error: any) {
      return response.internalServerError({ error: error.message })
    }
  }

  // PATCH /api/matches/:id/reject (Marcar pareamento incorreto como rejeitado)
  async reject({ params, response }: HttpContext) {
    try {
      const match = await ProductMatch.find(params.id)
      if (!match) {
        return response.notFound({ error: 'Pareamento não encontrado' })
      }

      match.status = 'rejected'
      await match.save()

      return response.ok({ mensagem: 'Pareamento marcado como rejeitado com sucesso', match })
    } catch (error: any) {
      return response.internalServerError({ error: error.message })
    }
  }

  // POST /api/matches/recompute (Disparar repareamento automático em lote via worker)
  async recompute({ response }: HttpContext) {
    try {
      const job = await syncQueue.add('recompute_product_matches', {
        type: 'recompute_product_matches',
      })

      return response.accepted({
        mensagem: 'Repareamento de catálogo iniciado em segundo plano',
        jobId: job.id,
        status: 'queued',
      })
    } catch (error: any) {
      return response.internalServerError({ error: error.message })
    }
  }
}
