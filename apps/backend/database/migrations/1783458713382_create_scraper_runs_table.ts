import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'scraper_runs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('fonte').notNullable() // 'atacadao' | 'bigmaster' | 'sefaz'
      table.string('status').notNullable() // 'success' | 'failed'
      table.integer('itens_coletados').notNullable().defaultTo(0)
      table.text('erro').nullable()
      table.integer('duracao_ms').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.index(['fonte', 'created_at'])
      table.index(['status', 'created_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
