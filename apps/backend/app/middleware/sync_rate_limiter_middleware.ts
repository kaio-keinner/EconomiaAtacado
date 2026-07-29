import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { Redis } from 'ioredis'
import { connection } from '#services/queue_service'


let redisClient: Redis | null = null
const inMemoryCache = new Map<string, number>()

function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      ...connection,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    })
    redisClient.on('error', () => {
      // Captura e previne evento 'error' não tratado no console quando o Redis está offline
    })
  }
  return redisClient
}

export default class SyncRateLimiterMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth?.user
    const identifier = user ? `user:${user.id}` : `ip:${ctx.request.ip()}`

    const windowSeconds = 120 // Padrão: 2 minutos de cooldown por usuário/IP para cada rota de sync/scrape
    const routeKey = ctx.request.url()
    const cacheKey = `rate_limit:sync:${identifier}:${routeKey}`
    const now = Math.floor(Date.now() / 1000)

    try {
      const redis = getRedisClient()
      const ttl = await redis.ttl(cacheKey)

      if (ttl > 0) {
        return ctx.response.tooManyRequests({
          error: 'ERR_RATE_LIMIT_EXCEEDED',
          mensagem: `Limite de requisições de sincronização atingido. Por favor, aguarde ${ttl} segundos antes de tentar novamente.`,
          retryAfter: ttl,
        })
      }

      await redis.set(cacheKey, '1', 'EX', windowSeconds)
    } catch {
      // Fallback em memória caso o servidor Redis não esteja rodando localmente
      const expireTime = inMemoryCache.get(cacheKey) || 0
      if (expireTime > now) {
        const retryAfter = expireTime - now
        return ctx.response.tooManyRequests({
          error: 'ERR_RATE_LIMIT_EXCEEDED',
          mensagem: `Limite de requisições de sincronização atingido. Por favor, aguarde ${retryAfter} segundos antes de tentar novamente.`,
          retryAfter,
        })
      }
      inMemoryCache.set(cacheKey, now + windowSeconds)
    }

    return next()
  }
}
