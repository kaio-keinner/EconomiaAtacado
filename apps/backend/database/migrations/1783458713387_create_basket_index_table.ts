import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'basket_index'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.date('dia').notNullable()
      table.string('origem', 50).notNullable()
      table.decimal('indice', 12, 2).notNullable()
      table.integer('produtos_considerados').notNullable()

      table.unique(['dia', 'origem'])
      table.index(['dia'])
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
