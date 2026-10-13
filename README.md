# FORGE Consultoria

Landing pública + área do aluno (check-in semanal, evolução de peso, perfil).

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · Clerk · Prisma + Postgres · Railway (deploy e bucket S3 das fotos).

## Rodando local

```bash
cp .env.example .env.local   # preencha Clerk, DATABASE_URL e bucket
cp .env.example .env         # Prisma CLI lê .env (só DATABASE_URL é necessária)
npm install                  # roda prisma generate no postinstall
npm run db:deploy            # aplica as migrations
npm run dev
```

## Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento (Turbopack) |
| `npm run build` / `start` | build e servidor de produção |
| `npm run lint` / `typecheck` | ESLint e `tsc --noEmit` |
| `npm test` | testes (Vitest) da lógica de semana e métricas |
| `npm run db:migrate` | cria migration nova a partir do `schema.prisma` |
| `npm run db:deploy` | aplica migrations pendentes |
| `npm run db:studio` | Prisma Studio |

## Deploy (Railway)

Push na `main` gera deploy automático. O serviço roda `npx prisma migrate deploy` como pre-deploy (configurado no Railway; o `railway.json` documenta o mesmo comando). Variáveis do serviço web: as do `.env.example`, com `DATABASE_URL=${{Postgres.DATABASE_URL}}` e as `S3_*` referenciando o bucket (aba **Credentials** do bucket). Se o bucket usar URLs path-style, defina `S3_FORCE_PATH_STYLE=true`.

## Área do aluno

- **Semana do check-in:** domingo a sábado no fuso `America/Sao_Paulo` (`lib/week.ts`). Um check-in por semana; refazer na mesma semana edita o existente.
- **Fotos:** comprimidas no navegador (máx. 1600 px, JPEG) e enviadas pelo servidor ao bucket privado, sem necessidade de CORS. O banco guarda só a chave do objeto; a exibição usa URL assinada de 10 min. Foto substituída é apagada do bucket.
- **Métricas** (`lib/metrics.ts`): peso atual, Δ em relação ao check-in anterior e aderência (semanas com check-in desde o primeiro; a semana em aberto não penaliza).

## Estrutura

```
public/*.html      site original: landing (/), /aplicar e /demo-aluno, servidos por rewrite no next.config.ts
app/(auth)         /entrar e /cadastro (Clerk)
app/aluno          área do aluno: painel, check-in, evolução, perfil (protegida pelo middleware.ts)
components/ui      shadcn
components/brand   peças da identidade FORGE usadas na área do aluno
lib/               db, auth (Clerk → User), storage (S3), week, metrics, validations, actions/
tests/             Vitest
prisma/            schema e migrations
```
