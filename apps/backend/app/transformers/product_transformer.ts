import { BaseTransformer } from '@adonisjs/core/transformers'
import type Product from '#models/product'

export default class ProductTransformer extends BaseTransformer<Product> {
  toObject() {
    return {
      id: this.resource.id,
      sku: this.resource.sku,
      nome: this.resource.nome,
      marca: this.resource.marca,
      disponivel: this.resource.disponivel,
      precoVarejo: this.resource.precoVarejo,
      precoAtacado: this.resource.precoAtacado,
      quantidadeMinimaAtacado: this.resource.quantidadeMinimaAtacado,
      imagemUrl: this.resource.imagemUrl,
    }
  }
}
