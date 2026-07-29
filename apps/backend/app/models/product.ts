import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import PriceHistory from '#models/price_history'
import PriceDaily from '#models/price_daily'

export default class Product extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'external_id' })
  declare externalId: string

  @column()
  declare sku: string | null

  @column()
  declare nome: string

  @column()
  declare marca: string | null

  @column()
  declare disponivel: boolean

  @column({ columnName: 'preco_varejo' })
  declare precoVarejo: number | null

  @column({ columnName: 'preco_atacado' })
  declare precoAtacado: number | null

  @column({ columnName: 'quantidade_minima_atacado' })
  declare quantidadeMinimaAtacado: number | null

  @column({ columnName: 'quantidade_base' })
  declare quantidadeBase: number | null

  @column({ columnName: 'unidade_base' })
  declare unidadeBase: string | null

  @column({ columnName: 'imagem_url' })
  declare imagemUrl: string | null

  @column({ columnName: 'imagem_id' })
  declare imagemId: string | null

  @column({ columnName: 'preco_referencia' })
  declare precoReferencia: number | null

  @column.dateTime({ columnName: 'referencia_calculada_em' })
  declare referenciaCalculadaEm: DateTime | null

  @column({ columnName: 'categoria_1' })
  declare categoria1: string

  @column({ columnName: 'categoria_2' })
  declare categoria2: string

  @column()
  declare origem: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasMany(() => PriceHistory)
  declare priceHistory: HasMany<typeof PriceHistory>

  @hasMany(() => PriceDaily)
  declare priceDaily: HasMany<typeof PriceDaily>
}