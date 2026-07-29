import logger from '@adonisjs/core/services/logger'

export default class SentryService {
  /**
   * Captura uma exceção não tratada e envia para o Sentry (se DSN estiver configurado)
   * e faz o log estruturado no Pino.
   */
  static captureException(error: any, context: Record<string, any> = {}) {
    logger.error({ ...context, err: error.message, stack: error.stack }, `[Sentry] Exception Captured: ${error.message}`)

    const dsn = process.env.SENTRY_DSN
    if (dsn) {
      // Integração segura quando o DSN do Sentry estiver presente em produção
      try {
        fetch(dsn, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exception: { values: [{ type: error.name || 'Error', value: error.message }] },
            extra: context,
            timestamp: new Date().toISOString(),
          }),
        }).catch(() => {})
      } catch {}
    }
  }
}
