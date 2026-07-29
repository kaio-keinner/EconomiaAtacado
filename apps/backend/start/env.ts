/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  // Node
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  // App
  APP_KEY: Env.schema.secret(),
  APP_URL: Env.schema.string({ format: 'url', tld: false }),

  // Session
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory', 'database'] as const),

  // Database
  DB_CONNECTION: Env.schema.enum(['sqlite', 'mysql'] as const),
  DB_HOST: Env.schema.string.optional(),
  DB_PORT: Env.schema.number.optional(),
  DB_USER: Env.schema.string.optional(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string.optional(),
  // Feature Flags / Scraper
  SCRAPER_MOCK_MODE: Env.schema.boolean.optional(),

  // External Third-Party APIs
  BIGMASTER_API_URL: Env.schema.string.optional(),
  ATACADAO_GRAPHQL_URL: Env.schema.string.optional(),
  ATACADAO_REGION_ID: Env.schema.string.optional(),
  ATACADAO_SELLER: Env.schema.string.optional(),

  // Future Services & Integrations
  REDIS_URL: Env.schema.string.optional(),
  REDIS_HOST: Env.schema.string.optional(),
  REDIS_PORT: Env.schema.number.optional(),
  S3_BUCKET: Env.schema.string.optional(),
  S3_REGION: Env.schema.string.optional(),
  S3_ENDPOINT: Env.schema.string.optional(),
  S3_PUBLIC_URL: Env.schema.string.optional(),
  AWS_ACCESS_KEY_ID: Env.schema.string.optional(),
  AWS_SECRET_ACCESS_KEY: Env.schema.string.optional(),
  STRIPE_SECRET_KEY: Env.schema.string.optional(),
})

