import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Product from '#models/product'

export default class PriceAlert extends BaseModel {
  static table = 'price_alerts'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'user_id' })
  declare userId: number

  @column({ columnName: 'product_id' })
  declare productId: number

  @column()
  declare tipo: 'abaixo_de' | 'qualquer_queda'

  @column({ columnName: 'preco_alvo' })
  declare precoAlvo: number | null

  @column()
  declare ativo: boolean

  @column.dateTime({ columnName: 'ultimo_disparo_em' })
  declare ultimoDisparoEm: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Product)
  declare product: BelongsTo<typeof Product>
}
