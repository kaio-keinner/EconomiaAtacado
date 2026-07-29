import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class ScraperRun extends BaseModel {
  static table = 'scraper_runs'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare fonte: 'atacadao' | 'bigmaster' | 'sefaz'

  @column()
  declare status: 'success' | 'failed'

  @column({ columnName: 'itens_coletados' })
  declare itensColetados: number

  @column()
  declare erro: string | null

  @column({ columnName: 'duracao_ms' })
  declare duracaoMs: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
