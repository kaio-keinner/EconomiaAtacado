import ScraperRun from '#models/scraper_run'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'

export default class ScraperHealthService {
  /**
   * Registra uma execução de scraper e dispara alertas caso haja falhas consecutivas.
   */
  static async recordRun(params: {
    fonte: 'atacadao' | 'bigmaster' | 'sefaz'
    status: 'success' | 'failed'
    itensColetados: number
    erro?: string | null
    duracaoMs?: number | null
  }): Promise<ScraperRun> {
    const run = await ScraperRun.create({
      fonte: params.fonte,
      status: params.status,
      itensColetados: params.itensColetados,
      erro: params.erro ?? null,
      duracaoMs: params.duracaoMs ?? null,
    })

    logger.info({ service: 'scraper_health', fonte: params.fonte, status: params.status, itensColetados: params.itensColetados }, `[ScraperRun] Fonte=${params.fonte} Status=${params.status} Itens=${params.itensColetados}`)

    if (params.status === 'failed') {
      await this.checkConsecutiveFailures(params.fonte)
    }

    return run
  }

  /**
   * Verifica se o scraper falhou X vezes consecutivas e gera alerta.
   */
  private static async checkConsecutiveFailures(fonte: 'atacadao' | 'bigmaster' | 'sefaz', threshold = 3) {
    const recentRuns = await ScraperRun.query()
      .where('fonte', fonte)
      .orderBy('createdAt', 'desc')
      .limit(threshold)

    const allFailed = recentRuns.length >= threshold && recentRuns.every((r) => r.status === 'failed')

    if (allFailed) {
      const alertMsg = `🚨 [ALERTA CRÍTICO DE SCRAPER] O scraper da fonte '${fonte}' falhou ${threshold} vezes consecutivas! Último erro: ${recentRuns[0]?.erro || 'Sem mensagem'}`
      
      logger.error(
        {
          service: 'scraper_health',
          alert: 'CONSECUTIVE_FAILURES',
          fonte,
          consecutiveFailures: threshold,
          lastError: recentRuns[0]?.erro,
        },
        alertMsg
      )

      // Simulação de envio de webhook/Slack/Email de alerta
      this.sendSlackAlert(alertMsg).catch((err) =>
        logger.warn({ service: 'scraper_health', err: err.message }, 'Falha ao enviar alerta no Slack')
      )
    }
  }

  /**
   * Envia alerta para Webhook (Slack / Discord / Teams) se SLACK_WEBHOOK_URL estiver configurado
   */
  private static async sendSlackAlert(message: string) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (!webhookUrl) return

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message }),
      })
    } catch (e: any) {
      logger.error({ service: 'scraper_health', error: e.message }, 'Erro ao disparar webhook de alerta')
    }
  }

  /**
   * Retorna métricas de saúde dos últimos 7 dias para o dashboard.
   */
  static async getDashboard() {
    const fontes: Array<'atacadao' | 'bigmaster' | 'sefaz'> = ['atacadao', 'bigmaster', 'sefaz']
    const sevenDaysAgo = DateTime.now().minus({ days: 7 }).toJSDate()

    const dashboard: Record<string, any> = {}

    for (const fonte of fontes) {
      const lastRun = await ScraperRun.query().where('fonte', fonte).orderBy('createdAt', 'desc').first()
      const runs7d = await ScraperRun.query()
        .where('fonte', fonte)
        .where('createdAt', '>=', sevenDaysAgo)

      const totalRuns = runs7d.length
      const successRuns = runs7d.filter((r) => r.status === 'success').length
      const successRate = totalRuns > 0 ? Number(((successRuns / totalRuns) * 100).toFixed(1)) : 100

      dashboard[fonte] = {
        fonte,
        ultimaExecucao: lastRun ? lastRun.createdAt : null,
        ultimoStatus: lastRun ? lastRun.status : 'desconhecido',
        ultimoErro: lastRun ? lastRun.erro : null,
        totalRuns7d: totalRuns,
        successRuns7d: successRuns,
        successRate7d: `${successRate}%`,
      }
    }

    return dashboard
  }
}
