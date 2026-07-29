# CLAUDE.md — Contexto permanente para IA CLI

## Stack

### Monorepo
- **Gerenciador**: Turborepo 2 + npm workspaces (`apps/backend`, `apps/frontend`)
- **Rodar tudo**: `npm run dev` (raiz) — dispara `turbo run dev`

### Backend (`apps/backend`)
- **Framework**: AdonisJS 7.3 (ESM, TypeScript 6)
- **ORM**: Lucid 22.4 (Knex) — MySQL (`mysql2`)
- **Auth**: `@adonisjs/auth` 10 — Access Tokens (Bearer)
- **Validação**: VineJS 4
- **Fila de Jobs**: BullMQ 5 + ioredis 5
- **Pagamento**: Stripe 22
- **Scraping**: Puppeteer 25 + Cheerio 1
- **Storage**: AWS S3 SDK (`@aws-sdk/client-s3`)
- **Testes**: Japa 5 (`@japa/runner`, `@japa/assert`, `@japa/api-client`)
- **Servidor dev**: `node ace serve --hmr`
- **Worker**: `node bin/worker.js`
- **Migrations**: `node ace migration:run` / `node ace migration:fresh`
- **Build**: `node ace build`
- **Testes**: `node ace test`
- **Typecheck**: `npm run typecheck`

### Frontend (`apps/frontend`)
- **Framework**: React 19 + Vite 8
- **CSS**: Tailwind CSS 4 (via `@tailwindcss/vite`)
- **Ícones**: Heroicons React 2
- **State**: Zustand 5 + TanStack React Query 5
- **Dev**: `vite` (porta 5173)
- **Build**: `tsc -b && vite build`
- **Lint**: `oxlint`

### Infraestrutura
- **Banco**: MySQL 8 local (127.0.0.1:3306, root/root, db: `produtos_db`)
- **Redis**: Opcional (BullMQ faz fallback direto quando Redis indisponível)
- **Docker Compose**: `docker-compose.yml` na raiz

---

## Como rodar

```bash
# Tudo junto (backend + frontend)
cd /raiz
npm run dev

# Só backend
cd apps/backend
node ace serve --hmr

# Só frontend
cd apps/frontend
npx vite

# Worker de filas (em terminal separado)
cd apps/backend
node bin/worker.js

# Migrations
cd apps/backend
node ace migration:run        # aplica pendentes
node ace migration:fresh      # drop all + rerun

# Testes
cd apps/backend
node ace test

# Typecheck
cd apps/backend
npm run typecheck
```

---

## Convenções de nomenclatura

### Campos do banco / models
- Nomes em **português**: `precoVarejo`, `precoAtacado`, `capturadoEm`, `quantidadeMinimaAtacado`, `imagemUrl`, `categoria1`, `categoria2`, `disponivel`, `marca`, `nome`
- Colunas no banco usam `snake_case`: `preco_varejo`, `capturado_em`, `imagem_url`
- Models usam `camelCase` com decorator `@column({ columnName: 'snake_case' })`

### Arquivos
- Controllers: `snake_case.ts` (`products_controller.ts`, `shopping_lists_controller.ts`)
- Models: `snake_case.ts` (`price_history.ts`, `product_match.ts`)
- Services: `snake_case.ts` (`atacadao_scraper_service.ts`, `price_comparison_service.ts`)
- Middleware: `snake_case_middleware.ts` (`auth_middleware.ts`, `require_pro_middleware.ts`)
- Migrations: `timestamp_description.ts`
- Commands (Ace): `snake_case.ts`

### Imports com alias
```typescript
import Product from '#models/product'
import PriceHistory from '#models/price_history'
import PriceComparisonService from '#services/price_comparison_service'
import { middleware } from '#start/kernel'
import env from '#start/env'
```

### Frontend
- Componentes: `PascalCase.tsx` (`ProductCatalog.tsx`, `WelcomeScreen.tsx`)
- API client: `apps/frontend/src/api/client.ts` centraliza todas as chamadas
- API base: `VITE_API_URL` ou fallback `http://${hostname}:3334/api`

---

## Estrutura do projeto

```
produtos-app/
├── apps/
│   ├── backend/
│   │   ├── app/
│   │   │   ├── controllers/     # HTTP controllers
│   │   │   ├── models/          # Lucid ORM models
│   │   │   ├── services/        # Business logic
│   │   │   ├── middleware/      # Route middleware
│   │   │   ├── validators/      # VineJS validators
│   │   │   ├── transformers/    # Response transformers
│   │   │   └── exceptions/      # Error handlers
│   │   ├── bin/
│   │   │   ├── server.ts        # HTTP server entry
│   │   │   └── worker.ts        # BullMQ worker entry
│   │   ├── commands/            # Ace CLI commands
│   │   ├── config/              # AdonisJS config files
│   │   ├── database/
│   │   │   ├── migrations/      # Knex migrations
│   │   │   └── schema.ts        # Auto-generated schema (DO NOT EDIT)
│   │   ├── start/
│   │   │   ├── routes.ts        # All HTTP routes
│   │   │   ├── kernel.ts        # Middleware registration
│   │   │   └── env.ts           # Env validation
│   │   └── tests/
│   │       ├── fixtures/        # Test data
│   │       └── unit/            # Unit tests
│   └── frontend/
│       └── src/
│           ├── api/client.ts    # API functions
│           ├── components/      # React components
│           ├── hooks/           # Custom hooks
│           ├── store/           # Zustand stores
│           ├── App.tsx          # Root component
│           └── main.tsx         # Entry point
├── docker-compose.yml
├── turbo.json
└── package.json
```

---

## Regras

1. **Nunca inventar endpoint sem registrar em `start/routes.ts`** — toda rota precisa estar declarada no arquivo de rotas com controller lazy-loaded.

2. **Toda mudança de schema vira migration, nunca edição manual do banco** — usar `node ace make:migration nome_descritivo`. O arquivo `database/schema.ts` é auto-gerado.

3. **Nunca alterar lógica de scraper e de API na mesma tarefa** — scrapers (`atacadao_scraper_service.ts`, `bigmaster_sync_service.ts`, `sefaz_scraper_service.ts`) são isolados das controllers.

4. **Todo endpoint novo precisa de teste em `tests/`** — usar Japa com `@japa/api-client` para testes funcionais, `@japa/assert` para unitários.

5. **Nunca rodar scraper real em debug** — 403 do Atacadão é bloqueio de IP. Usar fixtures de `tests/fixtures/`.

6. **Named middleware registrado em `start/kernel.ts`** — antes de usar `.use(middleware.algo())`, registrar no export `middleware`.

7. **Schema.ts é auto-gerado** — NÃO editar manualmente. Rodar `node ace migration:run` para regenerar.

8. **BullMQ jobs no worker.ts** — todo novo tipo de job precisa de case no switch dentro de `bin/worker.ts`.
