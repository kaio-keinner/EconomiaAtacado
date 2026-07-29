import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'subscriptions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('user_id').unsigned().notNullable().unique().references('id').inTable('users').onDelete('CASCADE')
      table.string('stripe_customer_id').nullable()
      table.string('stripe_subscription_id').nullable()
      table.string('plan').notNullable().defaultTo('free') // 'free' | 'pro'
      table.string('status').notNullable().defaultTo('active') // 'active' | 'canceled' | 'past_due'
      table.timestamp('current_period_end').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
