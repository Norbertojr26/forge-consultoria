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
- **RIR e progressão:**
  - O treinador define o alvo de RIR de cada exercício, ou seja, quantas repetições o aluno deve deixar sobrando (RPE = 10 − RIR).
  - O aluno marca o RIR de cada série, de preferência na tela de descanso.
  - O player mostra a "Última vez" do exercício, mesmo que tenha sido feita em outro plano, porque `SetLog.exerciseId` guarda o exercício. Também mostra uma sugestão de carga que já vem preenchida (`lib/progression.ts`). A regra é a dupla progressão:
    - todas as séries no topo da faixa de repetições, sem passar do RIR alvo: sobe 2,5 kg (1 kg em cargas abaixo de 20 kg);
    - alguma série abaixo do mínimo, ou RIR abaixo do alvo: mantém a carga;
    - nos outros casos: mesma carga, tentando +1 repetição.
  - A progressão por exercício (melhor série, 1RM estimado por Epley e volume) fica em `/treinador/alunos/[id]/progressao` e no resumo da Evolução do aluno.
- **Catálogo:** exercícios com `sourceId` mostram as fotos reais da [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) (Unlicense / domínio público) em `public/exercises/`. Imagem própria (`imageKey`, no bucket) tem prioridade.
- **Vídeo de execução:** o treinador envia um vídeo curto (MP4, MOV ou WebM, até 60 MB) no catálogo pela rota `POST /api/exercicios/[id]/video`, porque o envio passa do limite das server actions. O arquivo é validado pela assinatura. No player e nos cards, o vídeo toca em loop, sem som, e tem prioridade sobre as imagens. Há também o campo `ExerciseArt.videoKey`, reservado para o clipe de IA gerado a partir das imagens de início e fim.
- **Imagens padrão FORGE (IA):** no catálogo, cada exercício tem versão masculina e feminina, com posição inicial e final. Cada posição é gerada separadamente a partir da foto real daquela posição (um personagem só, mesma câmera), via OpenRouter (`OPENROUTER_API_KEY`; modelo em `OPENROUTER_IMAGE_MODEL`, padrão `google/gemini-3.1-flash-image`, o Nano Banana 2) com o prompt de `lib/exercise-style.ts`. A proposta só aparece para os alunos depois de aprovada (`ExerciseArt`). O **personagem-mestre** (uma imagem escolhida por sexo, em `AppSetting`) vai junto em toda geração como referência de estilo. O aluno vê a versão do sexo cadastrado no perfil; imagem enviada manualmente tem prioridade.

## Check-in

- **Frequência por aluno:** semanal, a cada 10 dias ou quinzenal (`User.checkInEveryDays`), definida pelo treinador em `/treinador/alunos/[id]/check-ins`.
  - **Semanal:** vale a semana de domingo a sábado.
  - **10 ou 14 dias:** o próximo abre N dias depois do último e fica atrasado após 2 dias de tolerância (`lib/metrics.ts`).
  - O formulário edita o check-in do ciclo atual; fora dele, cria um novo.
- **Medidas opcionais:** cintura, quadril, peito, braço, coxa e % de gordura. Vêm preenchidas com as últimas informadas, e a Evolução compara a primeira com a última.
- **Retorno do treinador:** fila em `/treinador` com os check-ins sem retorno, mais antigos primeiro (destaque após 12h). Na revisão, as fotos aparecem lado a lado com as do check-in anterior, e as medidas trazem a diferença. O aluno vê o retorno no "Hoje" (some ao marcar "Entendi") e no histórico.

## Dieta, suplementos e água

- **Dieta:** o treinador monta em `/treinador/alunos/[id]/dieta/[plano]` as metas diárias (kcal, proteína, carboidrato, gordura, água), as refeições com horário e os alimentos (quantidade, macros e substituição), além dos suplementos e medicações com horários. Ao enviar, vira a dieta ativa do aluno, uma por vez. Diferente do treino, pode ser editada depois de enviada.
- **Aluno (`/aluno/dieta`):** anel da meta de água com botões de +250/+500/+750 ml e desfazer; consumo do dia contra a meta, somando as refeições marcadas como feitas; refeições com a próxima em destaque; doses de suplementos e medicações por horário com check. A tela "Hoje" mostra a água e os contadores de refeições e suplementos.
- **Meta de água:** a do plano; sem ela, 35 ml × último peso; sem peso, 2,5 L (`lib/diet.ts`). O "dia" segue o fuso de São Paulo.
- **Medicação** aparece só como lembrete do que o médico prescreveu.

## Banco de alimentos e kits de dieta

- **Alimentos (`/treinador/alimentos`):** 593 alimentos da Tabela TACO (NEPA/UNICAMP, 4ª ed.), com kcal, proteína, carboidrato, gordura e fibra por 100 g. Os dados vêm de [raulfdm/taco-api](https://github.com/raulfdm/taco-api) (licença MIT), e a TACO permite reprodução desde que a fonte seja citada. Quatro itens que a TACO não traz (os dois leites, o iogurte sabor abacaxi e o coco verde) ficaram de fora e podem ser cadastrados pela equipe.
  - A equipe também cadastra alimentos próprios, com porção caseira (por exemplo, "1 scoop = 30 g").
  - As etiquetas de restrição (zero lactose, zero glúten, vegetariano e vegano) foram sugeridas automaticamente de forma conservadora e devem ser revisadas.
  - Foto no padrão FORGE: gerada por IA, com prato preto, ângulo de 45°, fundo escuro e luz laranja (`lib/food-style.ts`). Passa por aprovação e pode usar uma foto-mestre (`AppSetting style_ref_FOOD`) para manter o padrão. Também é possível enviar a foto.
- **Kits (`/treinador/kits`):** modelos de dieta montados com o mesmo editor e guardados em `DietTemplate.content`. O kit aceita uma etiqueta só se todos os alimentos do banco usados nele a tiverem. A migração já traz 4 kits de exemplo: zero lactose, zero glúten, vegano e vegetariano.
- **Editor de dieta:** o campo de alimento busca no banco. Ao escolher um alimento, o item fica ligado a ele (`MealItem.foodId`), e kcal e macros são calculados pelos gramas, partindo da porção caseira quando houver. "Usar kit" aplica um modelo, com filtro por restrição. "Salvar como kit" transforma a dieta atual em modelo.
- **Aluno:** cada alimento do banco que tem foto aparece com a imagem na lista da refeição.

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
