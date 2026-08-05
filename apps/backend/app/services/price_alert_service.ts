import { DateTime } from 'luxon'
import PriceAlert from '#models/price_alert'
import PriceDaily from '#models/price_daily'

export default class PriceAlertService {
  /**
   * Avalia todos os alertas ativos.
   * Aplica cooldown de 48 horas (não dispara o mesmo alerta duas vezes em 48h).
   */
  static async evaluateAlerts(): Promise<{ totalEvaluated: number; triggeredCount: number }> {
    const alerts = await PriceAlert.query()
      .where('ativo', true)
      .preload('product')
      .preload('user')

    let triggeredCount = 0
    const now = DateTime.now()
    const cooldownLimit = now.minus({ hours: 48 })

    for (const alert of alerts) {
      // Cooldown 48h check
      if (alert.ultimoDisparoEm && alert.ultimoDisparoEm > cooldownLimit) {
        continue
      }

      const prod = alert.product
      if (!prod || !prod.disponivel) continue

      const precoAtual = Number(prod.precoVarejo ?? prod.precoAtacado ?? 0)
      if (precoAtual <= 0) continue

      let shouldTrigger = false

      if (alert.tipo === 'abaixo_de') {
        const alvo = Number(alert.precoAlvo ?? 0)
        if (alvo > 0 && precoAtual <= alvo) {
          shouldTrigger = true
        }
      } else if (alert.tipo === 'qualquer_queda') {
        // Pega penúltimo registro em price_daily para comparar se o preço caiu
        const dailyRecords = await PriceDaily.query()
          .where('product_id', prod.id)
          .orderBy('dia', 'desc')
          .limit(2)

        if (dailyRecords.length >= 2) {
          const ultimoPreco = Number(dailyRecords[0].precoVarejo ?? dailyRecords[0].precoAtacado ?? 0)
          const penultimoPreco = Number(dailyRecords[1].precoVarejo ?? dailyRecords[1].precoAtacado ?? 0)

          if (ultimoPreco < penultimoPreco) {
            shouldTrigger = true
          }
        }
      }

      if (shouldTrigger) {
        alert.ultimoDisparoEm = now
        await alert.save()
        triggeredCount++

        console.log(
          `[PriceAlert Engine] ALERTA DISPARADO! Usuário #${alert.userId} (${alert.user?.email}): ` +
          `Produto "${prod.nome}" atingiu o preço R$ ${precoAtual.toFixed(2)} (Tipo: ${alert.tipo})`
        )
      }
    }

    return { totalEvaluated: alerts.length, triggeredCount }
  }
}
