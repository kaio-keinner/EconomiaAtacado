import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'products'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('external_id').notNullable().unique()
      table.string('sku').nullable()
      table.string('nome').notNullable()
      table.string('marca').nullable()
      table.boolean('disponivel').notNullable().defaultTo(false)
      table.decimal('preco_varejo', 10, 2).nullable()
      table.decimal('preco_atacado', 10, 2).nullable()
      table.integer('quantidade_minima_atacado').nullable()
      table.string('imagem_url').nullable()
      table.string('categoria_1').notNullable()
      table.string('categoria_2').notNullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}