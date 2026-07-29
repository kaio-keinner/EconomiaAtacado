import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'price_history'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('product_id').unsigned().notNullable().references('id').inTable('products').onDelete('CASCADE')
      table.decimal('preco_varejo', 10, 2).nullable()
      table.decimal('preco_atacado', 10, 2).nullable()
      table.boolean('disponivel').notNullable().defaultTo(false)
      table.timestamp('capturado_em').notNullable()
      table.index(['product_id', 'capturado_em'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
