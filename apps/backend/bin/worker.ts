import 'reflect-metadata'
import { Ignitor, prettyPrintError } from '@adonisjs/core'

const APP_ROOT = new URL('../', import.meta.url)

async function startWorker() {
  try {
    const ignitor = new Ignitor(APP_ROOT, {
      importer: (filePath) => import(filePath),
    })

    ignitor.tap((app) => {
      app.booting(async () => {
        await import('#start/env')
      })
    })

    const app = await ignitor.createApp('web')
    await app.init()
    await app.boot()
    await app.start(async () => {
      console.log('[Worker] Worker de filas iniciado com sucesso!')
      const { createSyncWorker } = await import('#services/queue_service')
      const BigMasterSyncService = (await import('#services/bigmaster_sync_service')).default
      const AtacadaoScraperService = (await import('#services/atacadao_scraper_service')).default
      const SefazScraperService = (await import('#services/sefaz_scraper_service')).default

      createSyncWorker(async (job) => {
        console.log(`[Worker] Processando job #${job.id} de tipo: ${job.data.type}`)
        switch (job.data.type) {
          case 'bigmaster_sync': {
            const res = await BigMasterSyncService.sync(job)
            return res
          }
          case 'bigmaster_sync_images': {
            const res = await BigMasterSyncService.syncImages(job)
            return res
          }

          case 'atacadao_sync_all': {
            const payload = job.data.payload || {}
            const res = await AtacadaoScraperService.syncAll(payload, job)
            return res
          }

          case 'atacadao_scrape': {
            const scraper = new AtacadaoScraperService()
            const { categoria1, categoria2, maxPaginas } = job.data.payload || {}
            const produtos = await scraper.scrapeCategory(categoria1, categoria2, { maxPaginas: maxPaginas || 5, delayMs: 3000 })
            const Product = (await import('#models/product')).default
            let salvos = 0
            for (const p of produtos) {
              if (!p.id) continue
              const prefixedId = `atacadao_${p.id}`
              await Product.updateOrCreate(
                { externalId: prefixedId },
                {
                  externalId: prefixedId,
                  sku: p.sku,
                  nome: p.nome ?? '',
                  marca: p.marca,
                  disponivel: p.disponivel,
                  precoVarejo: p.precoVarejo,
                  precoAtacado: p.precoAtacado,
                  quantidadeMinimaAtacado: p.quantidadeMinimaAtacado,
                  imagemUrl: p.imagemUrl,
                  categoria1,
                  categoria2,
                  origem: 'atacadao',
                }
              )
              salvos++
            }
            return { total: salvos }
          }



          case 'sefaz_scrape': {
            const { rawInput, chave, userId } = job.data.payload || {}
            const res = await SefazScraperService.processReceipt(rawInput, chave, job, userId)
            return res
          }

          case 'recompute_product_matches': {
            const PriceComparisonService = (await import('#services/price_comparison_service')).default
            const res = await PriceComparisonService.recomputeMatches(job)
            return res
          }




          default:
            throw new Error(`Tipo de job desconhecido: ${job.data.type}`)
        }
      })
    })
  } catch (error: any) {
    prettyPrintError(error)
    process.exitCode = 1
  }
}

startWorker()
