import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { parseUnit } from '#utils/unit_parser'

export default class ParseUnits extends BaseCommand {
  static commandName = 'products:parse-units'
  static description = 'Extrai e preenche quantidade_base e unidade_base nos produtos do catálogo'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const { default: Product } = await import('#models/product')

    this.logger.info('Iniciando parsing de unidades nos produtos do catálogo...')

    const products = await Product.all()
    let parsedCount = 0

    for (const prod of products) {
      const parsed = parseUnit(prod.nome)
      if (parsed) {
        prod.quantidadeBase = parsed.quantidadeBase
        prod.unidadeBase = parsed.unidadeBase
        await prod.save()
        parsedCount++
      }
    }

    const percentage = ((parsedCount / products.length) * 100).toFixed(1)
    this.logger.success(`Parsing concluído! ${parsedCount} de ${products.length} produtos (${percentage}%) atualizados com unidade base.`)
  }
}
