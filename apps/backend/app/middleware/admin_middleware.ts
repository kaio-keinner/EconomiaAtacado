import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Middleware que restringe acesso a rotas administrativas.
 * Retorna 403 se o usuário não tiver role 'admin'.
 */
export default class AdminMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user
    if (!user) {
      return ctx.response.unauthorized({ error: 'Usuário não autenticado' })
    }

    if (user.role !== 'admin') {
      return ctx.response.forbidden({
        error: 'ACCESS_DENIED',
        mensagem: 'Apenas administradores podem acessar esta funcionalidade.',
      })
    }

    return next()
  }
}
