import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Product from '#models/product'

export default class PriceHistory extends BaseModel {
  static table = 'price_history'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'product_id' })
  declare productId: number

  @column({ columnName: 'preco_varejo' })
  declare precoVarejo: number | null

  @column({ columnName: 'preco_atacado' })
  declare precoAtacado: number | null

  @column()
  declare disponivel: boolean

  @column.dateTime({ columnName: 'capturado_em' })
  declare capturadoEm: DateTime

  @belongsTo(() => Product)
  declare product: BelongsTo<typeof Product>
}
