export interface ParsedUnit {
  quantidade: number
  unidade: string
  quantidadeBase: number
  unidadeBase: 'g' | 'ml' | 'un'
}

/**
 * Extrai e normaliza peso, volume ou unidade contida no nome de um produto.
 * Normaliza tudo para unidades base:
 * - 'g'  (para massas/pesos em kg/g)
 * - 'ml' (para volumes em l/ml)
 * - 'un' (para contagens/packs por unidade)
 */
export function parseUnit(nome: string): ParsedUnit | null {
  if (!nome) return null

  const str = nome.toLowerCase().trim()

  // 1. Pack de multiplicadores (ex: "Pack 6x350ml", "6 x 350 ml", "12x200g", "caixa c/ 12x1l")
  const packMatch = str.match(/(\d+)\s*x\s*(\d+(?:[.,]\d+)?)\s*(ml|l|g|kg)/i)
  if (packMatch) {
    const packQtd = parseInt(packMatch[1], 10)
    const val = parseFloat(packMatch[2].replace(',', '.'))
    const unitStr = packMatch[3].toLowerCase()

    if (unitStr === 'l') {
      const ml = val * 1000 * packQtd
      return { quantidade: val * packQtd, unidade: 'L', quantidadeBase: ml, unidadeBase: 'ml' }
    }
    if (unitStr === 'ml') {
      const ml = val * packQtd
      return { quantidade: val * packQtd, unidade: 'ml', quantidadeBase: ml, unidadeBase: 'ml' }
    }
    if (unitStr === 'kg') {
      const g = val * 1000 * packQtd
      return { quantidade: val * packQtd, unidade: 'kg', quantidadeBase: g, unidadeBase: 'g' }
    }
    if (unitStr === 'g') {
      const g = val * packQtd
      return { quantidade: val * packQtd, unidade: 'g', quantidadeBase: g, unidadeBase: 'g' }
    }
  }

  // 2. Volume em Litros (ex: "1.5 l", "1,5l", "2l", "500 ml")
  const litroMatch = str.match(/(\d+(?:[.,]\d+)?)\s*(l|litro|litros)\b/i)
  if (litroMatch) {
    const val = parseFloat(litroMatch[1].replace(',', '.'))
    return { quantidade: val, unidade: 'L', quantidadeBase: val * 1000, unidadeBase: 'ml' }
  }

  // 3. Volume em Mililitros (ex: "350ml", "200 ml", "750ml")
  const mlMatch = str.match(/(\d+(?:[.,]\d+)?)\s*(ml|mililitros)\b/i)
  if (mlMatch) {
    const val = parseFloat(mlMatch[1].replace(',', '.'))
    return { quantidade: val, unidade: 'ml', quantidadeBase: val, unidadeBase: 'ml' }
  }

  // 4. Peso em Quilos (ex: "1kg", "1,5 kg", "2.5kg")
  const kgMatch = str.match(/(\d+(?:[.,]\d+)?)\s*(kg|kilo|quilo|quilos)\b/i)
  if (kgMatch) {
    const val = parseFloat(kgMatch[1].replace(',', '.'))
    return { quantidade: val, unidade: 'kg', quantidadeBase: val * 1000, unidadeBase: 'g' }
  }

  // 5. Peso em Gramas (ex: "500g", "200 g", "90g")
  const gMatch = str.match(/(\d+(?:[.,]\d+)?)\s*(g|gramas)\b/i)
  if (gMatch) {
    const val = parseFloat(gMatch[1].replace(',', '.'))
    return { quantidade: val, unidade: 'g', quantidadeBase: val, unidadeBase: 'g' }
  }

  // 6. Contagem de unidades (ex: "c/ 12 un", "cx 24un", "com 6 unidades", "12 capsulas", "10 sache")
  const unMatch = str.match(/(?:c\/|com|cx|caixa|pack)?\s*(\d+)\s*(?:un|unid|unidades|capsulas|saches?|comp|comprimidos)\b/i)
  if (unMatch) {
    const val = parseInt(unMatch[1], 10)
    return { quantidade: val, unidade: 'un', quantidadeBase: val, unidadeBase: 'un' }
  }

  return null
}
