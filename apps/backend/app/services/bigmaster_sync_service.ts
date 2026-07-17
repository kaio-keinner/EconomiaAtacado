import Product from '#models/product'
import fs from 'node:fs'
import path from 'node:path'
import app from '@adonisjs/core/services/app'

/**
 * Mapeamento dos departamentoId da API BigMaster para nomes legíveis.
 * Baseado na análise dos produtos retornados pela API.
 */
const DEPARTAMENTO_MAP: Record<string, string> = {
  '1': 'Aves e Frangos',
  '2': 'Cervejas Especiais',
  '5': 'Mercearia',
  '6': 'Limpeza',
  '7': 'Higiene Pessoal',
  '8': 'Padaria',
  '9': 'Laticínios e Iogurtes',
  '10': 'Fraldas e Infantil',
  '11': 'Limpeza Pesada',
  '12': 'Bazar e Utilidades',
  '40': 'Confeitaria',
  '41': 'Lanchonete',
  '42': 'Restaurante',
  '48': 'Automotivo',
  '49': 'Açougue Especial',
  '50': 'Linguiças e Embutidos',
  '53': 'Peixes e Frutos do Mar',
  '54': 'Queijos e Manteigas',
  '55': 'Frios e Presuntos',
  '56': 'Congelados',
  '57': 'Hortifruti Congelado',
  '59': 'Refrigerantes e Águas',
  '62': 'Vinhos e Coquetéis',
  '64': 'Destilados',
  '65': 'Energéticos',
  '66': 'Mercearia Básica',
  '67': 'Açougue Bovino',
  '68': 'Bebidas Promoção',
  '70': 'Farinhas e Trigos',
  '71': 'Atacado Geral',
  '72': 'Farinhas e Grãos',
  '73': 'Azeites',
  '74': 'Conservas e Enlatados',
  '75': 'Maioneses',
  '76': 'Temperos e Molhos',
  '77': 'Leite e Creme de Leite',
  '78': 'Cafés',
  '79': 'Cereais Infantis',
  '80': 'Achocolatados e Leite em Pó',
  '81': 'Biscoitos',
  '83': 'Chocolates e Doces',
  '85': 'Doces e Sobremesas',
  '86': 'Snacks e Salgadinhos',
  '87': 'Utensílios de Cozinha',
  '89': 'Pet Shop',
  '91': 'Inseticidas',
  '93': 'Massas e Macarrão',
  '94': 'Molhos de Tomate',
  '112': 'Odorizadores',
  '114': 'Limpadores',
  '117': 'Desinfetantes',
  '125': 'Amaciantes',
  '127': 'Lava Roupas',
  '129': 'Cuidados Pessoais',
  '130': 'Higiene Bucal',
  '135': 'Bebê',
  '140': 'Cabelos',
  '150': 'Bazar Têxtil',
  '160': 'Papelaria',
}

export default class BigMasterSyncService {
  /**
   * Retorna o nome legível do departamento ou o ID original como fallback
   */
  private static getDepartamentoNome(departamentoId: string): string {
    return DEPARTAMENTO_MAP[departamentoId] || `Departamento ${departamentoId}`
  }

  static async sync(): Promise<{ total: number; salvos: number; dataPromocao: string }> {
    const url = 'http://soubig.appce.com.br/api/promocao/ultima2?cidadeId=4'
    console.log('[BigMaster Sync] Buscando dados da API:', url)

    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Erro HTTP ao acessar API do BigMaster: ${response.status} ${response.statusText}`)
      }

      const data = (await response.json()) as {
        id: string
        descricao: string
        data: string
        itens: Array<{
          id: string
          preco: string
          descricao: string
          fotoUrl: string
          departamentoId: string
        }>
      }

      if (!data || !Array.isArray(data.itens)) {
        throw new Error('Formato de resposta inválido da API do BigMaster')
      }

      // 1. Carrega todos os produtos BigMaster existentes na base em memória
      const existingProducts = await Product.query().where('origem', 'bigmaster')
      const productMap = new Map<string, Product>()
      for (const p of existingProducts) {
        productMap.set(p.externalId, p)
      }

      const activeIds = new Set<string>()
      let salvos = 0
      let inseridos = 0
      let atualizados = 0

      for (const item of data.itens) {
        if (!item.id) continue

        const prefixedId = `bigmaster_${item.id}`
        activeIds.add(prefixedId)

        const preco = parseFloat(item.preco) || 0.0
        const categoriaNome = this.getDepartamentoNome(item.departamentoId)

        let imagemId: string | null = null
        if (item.fotoUrl) {
          const parts = item.fotoUrl.split('?id=')
          if (parts.length > 1) {
            imagemId = parts[1]
          }
        }

        const existing = productMap.get(prefixedId)

        if (existing) {
          let hasChanges = false

          // Verifica se o preço ou nome mudaram
          if (existing.precoVarejo !== preco || existing.precoAtacado !== preco) {
            existing.precoVarejo = preco
            existing.precoAtacado = preco
            hasChanges = true
          }

          if (existing.nome !== (item.descricao ?? '')) {
            existing.nome = item.descricao ?? ''
            hasChanges = true
          }

          if (existing.categoria1 !== categoriaNome) {
            existing.categoria1 = categoriaNome
            hasChanges = true
          }

          if (existing.categoria2 !== (item.departamentoId || 'Outros')) {
            existing.categoria2 = item.departamentoId || 'Outros'
            hasChanges = true
          }

          if (existing.imagemId !== imagemId) {
            existing.imagemId = imagemId
            hasChanges = true
          }

          // Se o produto foi reativado (estava indisponível)
          if (!existing.disponivel) {
            existing.disponivel = true
            hasChanges = true
          }

          // Preserva a imagem se já for local, caso contrário atualiza se houver nova URL
          const novaUrl = item.fotoUrl ? `http://soubig.appce.com.br/api${item.fotoUrl}` : null
          const jaTemImagemLocal = existing.imagemUrl && existing.imagemUrl.startsWith('/uploads/')
          if (!jaTemImagemLocal && existing.imagemUrl !== novaUrl) {
            existing.imagemUrl = novaUrl
            hasChanges = true
          }

          if (hasChanges) {
            await existing.save()
            atualizados++
          }
        } else {
          // Produto novo: fazemos inserção normal
          await Product.create({
            externalId: prefixedId,
            sku: item.id,
            nome: item.descricao ?? '',
            marca: '',
            disponivel: true,
            precoVarejo: preco,
            precoAtacado: preco,
            quantidadeMinimaAtacado: 1,
            imagemUrl: item.fotoUrl ? `http://soubig.appce.com.br/api${item.fotoUrl}` : null,
            imagemId: imagemId,
            categoria1: categoriaNome,
            categoria2: item.departamentoId || 'Outros',
            origem: 'bigmaster',
          })
          inseridos++
        }
        salvos++
      }

      // 2. Desativa produtos antigos que não vieram mais na promoção ativa
      let desativados = 0
      for (const p of existingProducts) {
        if (p.disponivel && !activeIds.has(p.externalId)) {
          p.disponivel = false
          await p.save()
          desativados++
        }
      }

      console.log(`[BigMaster Sync] Concluído. Itens Processados: ${salvos} (Novos: ${inseridos}, Atualizados: ${atualizados}, Desativados: ${desativados}). Promoção: ${data.descricao}`)
      return { total: data.itens.length, salvos, dataPromocao: data.data }
    } catch (error: any) {
      console.error('[BigMaster Sync] Falha ao sincronizar:', error.message)
      throw error
    }
  }

  static async syncImages(): Promise<{ total: number; baixados: number; erros: number }> {
    const uploadsDir = app.makePath('public/uploads')
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }

    const debugPath = 'c:\\Users\\Usuário\\Documents\\00 - Doc P\\code\\produtos-app\\sync_debug.txt'
    try {
      fs.writeFileSync(debugPath, 'Iniciando sync de imagens mapeadas...\n')
    } catch (e) {}

    // 1. Carrega o mapa de IDs de imagens a partir do exemplo.md como fallback se o banco estiver vazio
    const productToImageMap = new Map<string, string>()
    try {
      const exemploPath = 'c:\\Users\\Usuário\\Documents\\00 - Doc P\\code\\produtos-app\\exemplo.md'
      if (fs.existsSync(exemploPath)) {
        const fileContent = fs.readFileSync(exemploPath, 'utf8')
        const data = JSON.parse(fileContent)
        if (data && Array.isArray(data.itens)) {
          for (const item of data.itens) {
            if (item.id && item.fotoUrl) {
              const parts = item.fotoUrl.split('?id=')
              if (parts.length > 1) {
                productToImageMap.set(item.id, parts[1])
              }
            }
          }
        }
        try {
          fs.appendFileSync(debugPath, `Mapa carregado do arquivo local exemplo.md como fallback: ${productToImageMap.size} produtos mapeados.\n`)
        } catch (e) {}
      }
    } catch (e: any) {
      try {
        fs.appendFileSync(debugPath, `Erro ao carregar mapa do exemplo.md: ${e.message}\n`)
      } catch (e2) {}
    }

    // 2. Buscamos todos os produtos do BigMaster no banco
    const products = await Product.query().where('origem', 'bigmaster')
    try {
      fs.appendFileSync(debugPath, `Total de produtos BigMaster no banco: ${products.length}\n`)
    } catch (e) {}

    let baixados = 0
    let erros = 0

    for (const product of products) {
      const id = product.sku
      if (!id) continue

      let imageId = product.imagemId

      // Se a coluna imagemId no banco estiver vazia, tenta pegar do mapa local exemplo.md
      if (!imageId) {
        imageId = productToImageMap.get(id) || null
        if (imageId) {
          // Salva no banco de forma permanente para não precisar ler do arquivo de novo
          product.imagemId = imageId
          await product.save()
          try {
            fs.appendFileSync(debugPath, `SKU=${id} correlacionado no banco com Imagem ID=${imageId}\n`)
          } catch (e) {}
        }
      }

      if (!imageId) {
        try {
          fs.appendFileSync(debugPath, `Pulo SKU=${id}: Sem imagemId no banco ou no mapa do exemplo.md\n`)
        } catch (e) {}
        continue
      }

      const localFileName = `bigmaster_${id}.jpg`
      const localFilePath = path.join(uploadsDir, localFileName)
      const remoteUrl = `http://soubig.appce.com.br/api/produto/imagem?id=${imageId}`

      try {
        try {
          fs.appendFileSync(debugPath, `Tentando baixar SKU=${id} (Imagem ID=${imageId}) de URL=${remoteUrl}...\n`)
        } catch (e) {}
        
        const response = await fetch(remoteUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.5 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          }
        })
        if (!response.ok) {
          throw new Error(`Falha HTTP: ${response.status} ${response.statusText}`)
        }

        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        
        fs.writeFileSync(localFilePath, buffer)

        product.imagemUrl = `/uploads/${localFileName}`
        await product.save()
        baixados++
        try {
          fs.appendFileSync(debugPath, `Sucesso SKU=${id}! Salvo em: ${localFilePath}\n`)
        } catch (e) {}
      } catch (err: any) {
        console.error(`[Image Sync] Erro ao baixar imagem do produto ${id}:`, err.message)
        try {
          fs.appendFileSync(debugPath, `ERRO SKU=${id}: ${err.message}\n`)
        } catch (e) {}
        erros++
      }
    }

    return { total: products.length, baixados, erros }
  }
}
