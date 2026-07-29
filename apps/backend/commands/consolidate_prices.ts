import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class ConsolidatePrices extends BaseCommand {
  static commandName = 'price:consolidate'
  static description = 'Consolida a série diária de preços (price_daily) com forward-fill'

  static options: CommandOptions = {
    startApp: true,
  }

  @flags.number({ description: 'Quantidade de dias passados para fazer backfill', default: 30 })
  declare dias: number

  async run() {
    const { default: PriceDailyService } = await import('#services/price_daily_service')

    this.logger.info(`Iniciando consolidação diária de preços para os últimos ${this.dias} dias...`)
    const result = await PriceDailyService.backfill(this.dias)
    this.logger.success(`Consolidação concluída! ${result.totalRecords} registros consolidados em ${result.totalDays} dias.`)
  }
}
