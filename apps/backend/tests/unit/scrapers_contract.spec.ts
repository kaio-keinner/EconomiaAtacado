import { test } from '@japa/runner'
import fs from 'node:fs'
import path from 'node:path'
import * as cheerio from 'cheerio'

test.group('Scrapers Contract Tests (Fixtures Validation)', () => {
  test('BigMaster contract response satisfies expected structure', ({ assert }) => {
    const fixturePath = path.join(process.cwd(), 'tests/fixtures/bigmaster_response.json')
    assert.isTrue(fs.existsSync(fixturePath), 'Fixture bigmaster_response.json deve existir')

    const data = JSON.parse(fs.readFileSync(fixturePath, 'utf8'))

    assert.isObject(data)
    assert.property(data, 'id')
    assert.property(data, 'descricao')
    assert.property(data, 'itens')
    assert.isArray(data.itens)

    for (const item of data.itens) {
      assert.property(item, 'id')
      assert.property(item, 'preco')
      assert.property(item, 'descricao')
      assert.property(item, 'departamentoId')
      assert.isTrue(Boolean(item.id && item.preco && item.descricao))
    }
  })

  test('Atacadão GraphQL contract response satisfies expected structure', ({ assert }) => {
    const fixturePath = path.join(process.cwd(), 'tests/fixtures/atacadao_graphql_response.json')
    assert.isTrue(fs.existsSync(fixturePath), 'Fixture atacadao_graphql_response.json deve existir')

    const data = JSON.parse(fs.readFileSync(fixturePath, 'utf8'))

    assert.property(data, 'data')
    assert.property(data.data, 'productSearch')
    assert.property(data.data.productSearch, 'products')
    assert.isArray(data.data.productSearch.products)

    const product = data.data.productSearch.products[0]
    assert.property(product, 'id')
    assert.property(product, 'name')
    assert.property(product, 'items')
    assert.isArray(product.items)
  })

  test('SEFAZ HTML contract satisfies cheerio selector structure', ({ assert }) => {
    const fixturePath = path.join(process.cwd(), 'tests/fixtures/sefaz_html.html')
    assert.isTrue(fs.existsSync(fixturePath), 'Fixture sefaz_html.html deve existir')

    const html = fs.readFileSync(fixturePath, 'utf8')
    const $ = cheerio.load(html)

    const tableResult = $('#tabResult')
    assert.isTrue(tableResult.length > 0, 'Elemento #tabResult deve existir na página SEFAZ')

    const titleElem = $('.txtTit').first()
    assert.isTrue(titleElem.length > 0, 'Elemento .txtTit de título de item deve existir')
    assert.isTrue(titleElem.text().trim().length > 0)
  })
})

