import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'price_daily'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.integer('product_id').unsigned().notNullable().references('id').inTable('products').onDelete('CASCADE')
      table.date('dia').notNullable()
      table.decimal('preco_varejo', 12, 2).nullable()
      table.decimal('preco_atacado', 12, 2).nullable()
      table.boolean('disponivel').notNullable().defaultTo(true)
      table.enum('fonte', ['captura', 'forward_fill']).notNullable()

      table.unique(['product_id', 'dia'])
      table.index(['dia'])
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
