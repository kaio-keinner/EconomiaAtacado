import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Product from '#models/product'

export default class ProductMatch extends BaseModel {
  static table = 'product_matches'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'atacadao_product_id' })
  declare atacadaoProductId: number

  @belongsTo(() => Product, { foreignKey: 'atacadaoProductId' })
  declare atacadaoProduct: BelongsTo<typeof Product>

  @column({ columnName: 'bigmaster_product_id' })
  declare bigmasterProductId: number

  @belongsTo(() => Product, { foreignKey: 'bigmasterProductId' })
  declare bigmasterProduct: BelongsTo<typeof Product>

  @column()
  declare score: number

  @column()
  declare status: 'auto' | 'manual' | 'rejected'

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
