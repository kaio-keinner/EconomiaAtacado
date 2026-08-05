import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'price_alerts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.integer('product_id').unsigned().notNullable().references('id').inTable('products').onDelete('CASCADE')
      table.enum('tipo', ['abaixo_de', 'qualquer_queda']).notNullable().defaultTo('qualquer_queda')
      table.decimal('preco_alvo', 12, 2).nullable()
      table.boolean('ativo').notNullable().defaultTo(true)
      table.timestamp('ultimo_disparo_em').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
