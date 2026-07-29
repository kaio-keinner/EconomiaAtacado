/**
 * Script de migração única: sobe imagens já baixadas em public/uploads para o S3.
 *
 * Uso:
 *   node ace execute scripts/migrate_images_to_s3.ts
 *   # ou diretamente:
 *   npx tsx scripts/migrate_images_to_s3.ts
 *
 * Requer as env vars S3_BUCKET, S3_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
 * (e opcionalmente S3_ENDPOINT para R2/B2/MinIO).
 */

import 'reflect-metadata'
import { Ignitor } from '@adonisjs/core'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const APP_ROOT = new URL('../', import.meta.url)

async function run() {
  const ignitor = new Ignitor(APP_ROOT, {
    importer: (filePath: string) => import(filePath),
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
    const StorageService = (await import('#services/storage_service')).default
    const Product = (await import('#models/product')).default

    if (!StorageService.isConfigured()) {
      console.error('❌  S3 não está configurado. Defina S3_BUCKET, AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY no .env')
      process.exit(1)
    }

    const uploadsDir = path.join(fileURLToPath(new URL('../public/uploads', import.meta.url)))
    if (!fs.existsSync(uploadsDir)) {
      console.log('Diretório public/uploads não existe. Nada a migrar.')
      return
    }

    const arquivos = fs.readdirSync(uploadsDir).filter((f) => f.startsWith('bigmaster_') && f.endsWith('.jpg'))
    console.log(`📦 Encontrados ${arquivos.length} arquivos para migrar.`)

    let migrados = 0
    let erros = 0
    let pulados = 0

    for (const arquivo of arquivos) {
      const sku = arquivo.replace('bigmaster_', '').replace('.jpg', '')
      const s3Key = `bigmaster/${sku}.jpg`
      const localPath = path.join(uploadsDir, arquivo)

      try {
        if (await StorageService.exists(s3Key)) {
          console.log(`⏩ ${arquivo} já existe no S3, pulando.`)
          pulados++
          continue
        }

        const buffer = fs.readFileSync(localPath)
        const publicUrl = await StorageService.upload(s3Key, buffer, 'image/jpeg')

        // Atualiza o produto no banco
        const product = await Product.findBy('sku', sku)
        if (product) {
          product.imagemUrl = publicUrl
          await product.save()
        }

        console.log(`✅ ${arquivo} → ${publicUrl}`)
        migrados++
      } catch (err: any) {
        console.error(`❌ Erro ao migrar ${arquivo}:`, err.message)
        erros++
      }
    }

    console.log(`\n✅ Migração concluída. Migrados: ${migrados}, Pulados: ${pulados}, Erros: ${erros}`)
  })
}

run().catch((err) => {
  console.error('Falha fatal no script de migração:', err)
  process.exit(1)
})
