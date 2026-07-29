# Roadmap de Execução — produtos-app

Documento operacional. Cada tarefa abaixo é um **prompt pronto pra colar numa IA CLI** (Claude Code, Aider, etc.), uma por vez, com critério de aceite explícito.

Regra de ouro: **uma tarefa = um commit = um PR mental**. Não colar duas tarefas juntas. Rodar `npm run test` e `npm run typecheck` (ou equivalente) antes de aceitar cada uma.

---

## Bloco 0 — Preparar o repositório para a IA CLI

### Tarefa 0.1 — Criar o CLAUDE.md (contexto permanente)

> Leia a estrutura do monorepo (`apps/backend`, `apps/frontend`) e crie na raiz um arquivo `CLAUDE.md` com: stack real detectada (versões de AdonisJS, Lucid, React, Vite, Tailwind, BullMQ, Playwright, Stripe), como rodar backend / frontend / worker / migrations / testes, convenções de nomenclatura já usadas no código (campos em português tipo `precoVarejo`, `capturadoEm`; controllers em `snake_case.ts`; imports com alias `#models`, `#services`), e uma seção "Regras" com: (1) nunca inventar endpoint sem registrar em `start/routes.ts`; (2) toda mudança de schema vira migration, nunca edição manual do banco; (3) nunca alterar lógica de scraper e de API na mesma tarefa; (4) todo endpoint novo precisa de teste em `tests/`. Seja factual, baseie-se apenas no que existe no código.

**Aceite:** o arquivo descreve comandos que realmente funcionam quando você os executa.

---

## Bloco 1 — Fundação (bloqueia a cobrança; fazer antes de qualquer feature nova)

### Tarefa 1.1 — Autenticação de ponta a ponta no frontend

> Hoje `apps/frontend/src/api/client.ts` faz `fetch` sem header `Authorization`, mas as rotas `/api/shopping-lists`, `/api/receipts`, `/api/subscriptions/*` e `/api/matches` estão atrás de `middleware.auth()` — essas telas quebram com 401.
>
> Implemente: (1) um `AuthContext` em React com `login`, `signup`, `logout` e `user`, consumindo `POST /api/v1/auth/login`, `POST /api/v1/auth/signup` e `GET /api/v1/account/profile`; (2) persistência do access token (localStorage) e injeção automática do header `Authorization: Bearer <token>` em **todas** as funções de `client.ts` via um wrapper `apiFetch` — refatore as funções existentes para usá-lo, não duplique código; (3) tratamento global de 401 → limpa token e volta pra tela de login; (4) telas `LoginScreen` e `SignupScreen` seguindo o padrão visual atual (Tailwind, Heroicons); (5) o `App.tsx` só renderiza a aplicação se autenticado. Não mexa em nenhum arquivo do backend nesta tarefa.

**Aceite:** criar conta → logar → recarregar a página continua logado → `AccountPanel` carrega sem 401.

### Tarefa 1.2 — Fechar as rotas públicas de escrita

> Em `apps/backend/start/routes.ts`, as rotas `POST /api/scrape`, `POST /api/atacadao/sync-all`, `POST /api/bigmaster/sync` e `POST /api/bigmaster/sync-images` estão públicas — qualquer pessoa na internet dispara scraping em nome da aplicação.
>
> Adicione uma coluna `role` (enum `user` | `admin`, default `user`) ao model `User` via migration, crie um middleware `admin` que retorna 403 pra quem não for admin, e mova essas quatro rotas para um grupo `/api/admin` protegido por `auth` + `admin`. Atualize as chamadas correspondentes no frontend. Crie também um comando ace `user:make-admin <email>` pra promover um usuário. Mantenha `GET /api/products` e `POST /api/compare` públicos por enquanto.

**Aceite:** chamada sem token nas rotas de sync retorna 401/403; comando ace promove usuário; teste automatizado cobre os dois casos.

### Tarefa 1.3 — Migrar SQLite → PostgreSQL

> `config/database.ts` usa SQLite em `app.tmpPath('db.sqlite3')` — diretório temporário, inadequado pra produção, e com risco de lock quando o worker BullMQ escreve em paralelo ao HTTP.
>
> Ative a conexão `pg` (já existe comentada), instale `pg`, faça `DB_CONNECTION` vir do env com default `pg`, e revise **todas** as migrations existentes procurando construções específicas de SQLite. Adicione um `docker-compose.yml` na raiz subindo Postgres 16 + Redis 7 pra desenvolvimento, e documente no README como rodar migrations do zero. Escreva também um script `scripts/migrate-sqlite-to-pg.ts` que copia os dados do sqlite atual para o Postgres, na ordem correta de foreign keys.

**Aceite:** `docker compose up -d && node ace migration:fresh` roda limpo, e a suíte de testes passa contra Postgres.

### Tarefa 1.4 — Corrigir o endpoint de histórico e blindar o checkout

> Duas correções pontuais no backend, sem refatorar nada em volta:
>
> 1. `ProductsController.priceHistory` faz `orderBy('capturado_em', 'asc').limit(90)` — isso devolve os 90 registros **mais antigos**, não os mais recentes. Corrija para aceitar `?periodo=7d|30d|90d|tudo`, filtrar por data (`capturado_em >= now - periodo`), ordenar ascendente para o gráfico e retornar também um bloco `resumo` com `precoMinimo`, `precoMaximo`, `precoAtual`, `variacaoPercentual` no período.
> 2. Em `SubscriptionsController.checkout`, o fallback "modo simulado" ativa plano Pro sem cobrança quando `STRIPE_SECRET_KEY` está ausente. Se isso rodar em produção com env mal configurado, todo usuário vira Pro de graça. Restrinja esse caminho a `NODE_ENV !== 'production'`; em produção, ausência da chave deve retornar 500 com erro claro nos logs.
> 3. No webhook, `currentPeriodEnd` está sendo chutado como `now + 1 mês`. Leia o valor real de `current_period_end` do objeto Stripe e trate também o evento `invoice.payment_failed` marcando `status = 'past_due'`.

**Aceite:** testes cobrindo `?periodo=7d` com dados semeados, e um teste garantindo que o modo simulado não ativa em produção.

---

## Bloco 2 — Dados de variação de preço (a base das features que você quer)

> **Por que isso vem antes do gráfico:** hoje `PriceHistory` só grava linha **quando o preço muda**. Isso economiza espaço, mas significa que "variação nos últimos 7 dias" fica errada sempre que não houve captura, e o gráfico fica com buracos. Sem uma série diária contínua e sem um "preço de referência", não existe forma honesta de dizer o que é promoção.

### Tarefa 2.1 — Série diária consolidada (`price_daily`)

> Crie a tabela `price_daily` (migration): `product_id`, `dia` (date), `preco_varejo`, `preco_atacado`, `disponivel`, `fonte` (`captura` | `forward_fill`), com índice único em (`product_id`, `dia`) e índice em (`dia`).
>
> Crie `PriceDailyService` com um método `consolidate(dia)` que, para cada produto: pega a última entrada de `price_history` com `capturado_em <= fim do dia`; se houve captura naquele dia marca `fonte = 'captura'`, senão repete o último valor conhecido com `fonte = 'forward_fill'`. Registre um job BullMQ recorrente `price_daily_consolidate` rodando 1x/dia às 03:00 (registre o worker em `bin/worker.ts` seguindo o padrão dos outros cases) e um comando ace `price:consolidate --dias=30` para backfill do histórico já existente. A operação precisa ser idempotente (rodar duas vezes no mesmo dia não duplica).

**Aceite:** rodar o backfill duas vezes seguidas não altera a contagem de linhas; um produto sem captura em 3 dias tem as 3 linhas de forward_fill.

### Tarefa 2.2 — Preço de referência e detecção de promoção

> Adicione ao `Product` (migration) as colunas `preco_referencia` (decimal, nulável) e `referencia_calculada_em` (datetime).
>
> Crie `PromotionService` com: (1) `recalculateReferences()` — para cada produto com pelo menos 14 dias em `price_daily`, calcula a **mediana** dos últimos 30 dias (mediana, não média: resiste a promoções pontuais puxando a referência pra baixo) e grava em `preco_referencia`; (2) `detectPromotions({ periodo, limite, categoria, origem })` — retorna produtos cujo preço atual esteja **pelo menos 10% abaixo** da referência, ordenados por desconto percentual, cada um com `precoAtual`, `precoReferencia`, `descontoPercentual`, `economiaReais`, `diasEmPromocao` e a série diária dos últimos 30 dias para sparkline. Ignore produtos indisponíveis e produtos com menos de 14 dias de histórico. Agende `recalculateReferences` como job diário após a consolidação.

**Aceite:** com dados semeados, um produto que caiu 25% aparece no topo; um produto com 5 dias de histórico não aparece; um produto que oscila ±3% não aparece.

### Tarefa 2.3 — Índice de cesta por mercado

> Este é o número que responde "qual mercado está mais barato **em geral**" — diferente de "mais barato nesta lista".
>
> Crie a tabela `basket_index` (`dia`, `origem`, `indice`, `produtos_considerados`) e um `BasketIndexService` que: seleciona uma cesta fixa de produtos que existem nas duas redes (use os `ProductMatch` confirmados, os N mais frequentes em listas de compras dos usuários), calcula para cada dia o custo total dessa cesta em cada rede a partir de `price_daily`, e normaliza para base 100 no primeiro dia da série. Só considere dias em que ao menos 80% da cesta tem preço conhecido — nos demais, não grave o ponto (melhor buraco no gráfico do que número mentiroso). Exponha `GET /api/basket-index?periodo=90d`.

**Aceite:** endpoint retorna duas séries temporais comparáveis, e o serviço registra em log quantos produtos entraram na cesta.

### Tarefa 2.4 — Preço por unidade normalizado

> `PriceComparisonService` já extrai peso/volume por regex (`350ml`, `1kg`, `2l`) só para pontuar similaridade. Isso deveria ser dado persistido — em atacado a embalagem varia muito e "R$/kg" é o único jeito honesto de comparar.
>
> Extraia essa lógica para `app/utils/unit_parser.ts` com uma função pura `parseUnit(nome): { quantidade, unidade, quantidadeBase, unidadeBase } | null` que normaliza tudo para g / ml / un (ex: `1,5 L` → 1500 ml; `Pack 6x350ml` → 2100 ml). Adicione colunas `quantidade_base` e `unidade_base` ao `Product` via migration, popule com um comando ace `products:parse-units`, e faça os dois scrapers preencherem no upsert. Escreva testes unitários cobrindo pelo menos 20 formatos reais tirados dos nomes de produto que já estão no banco.

**Aceite:** ≥90% dos produtos do catálogo atual ficam com `quantidade_base` preenchido; testes unitários passam.

---

## Bloco 3 — As telas que você pediu

### Tarefa 3.1 — Endpoints de leitura das novas métricas

> Exponha em `start/routes.ts` (protegidos por `auth`): `GET /api/promotions?periodo=7d&categoria=&origem=&limite=20` usando `PromotionService.detectPromotions`; `GET /api/products/:id/insights` retornando série diária dos dois mercados lado a lado + resumo (menor preço registrado, variação no período, preço de referência, se está em promoção agora). Adicione cache de 15 minutos em memória para `/api/promotions` (é a mesma resposta pra todo mundo). Atualize `apps/frontend/src/api/client.ts` com os tipos e funções correspondentes.

**Aceite:** endpoints respondem em <300ms com o catálogo atual; tipos TypeScript batem com o payload real.

### Tarefa 3.2 — Tela "Promoções da Semana"

> Crie `apps/frontend/src/components/PromotionsScreen.tsx` e adicione ao menu lateral do `App.tsx`. Conteúdo: (1) topo com os 3 maiores descontos em cards destacados (imagem, nome, preço atual riscando o de referência, badge de % e mercado); (2) gráfico de barras horizontais com o top 15 por desconto percentual, usando **recharts** (instale se não estiver no `package.json`), cores distintas por mercado (Atacadão / BigMaster); (3) lista completa abaixo, com filtros de categoria e mercado e botão "adicionar à lista de comparação" reaproveitando o handler que já existe no `App.tsx`; (4) cada item mostra um sparkline dos últimos 30 dias. Trate os estados: carregando (skeleton), sem promoções no período (mensagem explicando que ainda estamos acumulando histórico), erro. Siga o padrão visual existente — Tailwind, cantos arredondados, Heroicons, sem introduzir biblioteca de UI nova.

**Aceite:** tela renderiza com dados reais da API, responsiva em 375px de largura.

### Tarefa 3.3 — Tela de variação de preço do produto

> Crie `ProductPriceHistory.tsx`, aberta ao clicar num produto do `ProductCatalog`. Conteúdo: gráfico de linha recharts com duas séries (Atacadão e BigMaster) quando existir match confirmado entre eles, senão uma série; seletor de período 7d / 30d / 90d / tudo; cards com menor preço registrado, maior, atual e variação percentual; indicação visual de quando o produto esteve em promoção (área sombreada abaixo do preço de referência); botão "criar alerta de queda" (por ora apenas desabilitado com tooltip "em breve"). Se o produto tiver menos de 7 pontos na série, mostre aviso amigável no lugar do gráfico. Consome `GET /api/products/:id/insights`.

**Aceite:** funciona para produto com histórico longo, para produto novo, e para produto sem par no outro mercado.

### Tarefa 3.4 — Dashboard com o índice de cesta e economia acumulada

> Reformule o `WelcomeScreen.tsx` para ser a home pós-login: (1) faixa superior respondendo em uma frase qual mercado está mais barato hoje segundo o índice de cesta, com o gráfico de linha de 90 dias das duas séries (`GET /api/basket-index`); (2) card "quanto você economizou" somando `economiaTotal` das comparações salvas do usuário no mês — se ainda não houver dado, mostre um empty state convidando a montar a primeira lista; (3) carrossel com as 5 maiores promoções da semana linkando pra tela 3.2; (4) manter os cards de estatística de catálogo que já existem, mas menores. Não crie endpoints novos além dos já implementados nas tarefas anteriores.

**Aceite:** home carrega em uma única leva de requests paralelas, sem cascata de loading.

---

## Bloco 4 — Monetização e retenção

### Tarefa 4.1 — Ajustar planos e gating

> Em `SubscriptionsController.checkout`, o preço está hardcoded como `price_data` de R$ 29,90 dentro do código. Troque por `STRIPE_PRICE_ID_PRO` vindo do env (assim o preço muda no dashboard do Stripe sem deploy) e configure o produto em R$ 10,00/mês.
>
> Centralize as regras de plano num único arquivo `app/config/plans.ts` — hoje o limite de 3 listas está solto dentro do `ShoppingListsController`. Definição: **Free** = catálogo, comparação de lista, 3 listas salvas, histórico de 7 dias, top 3 promoções da semana. **Pro (R$10)** = listas ilimitadas, histórico completo, promoções completas com filtros, índice de cesta, alertas de preço. Crie um middleware `requirePro` e aplique nas rotas correspondentes, retornando sempre `{ error: 'PLAN_LIMIT', mensagem, upgradeUrl }` para o frontend renderizar o paywall de forma consistente. Adicione também o Stripe Customer Portal (`POST /api/subscriptions/portal`) em vez de construir tela de faturas.

**Aceite:** usuário free recebe 403 padronizado nas rotas Pro; um único arquivo concentra todos os limites.

### Tarefa 4.2 — Alertas de preço

> Crie o model `PriceAlert` (`user_id`, `product_id`, `tipo` = `abaixo_de` | `qualquer_queda`, `preco_alvo` nulável, `ativo`, `ultimo_disparo_em`) com migration e CRUD em `/api/price-alerts` (protegido por `auth` + `requirePro`). Crie um job BullMQ diário `price_alerts_check` que roda após a consolidação de `price_daily`, avalia os alertas ativos e envia e-mail (use `@adonisjs/mail`, configure SMTP por env). Implemente cooldown: não disparar o mesmo alerta duas vezes em 48h. Crie a tela `PriceAlertsScreen.tsx` para listar, criar e remover alertas, e ligue o botão que ficou desabilitado na tarefa 3.3.

**Aceite:** alerta configurado abaixo do preço atual dispara no próximo ciclo; segundo ciclo no mesmo dia não redispara.

### Tarefa 4.3 — Painel admin mínimo

> Crie `AdminScreen.tsx`, visível apenas para `user.role === 'admin'`, com três abas: (1) saúde dos scrapers consumindo `GET /api/scrapers/health` que já existe, com card por fonte, última execução, itens coletados, taxa de sucesso em 7 dias e botão "sincronizar agora"; (2) fila de jobs — em vez de construir do zero, instale `@bull-board/api` + `@bull-board/express` e monte em `/admin/queues` protegido por auth de admin, e nesta aba apenas linke pra ele; (3) correção de matching, consumindo os endpoints `/api/matches` que já existem, listando primeiro os de menor score de confiança, com ações de confirmar / rejeitar / parear manualmente.

**Aceite:** usuário comum não vê o menu nem consegue acessar as rotas.

---

## Como rodar isso com uma IA CLI sem se enrolar

1. **Comece pela Tarefa 0.1.** Sem `CLAUDE.md`, a IA vai reinventar convenções a cada sessão.
2. **Uma tarefa por sessão.** Ao terminar, `/clear` (ou reinicie a sessão) antes da próxima. Contexto acumulado degrada a qualidade mais do que ajuda.
3. **Peça o plano antes do código** em tarefas com migration: "me mostre o plano e os arquivos que vai tocar, não escreva código ainda". Aprove, depois libere.
4. **Critério de aceite é o teste.** Cole o "Aceite" junto com o prompt e peça que a IA escreva o teste **antes** da implementação nas tarefas de backend.
5. **Commit por tarefa**, sempre. Se a IA quebrar algo três prompts depois, `git revert` de um commit limpo salva a noite.
6. **Nunca deixe a IA rodar scraper de verdade em loop de debug** — 403 do Atacadão é bloqueio de IP e você fica sem dado. Use as fixtures que já existem em `tests/fixtures/`.
