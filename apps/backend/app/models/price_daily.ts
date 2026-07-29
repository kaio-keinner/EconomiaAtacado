import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Product from '#models/product'

export default class PriceDaily extends BaseModel {
  static table = 'price_daily'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'product_id' })
  declare productId: number

  @column.date({ columnName: 'dia' })
  declare dia: DateTime

  @column({ columnName: 'preco_varejo' })
  declare precoVarejo: number | null

  @column({ columnName: 'preco_atacado' })
  declare precoAtacado: number | null

  @column()
  declare disponivel: boolean

  @column()
  declare fonte: 'captura' | 'forward_fill'

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Product)
  declare product: BelongsTo<typeof Product>
}
