import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'product_matches'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('atacadao_product_id').unsigned().notNullable().references('id').inTable('products').onDelete('CASCADE')
      table.integer('bigmaster_product_id').unsigned().notNullable().references('id').inTable('products').onDelete('CASCADE')
      table.decimal('score', 5, 4).notNullable().defaultTo(0)
      table.string('status').notNullable().defaultTo('auto') // 'auto' | 'manual' | 'rejected'
      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.unique(['atacadao_product_id', 'bigmaster_product_id'])
      table.index(['atacadao_product_id', 'score'])
      table.index(['bigmaster_product_id', 'score'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
