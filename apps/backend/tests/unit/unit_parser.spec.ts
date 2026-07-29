import { test } from '@japa/runner'
import { parseUnit } from '#utils/unit_parser'

test.group('unit_parser Unit Tests', () => {
  test('parses various real product name formats correctly', ({ assert }) => {
    // 1. Volumes L e ml
    assert.deepEqual(parseUnit('Refrigerante Coca-Cola 2L'), { quantidade: 2, unidade: 'L', quantidadeBase: 2000, unidadeBase: 'ml' })
    assert.deepEqual(parseUnit('Cerveja Heineken 350ml'), { quantidade: 350, unidade: 'ml', quantidadeBase: 350, unidadeBase: 'ml' })
    assert.deepEqual(parseUnit('Água Mineral 1,5 L'), { quantidade: 1.5, unidade: 'L', quantidadeBase: 1500, unidadeBase: 'ml' })
    assert.deepEqual(parseUnit('Suco de Laranja 900 ml'), { quantidade: 900, unidade: 'ml', quantidadeBase: 900, unidadeBase: 'ml' })
    assert.deepEqual(parseUnit('Leite Integral 1L'), { quantidade: 1, unidade: 'L', quantidadeBase: 1000, unidadeBase: 'ml' })

    // 2. Pesos kg e g
    assert.deepEqual(parseUnit('Arroz Branco Tipo 1 5kg'), { quantidade: 5, unidade: 'kg', quantidadeBase: 5000, unidadeBase: 'g' })
    assert.deepEqual(parseUnit('Feijão Carioca 1kg'), { quantidade: 1, unidade: 'kg', quantidadeBase: 1000, unidadeBase: 'g' })
    assert.deepEqual(parseUnit('Café Torrado 500g'), { quantidade: 500, unidade: 'g', quantidadeBase: 500, unidadeBase: 'g' })
    assert.deepEqual(parseUnit('Sabão em Pó 1,6kg'), { quantidade: 1.6, unidade: 'kg', quantidadeBase: 1600, unidadeBase: 'g' })
    assert.deepEqual(parseUnit('Chocolate ao Leite 90g'), { quantidade: 90, unidade: 'g', quantidadeBase: 90, unidadeBase: 'g' })

    // 3. Multiplicadores / Packs
    assert.deepEqual(parseUnit('Cerveja Pack 6x350ml'), { quantidade: 2100, unidade: 'ml', quantidadeBase: 2100, unidadeBase: 'ml' })
    assert.deepEqual(parseUnit('Refrigerante 6 x 350 ml'), { quantidade: 2100, unidade: 'ml', quantidadeBase: 2100, unidadeBase: 'ml' })
    assert.deepEqual(parseUnit('Achocolatado 12x200g'), { quantidade: 2400, unidade: 'g', quantidadeBase: 2400, unidadeBase: 'g' })
    assert.deepEqual(parseUnit('Caixa de Leite 12x1L'), { quantidade: 12, unidade: 'L', quantidadeBase: 12000, unidadeBase: 'ml' })
    assert.deepEqual(parseUnit('Sabonete Pack 4x90g'), { quantidade: 360, unidade: 'g', quantidadeBase: 360, unidadeBase: 'g' })

    // 4. Unidades e Contagens
    assert.deepEqual(parseUnit('Ovos Vermelhos c/ 12 un'), { quantidade: 12, unidade: 'un', quantidadeBase: 12, unidadeBase: 'un' })
    assert.deepEqual(parseUnit('Fralda Descartável cx 24un'), { quantidade: 24, unidade: 'un', quantidadeBase: 24, unidadeBase: 'un' })
    assert.deepEqual(parseUnit('Pilhas AA com 4 unidades'), { quantidade: 4, unidade: 'un', quantidadeBase: 4, unidadeBase: 'un' })
    assert.deepEqual(parseUnit('Café em Cápsulas 10 capsulas'), { quantidade: 10, unidade: 'un', quantidadeBase: 10, unidadeBase: 'un' })
    assert.deepEqual(parseUnit('Tempero em Pó 12 saches'), { quantidade: 12, unidade: 'un', quantidadeBase: 12, unidadeBase: 'un' })

    // 5. Sem unidade reconhecida
    assert.isNull(parseUnit('Vassoura Multiuso'))
    assert.isNull(parseUnit(''))
  })
})
