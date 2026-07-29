import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import ShoppingList from '#models/shopping_list'

export default class ShoppingListItem extends BaseModel {
  static table = 'shopping_list_items'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'shopping_list_id' })
  declare shoppingListId: number

  @belongsTo(() => ShoppingList)
  declare shoppingList: BelongsTo<typeof ShoppingList>

  @column()
  declare nome: string

  @column()
  declare quantidade: number

  @column({ columnName: 'preco_original' })
  declare precoOriginal: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
