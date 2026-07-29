import { test } from '@japa/runner'
import ProductTransformer from '#transformers/product_transformer'
import Product from '#models/product'

test.group('ProductTransformer Unit Tests', () => {
  test('transforms product model into clean object structure', ({ assert }) => {
    const fakeProduct = new Product()
    fakeProduct.id = 42
    fakeProduct.sku = 'SKU123'
    fakeProduct.nome = 'Sabão em Pó Omo 1kg'
    fakeProduct.marca = 'Omo'
    fakeProduct.disponivel = true
    fakeProduct.precoVarejo = 15.9
    fakeProduct.precoAtacado = 14.5
    fakeProduct.quantidadeMinimaAtacado = 3
    fakeProduct.imagemUrl = 'https://cdn.meusite.com/omo.jpg'
    fakeProduct.origem = 'atacadao'
    fakeProduct.externalId = 'atacadao_42'
    fakeProduct.categoria1 = 'Limpeza'
    fakeProduct.categoria2 = 'Sabão em Pó'

    const transformer = new ProductTransformer(fakeProduct)
    const result = transformer.toObject()

    assert.equal(result.id, 42)
    assert.equal(result.nome, 'Sabão em Pó Omo 1kg')
    assert.equal(result.precoVarejo, 15.9)
    assert.equal(result.origem, 'atacadao')
    assert.equal(result.categoria1, 'Limpeza')
  })
})
