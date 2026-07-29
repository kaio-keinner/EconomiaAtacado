import { test } from '@japa/runner'
import PriceComparisonService from '#services/price_comparison_service'

test.group('PriceComparisonService Unit Tests', () => {
  test('tokenize correctly cleans and splits text', ({ assert }) => {
    // Acessa método privado tokenize via reflexão
    const tokenizeFn = (PriceComparisonService as any).tokenize.bind(PriceComparisonService)

    const result = tokenizeFn('Arroz Branco Tipo 1 5kg!!')
    assert.deepEqual(result, ['arroz', 'branco', 'tipo', '5kg'])
  })

  test('calculateSimilarity boosts score for matching volume/weights', ({ assert }) => {
    const calcFn = (PriceComparisonService as any).calculateSimilarity.bind(PriceComparisonService)

    const queryTokens = ['oleo', 'soja', '900ml']
    const productTokens = ['oleo', 'soja', 'pet', '900ml']

    const scoreMatch = calcFn(queryTokens, productTokens, 'Oleo Soja 900ml', 'Oleo Soja Pet 900ml')
    const scoreDivergent = calcFn(queryTokens, ['oleo', 'soja', '5l'], 'Oleo Soja 900ml', 'Oleo Soja 5l')

    assert.isTrue(scoreMatch > scoreDivergent, 'Match com mesmo volume deve ter score consideravelmente maior')
  })
})
