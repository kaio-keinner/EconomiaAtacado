import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('shopping_lists', (table) => {
      table.increments('id')
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('nome').notNullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })

    this.schema.createTable('shopping_list_items', (table) => {
      table.increments('id')
      table.integer('shopping_list_id').unsigned().notNullable().references('id').inTable('shopping_lists').onDelete('CASCADE')
      table.string('nome').notNullable()
      table.decimal('quantidade', 10, 2).notNullable().defaultTo(1)
      table.decimal('preco_original', 10, 2).nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable('shopping_list_items')
    this.schema.dropTable('shopping_lists')
  }
}
