import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'receipts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('chave_acesso', 44).notNullable().unique().index()
      table.string('estabelecimento').notNullable()
      table.string('cnpj').nullable()
      table.timestamp('data_emissao').notNullable()
      table.decimal('valor_total', 10, 2).notNullable()
      table.string('forma_pagamento').nullable()
      table.string('consumidor_cpf').nullable()
      table.string('consumidor_nome').nullable()
      table.text('itens').notNullable() // Guardará o JSON serializado com os itens comprados
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
