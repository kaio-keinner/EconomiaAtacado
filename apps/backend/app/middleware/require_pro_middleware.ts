import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import Subscription from '#models/subscription'

export default class RequireProMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user
    if (!user) {
      return ctx.response.unauthorized({ error: 'Usuário não autenticado' })
    }

    const subscription = await Subscription.findBy('userId', user.id)

    const isPro = subscription && subscription.plan === 'pro' && subscription.status === 'active'

    if (!isPro) {
      return ctx.response.forbidden({
        error: 'PLAN_LIMIT',
        mensagem: 'Esta funcionalidade é exclusiva para assinantes do Plano Pro (R$ 10,00/mês).',
        upgradeUrl: '/subscriptions/checkout',
      })
    }

    return next()
  }
}
