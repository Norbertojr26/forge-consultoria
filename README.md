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
| `npm run db:migrate` | cria migration nova a partir do `schema.prisma` |
| `npm run db:deploy` | aplica migrations pendentes |
| `npm run db:studio` | Prisma Studio |

## Deploy (Railway)

Push na `main` gera deploy automático. O `railway.json` roda `prisma migrate deploy` como pre-deploy. Variáveis do serviço web: as do `.env.example`, com `DATABASE_URL=${{Postgres.DATABASE_URL}}`.

## Estrutura

```
app/(marketing)    landing pública
app/(auth)         /entrar e /cadastro (Clerk)
app/aluno          área do aluno (protegida pelo middleware.ts)
components/ui      shadcn
components/brand   peças da identidade FORGE (eyebrow mono, etc.)
lib/               db (Prisma), auth (sync Clerk → User), utils
prisma/            schema e migrations
```
