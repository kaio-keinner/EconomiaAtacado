import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class BasketIndex extends BaseModel {
  static table = 'basket_index'

  @column({ isPrimary: true })
  declare id: number

  @column.date({ columnName: 'dia' })
  declare dia: DateTime

  @column()
  declare origem: string

  @column()
  declare indice: number

  @column({ columnName: 'produtos_considerados' })
  declare produtosConsiderados: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
