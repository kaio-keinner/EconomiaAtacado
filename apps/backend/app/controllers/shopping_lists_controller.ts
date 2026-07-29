import type { HttpContext } from '@adonisjs/core/http'
import ShoppingList from '#models/shopping_list'
import ShoppingListItem from '#models/shopping_list_item'
import Subscription from '#models/subscription'
import PriceComparisonService from '#services/price_comparison_service'

export default class ShoppingListsController {
  // GET /api/shopping-lists
  async index({ auth, response }: HttpContext) {
    try {
      const user = auth.user!
      const lists = await ShoppingList.query()
        .where('userId', user.id)
        .preload('items')
        .orderBy('createdAt', 'desc')

      return response.ok({ lists })
    } catch (error: any) {
      return response.internalServerError({ error: error.message })
    }
  }

  // POST /api/shopping-lists
  async store({ auth, request, response }: HttpContext) {
    try {
      const user = auth.user!
      
      // Checa os limites do plano
      const sub = await Subscription.findBy('userId', user.id)
      const isPro = sub && sub.plan === 'pro' && sub.status === 'active'

      if (!isPro) {
        const listCount = await ShoppingList.query().where('userId', user.id).count('* as total')
        const total = Number((listCount[0] as any).$extras.total || 0)
        if (total >= 3) {
          return response.forbidden({
            error: 'LIMIT_REACHED',
            mensagem: 'Usuários do plano Gratuito podem criar no máximo 3 listas salvas. Faça upgrade para o Plano Pro para ter listas ilimitadas.',
          })
        }
      }

      const { nome, items } = request.only(['nome', 'items']) as {
        nome: string
        items?: Array<{ nome: string; quantidade: number; precoOriginal?: number }>
      }

      if (!nome) {
        return response.badRequest({ error: 'O nome da lista é obrigatório' })
      }

      const list = await ShoppingList.create({
        userId: user.id,
        nome,
      })


      if (Array.isArray(items) && items.length > 0) {
        await ShoppingListItem.createMany(
          items.map((item) => ({
            shoppingListId: list.id,
            nome: item.nome,
            quantidade: item.quantidade || 1,
            precoOriginal: item.precoOriginal ?? null,
          }))
        )
      }

      await list.load('items')

      return response.created({ mensagem: 'Lista de compras criada com sucesso', list })
    } catch (error: any) {
      return response.internalServerError({ error: error.message })
    }
  }

  // GET /api/shopping-lists/:id
  async show({ auth, params, response }: HttpContext) {
    try {
      const user = auth.user!
      const list = await ShoppingList.query()
        .where('id', params.id)
        .where('userId', user.id)
        .preload('items')
        .first()

      if (!list) {
        return response.notFound({ error: 'Lista de compras não encontrada' })
      }

      return response.ok({ list })
    } catch (error: any) {
      return response.internalServerError({ error: error.message })
    }
  }

  // PUT /api/shopping-lists/:id
  async update({ auth, params, request, response }: HttpContext) {
    try {
      const user = auth.user!
      const list = await ShoppingList.query()
        .where('id', params.id)
        .where('userId', user.id)
        .first()

      if (!list) {
        return response.notFound({ error: 'Lista de compras não encontrada' })
      }

      const { nome, items } = request.only(['nome', 'items']) as {
        nome?: string
        items?: Array<{ nome: string; quantidade: number; precoOriginal?: number }>
      }

      if (nome) {
        list.nome = nome
        await list.save()
      }

      if (Array.isArray(items)) {
        // Substitui todos os itens existentes da lista
        await ShoppingListItem.query().where('shoppingListId', list.id).delete()
        if (items.length > 0) {
          await ShoppingListItem.createMany(
            items.map((item) => ({
              shoppingListId: list.id,
              nome: item.nome,
              quantidade: item.quantidade || 1,
              precoOriginal: item.precoOriginal ?? null,
            }))
          )
        }
      }

      await list.load('items')

      return response.ok({ mensagem: 'Lista atualizada com sucesso', list })
    } catch (error: any) {
      return response.internalServerError({ error: error.message })
    }
  }

  // DELETE /api/shopping-lists/:id
  async destroy({ auth, params, response }: HttpContext) {
    try {
      const user = auth.user!
      const list = await ShoppingList.query()
        .where('id', params.id)
        .where('userId', user.id)
        .first()

      if (!list) {
        return response.notFound({ error: 'Lista de compras não encontrada' })
      }

      await list.delete()

      return response.ok({ mensagem: 'Lista de compras removida com sucesso' })
    } catch (error: any) {
      return response.internalServerError({ error: error.message })
    }
  }

  // POST /api/shopping-lists/:id/compare
  async compare({ auth, params, response }: HttpContext) {
    try {
      const user = auth.user!
      const list = await ShoppingList.query()
        .where('id', params.id)
        .where('userId', user.id)
        .preload('items')
        .first()

      if (!list) {
        return response.notFound({ error: 'Lista de compras não encontrada' })
      }

      const inputItems = list.items.map((i) => ({
        nome: i.nome,
        quantidade: Number(i.quantidade),
        precoOriginal: i.precoOriginal ? Number(i.precoOriginal) : undefined,
      }))

      const comparison = await PriceComparisonService.compareList(inputItems)

      return response.ok({
        listId: list.id,
        nome: list.nome,
        comparison,
      })
    } catch (error: any) {
      return response.internalServerError({ error: error.message })
    }
  }
}
