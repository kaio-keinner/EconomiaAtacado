import type { HttpContext } from '@adonisjs/core/http'
import Subscription from '#models/subscription'
import Stripe from 'stripe'
import env from '#start/env'
import { DateTime } from 'luxon'

function getStripe(): Stripe | null {
  const secretKey = env.get('STRIPE_SECRET_KEY') || process.env.STRIPE_SECRET_KEY
  if (!secretKey) return null
  return new Stripe(secretKey, { apiVersion: '2025-02-24.acacia' as any })
}

export default class SubscriptionsController {
  // GET /api/subscriptions/me
  async me({ auth, response }: HttpContext) {
    try {
      const user = auth.user!
      let sub = await Subscription.findBy('userId', user.id)

      if (!sub) {
        sub = await Subscription.create({
          userId: user.id,
          plan: 'free',
          status: 'active',
        })
      }

      const isPro = sub.plan === 'pro' && sub.status === 'active'

      return response.ok({
        subscription: sub,
        limits: {
          plan: sub.plan,
          isPro,
          maxLists: isPro ? Infinity : 3,
          unlimitedSync: isPro,
        },
      })
    } catch (error: any) {
      return response.internalServerError({ error: error.message })
    }
  }

  // POST /api/subscriptions/checkout
  async checkout({ auth, request, response }: HttpContext) {
    try {
      const user = auth.user!
      const stripe = getStripe()

      const successUrl = request.input('successUrl') || `${env.get('APP_URL')}/account?status=success`
      const cancelUrl = request.input('cancelUrl') || `${env.get('APP_URL')}/account?status=canceled`

      if (stripe) {
        let sub = await Subscription.findBy('userId', user.id)

        let customerId = sub?.stripeCustomerId
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: user.email,
            name: user.fullName || user.email,
            metadata: { userId: String(user.id) },
          })
          customerId = customer.id
          if (sub) {
            sub.stripeCustomerId = customerId
            await sub.save()
          }
        }

        // Usar STRIPE_PRICE_ID_PRO do env se disponível, senão fallback para price_data
        const priceId = process.env.STRIPE_PRICE_ID_PRO

        const lineItems = priceId
          ? [{ price: priceId, quantity: 1 }]
          : [
              {
                price_data: {
                  currency: 'brl',
                  product_data: {
                    name: 'Plano Pro EconomiaAtacado',
                    description: 'Listas ilimitadas, histórico completo, promoções e alertas',
                  },
                  unit_amount: 1000, // R$ 10,00 / mês
                  recurring: { interval: 'month' as const },
                },
                quantity: 1,
              },
            ]

        const session = await stripe.checkout.sessions.create({
          customer: customerId,
          payment_method_types: ['card'],
          mode: 'subscription',
          line_items: lineItems,
          success_url: successUrl,
          cancel_url: cancelUrl,
          client_reference_id: String(user.id),
        })

        return response.ok({ checkoutUrl: session.url })
      } else {
        // Modo simulado APENAS em desenvolvimento — em produção, ausência da chave é erro
        const nodeEnv = process.env.NODE_ENV || 'development'
        if (nodeEnv === 'production') {
          console.error('[Stripe] STRIPE_SECRET_KEY ausente em produção! Checkout bloqueado.')
          return response.internalServerError({
            error: 'Configuração de pagamento ausente. Contate o suporte.',
          })
        }

        let sub = await Subscription.findBy('userId', user.id)
        if (!sub) {
          sub = await Subscription.create({
            userId: user.id,
            plan: 'pro',
            status: 'active',
            currentPeriodEnd: DateTime.now().plus({ month: 1 }),
          })
        } else {
          sub.plan = 'pro'
          sub.status = 'active'
          sub.currentPeriodEnd = DateTime.now().plus({ month: 1 })
          await sub.save()
        }

        return response.ok({
          simulated: true,
          mensagem: 'Assinatura Pro ativada com sucesso (modo demonstração/dev)!',
          subscription: sub,
        })
      }
    } catch (error: any) {
      return response.internalServerError({ error: error.message })
    }
  }

  // POST /api/subscriptions/portal
  async portal({ auth, response }: HttpContext) {
    try {
      const user = auth.user!
      const stripe = getStripe()

      if (!stripe) {
        return response.internalServerError({ error: 'Stripe não configurado' })
      }

      const sub = await Subscription.findBy('userId', user.id)
      if (!sub?.stripeCustomerId) {
        return response.badRequest({ error: 'Nenhuma assinatura Stripe encontrada para este usuário' })
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: sub.stripeCustomerId,
        return_url: `${env.get('APP_URL')}/account`,
      })

      return response.ok({ portalUrl: session.url })
    } catch (error: any) {
      return response.internalServerError({ error: error.message })
    }
  }

  // POST /api/webhooks/stripe
  async webhook({ request, response }: HttpContext) {
    const stripe = getStripe()
    if (!stripe) {
      return response.badRequest({ error: 'Stripe não está configurado no servidor' })
    }

    const sig = request.header('stripe-signature')
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    let event: Stripe.Event
    try {
      if (webhookSecret && sig) {
        const rawBody = request.raw()
        event = stripe.webhooks.constructEvent(rawBody!, sig, webhookSecret)
      } else {
        event = request.body() as Stripe.Event
      }
    } catch (err: any) {
      return response.badRequest({ error: `Webhook Signature Error: ${err.message}` })
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session
          const userIdStr = session.client_reference_id || session.metadata?.userId
          if (userIdStr) {
            const userId = Number(userIdStr)
            let sub = await Subscription.findBy('userId', userId)
            if (!sub) {
              sub = new Subscription()
              sub.userId = userId
            }
            sub.stripeCustomerId = (session.customer as string) || null
            sub.stripeSubscriptionId = (session.subscription as string) || null
            sub.plan = 'pro'
            sub.status = 'active'

            // Buscar current_period_end real do Stripe
            if (sub.stripeSubscriptionId) {
              try {
                const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId)
                sub.currentPeriodEnd = DateTime.fromSeconds(stripeSub.current_period_end)
              } catch {
                sub.currentPeriodEnd = DateTime.now().plus({ month: 1 })
              }
            } else {
              sub.currentPeriodEnd = DateTime.now().plus({ month: 1 })
            }

            await sub.save()
          }
          break
        }
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const subscriptionObj = event.data.object as Stripe.Subscription
          const customerId = subscriptionObj.customer as string
          const sub = await Subscription.findBy('stripeCustomerId', customerId)
          if (sub) {
            if (event.type === 'customer.subscription.deleted') {
              sub.plan = 'free'
              sub.status = 'canceled'
            } else {
              sub.status = subscriptionObj.status === 'active' ? 'active' : 'past_due'
              // Atualizar current_period_end real
              sub.currentPeriodEnd = DateTime.fromSeconds(subscriptionObj.current_period_end)
            }
            await sub.save()
          }
          break
        }
        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice
          const customerId = invoice.customer as string
          if (customerId) {
            const sub = await Subscription.findBy('stripeCustomerId', customerId)
            if (sub) {
              sub.status = 'past_due'
              await sub.save()
              console.warn(`[Stripe Webhook] Pagamento falhou para customer ${customerId}. Status marcado como past_due.`)
            }
          }
          break
        }
      }

      return response.ok({ received: true })
    } catch (error: any) {
      return response.internalServerError({ error: error.message })
    }
  }
}

