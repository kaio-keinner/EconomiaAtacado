import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export default class Subscription extends BaseModel {
  static table = 'subscriptions'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'user_id' })
  declare userId: number

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @column({ columnName: 'stripe_customer_id' })
  declare stripeCustomerId: string | null

  @column({ columnName: 'stripe_subscription_id' })
  declare stripeSubscriptionId: string | null

  @column()
  declare plan: 'free' | 'pro'

  @column()
  declare status: 'active' | 'canceled' | 'past_due' | 'incomplete'

  @column.dateTime({ columnName: 'current_period_end' })
  declare currentPeriodEnd: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
