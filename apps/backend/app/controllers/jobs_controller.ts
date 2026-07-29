import type { HttpContext } from '@adonisjs/core/http'
import { syncQueue } from '#services/queue_service'

export default class JobsController {
  /**
   * GET /api/jobs/:jobId
   * Retorna status, progresso e resultado de um job em segundo plano
   */
  async show({ params, response }: HttpContext) {
    const { jobId } = params
    try {
      const job = await syncQueue.getJob(jobId)
      if (!job) {
        return response.notFound({ error: 'Job não encontrado' })
      }

      const state = await job.getState()
      let status = 'queued'
      if (state === 'active') status = 'running'
      else if (state === 'completed') status = 'completed'
      else if (state === 'failed') status = 'failed'

      return response.ok({
        jobId: job.id,
        status,
        progress: job.progress,
        result: job.returnvalue || null,
        failedReason: job.failedReason || null,
      })
    } catch (error: any) {
      return response.internalServerError({ error: error.message })
    }
  }
}
