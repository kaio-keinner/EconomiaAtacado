/**
 * StorageService — wrapper sobre @aws-sdk/client-s3.
 * Compatible com AWS S3, Cloudflare R2 e Backblaze B2 (via endpoint customizado).
 *
 * Env vars necessárias:
 *   S3_BUCKET            — nome do bucket
 *   S3_REGION            — ex: us-east-1 / auto (R2) / us-west-002 (B2)
 *   AWS_ACCESS_KEY_ID    — Access Key ID
 *   AWS_SECRET_ACCESS_KEY — Secret Key
 *   S3_ENDPOINT          — (opcional) URL do endpoint para R2/B2/MinIO
 *   S3_PUBLIC_URL        — (opcional) URL pública do CDN/bucket para montar URLs
 *                          Ex: https://cdn.meusite.com ou https://<accountId>.r2.dev
 */
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import env from '#start/env'

function getClient(): S3Client {
  const endpoint = env.get('S3_ENDPOINT') || process.env.S3_ENDPOINT
  return new S3Client({
    region: env.get('S3_REGION') || process.env.S3_REGION || 'us-east-1',
    credentials: {
      accessKeyId: env.get('AWS_ACCESS_KEY_ID') || process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: env.get('AWS_SECRET_ACCESS_KEY') || process.env.AWS_SECRET_ACCESS_KEY || '',
    },
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
  })
}

function getBucket(): string {
  return env.get('S3_BUCKET') || process.env.S3_BUCKET || ''
}

function getPublicUrl(key: string): string {
  const publicBase = env.get('S3_PUBLIC_URL') || process.env.S3_PUBLIC_URL
  const bucket = getBucket()
  const region = env.get('S3_REGION') || process.env.S3_REGION || 'us-east-1'
  const endpoint = env.get('S3_ENDPOINT') || process.env.S3_ENDPOINT

  if (publicBase) {
    return `${publicBase.replace(/\/$/, '')}/${key}`
  }
  if (endpoint) {
    return `${endpoint.replace(/\/$/, '')}/${bucket}/${key}`
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`
}

export default class StorageService {
  /**
   * Faz upload de um buffer para o S3.
   * @returns URL pública do objeto
   */
  static async upload(key: string, buffer: Buffer, contentType = 'image/jpeg'): Promise<string> {
    const client = getClient()
    const bucket = getBucket()
    if (!bucket) throw new Error('S3_BUCKET não configurado')

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      })
    )

    return getPublicUrl(key)
  }

  /**
   * Verifica se um objeto já existe no bucket.
   */
  static async exists(key: string): Promise<boolean> {
    try {
      const client = getClient()
      const bucket = getBucket()
      if (!bucket) return false
      await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
      return true
    } catch {
      return false
    }
  }

  /**
   * Indica se o S3 está configurado (todas as vars essenciais presentes).
   */
  static isConfigured(): boolean {
    const bucket = env.get('S3_BUCKET') || process.env.S3_BUCKET
    const keyId = env.get('AWS_ACCESS_KEY_ID') || process.env.AWS_ACCESS_KEY_ID
    const secret = env.get('AWS_SECRET_ACCESS_KEY') || process.env.AWS_SECRET_ACCESS_KEY
    return Boolean(bucket && keyId && secret)
  }
}
