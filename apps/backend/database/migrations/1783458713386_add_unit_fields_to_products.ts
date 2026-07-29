import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'products'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.decimal('quantidade_base', 12, 2).nullable().after('quantidade_minima_atacado')
      table.string('unidade_base', 20).nullable().after('quantidade_base')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('quantidade_base')
      table.dropColumn('unidade_base')
    })
  }
}
