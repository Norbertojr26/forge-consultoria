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

## Equipe e treinos

- **Papéis:** `STUDENT` (padrão), `TRAINER` e `ADMIN`. E-mails em `ADMIN_EMAILS` viram admin no primeiro acesso. O admin promove treinadores e define o treinador de cada aluno em `/treinador/equipe`; treinador só vê os próprios alunos.
- **Planos:** o treinador monta dias e exercícios (séries, repetições, carga, descanso) e envia; o aluno tem um plano ativo por vez. Plano com treinos registrados fica travado — edita-se uma cópia ("Duplicar") para não perder histórico.
- **Execução:** `/aluno/treino/[dia]` — a sessão só é criada ao concluir a primeira série (abrir a página não registra nada). Descanso em tela cheia com bipe e vibração; a tela fica acesa (Wake Lock).
- **Catálogo:** exercícios com `sourceId` mostram as fotos reais da [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) (Unlicense / domínio público) em `public/exercises/`. Imagem própria (`imageKey`, no bucket) tem prioridade.
- **Imagens padrão FORGE (IA):** no catálogo, cada exercício tem versão masculina e feminina, com posição inicial e final. Cada posição é gerada separadamente a partir da foto real daquela posição (um personagem só, mesma câmera), via OpenRouter (`OPENROUTER_API_KEY`; modelo em `OPENROUTER_IMAGE_MODEL`, padrão `google/gemini-3.1-flash-image`, o Nano Banana 2) com o prompt de `lib/exercise-style.ts`. A proposta só aparece para os alunos depois de aprovada (`ExerciseArt`). O **personagem-mestre** (uma imagem escolhida por sexo, em `AppSetting`) vai junto em toda geração como referência de estilo. O aluno vê a versão do sexo cadastrado no perfil; imagem enviada manualmente tem prioridade.

## Dieta, suplementos e água

- **Dieta:** o treinador monta em `/treinador/alunos/[id]/dieta/[plano]` as metas diárias (kcal, proteína, carboidrato, gordura, água), as refeições com horário e os alimentos (quantidade, macros e substituição), além dos suplementos e medicações com horários. Ao enviar, vira a dieta ativa do aluno, uma por vez. Diferente do treino, pode ser editada depois de enviada.
- **Aluno (`/aluno/dieta`):** anel da meta de água com botões de +250/+500/+750 ml e desfazer; consumo do dia contra a meta, somando as refeições marcadas como feitas; refeições com a próxima em destaque; doses de suplementos e medicações por horário com check. A tela "Hoje" mostra a água e os contadores de refeições e suplementos.
- **Meta de água:** a do plano; sem ela, 35 ml × último peso; sem peso, 2,5 L (`lib/diet.ts`). O "dia" segue o fuso de São Paulo.
- **Medicação** aparece só como lembrete do que o médico prescreveu.

## Estrutura

```
public/*.html      site original: landing (/), /aplicar e /demo-aluno, servidos por rewrite no next.config.ts
app/(auth)         /entrar e /cadastro (Clerk)
app/aluno          área do aluno: hoje, treino (player), check-in, evolução, perfil
app/treinador      painel do treinador: alunos, planos, catálogo de exercícios, equipe (admin)
components/app     componentes visuais do app (vidro, anel, barras em pílula, número em pontos)
components/ui      shadcn
components/brand   peças da identidade FORGE usadas na área do aluno
lib/               db, auth (Clerk → User), storage (S3), week, metrics, validations, actions/
tests/             Vitest
prisma/            schema e migrations
```
