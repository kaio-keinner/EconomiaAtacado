import type { HttpContext } from '@adonisjs/core/http'
import Receipt from '#models/receipt'
import { syncQueue } from '#services/queue_service'

export default class ReceiptsController {
  // GET /api/receipts
  async index({ auth, response }: HttpContext) {
    try {
      const user = auth.user!
      const receipts = await Receipt.query().where('userId', user.id).orderBy('createdAt', 'desc')
      const formatted = receipts.map((r) => {
        const serialized = r.serialize()
        return {
          ...serialized,
          itens: JSON.parse(r.itens),
        }
      })
      return response.ok({ receipts: formatted })
    } catch (error: any) {
      return response.internalServerError({ error: error.message })
    }
  }

  // POST /api/receipts
  async store({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const rawInput = request.input('chaveAcesso') || request.input('qrCodeUrl') || ''
    
    // Extrai apenas os números
    const digits = rawInput.replace(/\D/g, '')
    const match = digits.match(/\d{44}/)
    
    if (!match) {
      return response.badRequest({ error: 'Chave de acesso inválida ou não encontrada. Verifique se o código possui os 44 números.' })
    }
    
    const chave = match[0]
    
    try {
      // Verifica se já está cadastrado para este usuário
      let receipt = await Receipt.query().where('chaveAcesso', chave).where('userId', user.id).first()
      if (receipt) {
        return response.ok({
          mensagem: 'Cupom já importado anteriormente',
          receipt: {
            ...receipt.serialize(),
            itens: JSON.parse(receipt.itens),
          },
        })
      }

      // Enfileira o job de scraping da SEFAZ em segundo plano vinculando ao usuário
      const job = await syncQueue.add('sefaz_scrape', {
        type: 'sefaz_scrape',
        payload: { rawInput, chave, userId: user.id },
      })

      return response.accepted({
        mensagem: 'Leitura do cupom iniciada em segundo plano',
        jobId: job.id,
        status: 'queued',
      })
    } catch (error: any) {
      return response.internalServerError({ error: error.message })
    }
  }
}



