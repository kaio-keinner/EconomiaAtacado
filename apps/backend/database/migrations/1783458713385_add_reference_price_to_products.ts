import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'products'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.decimal('preco_referencia', 12, 2).nullable().after('imagem_id')
      table.timestamp('referencia_calculada_em').nullable().after('preco_referencia')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('preco_referencia')
      table.dropColumn('referencia_calculada_em')
    })
  }
}
