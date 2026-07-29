import type { HttpContext } from '@adonisjs/core/http'
import ScraperHealthService from '#services/scraper_health_service'

export default class ScrapersController {
  // GET /api/scrapers/health
  async health({ response }: HttpContext) {
    try {
      const dashboard = await ScraperHealthService.getDashboard()
      return response.ok({ health: dashboard })
    } catch (error: any) {
      return response.internalServerError({ error: error.message })
    }
  }
}
