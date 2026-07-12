import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Receipt extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'chave_acesso' })
  declare chaveAcesso: string

  @column()
  declare estabelecimento: string

  @column()
  declare cnpj: string | null

  @column.dateTime({ columnName: 'data_emissao' })
  declare dataEmissao: DateTime

  @column({ columnName: 'valor_total' })
  declare valorTotal: number

  @column({ columnName: 'forma_pagamento' })
  declare formaPagamento: string | null

  @column({ columnName: 'consumidor_cpf' })
  declare consumidorCpf: string | null

  @column({ columnName: 'consumidor_nome' })
  declare consumidorNome: string | null

  @column()
  declare itens: string // JSON string contendo a lista de itens do cupom

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
