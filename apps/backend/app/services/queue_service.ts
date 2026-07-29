import { Queue, Worker, Job } from 'bullmq'
import env from '#start/env'

const redisHost = env.get('REDIS_HOST') || process.env.REDIS_HOST || '127.0.0.1'
const redisPort = Number(env.get('REDIS_PORT') || process.env.REDIS_PORT || 6379)

export const connection = {
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
}

export const syncQueue = new Queue('sync-tasks', { connection })

syncQueue.on('error', () => {
  // Previne erro não tratado caso o Redis esteja offline
})

export interface SyncJobData {
  type: 'atacadao_sync_all' | 'atacadao_scrape' | 'bigmaster_sync' | 'bigmaster_sync_images' | 'sefaz_scrape' | 'recompute_product_matches'
  payload?: any
}


export function createSyncWorker(
  processor: (job: Job<SyncJobData>) => Promise<any>
): Worker<SyncJobData> {
  const worker = new Worker<SyncJobData>('sync-tasks', processor, { connection, concurrency: 1 })
  worker.on('error', () => {
    // Previne estouro de log unhandled no worker quando Redis não responde
  })
  return worker
}
