-- Check-in completo: frequência por aluno, data do envio, medidas e retorno do treinador

ALTER TABLE "User" ADD COLUMN "checkInEveryDays" INTEGER NOT NULL DEFAULT 7;

ALTER TABLE "CheckIn" ADD COLUMN "armCm" DOUBLE PRECISION,
ADD COLUMN "bodyFatPct" DOUBLE PRECISION,
ADD COLUMN "chestCm" DOUBLE PRECISION,
ADD COLUMN "date" DATE,
ADD COLUMN "feedback" TEXT,
ADD COLUMN "feedbackAt" TIMESTAMP(3),
ADD COLUMN "feedbackById" TEXT,
ADD COLUMN "feedbackSeenAt" TIMESTAMP(3),
ADD COLUMN "hipCm" DOUBLE PRECISION,
ADD COLUMN "thighCm" DOUBLE PRECISION,
ADD COLUMN "waistCm" DOUBLE PRECISION;

-- Check-ins antigos: a data é o dia do envio no fuso de São Paulo
UPDATE "CheckIn" SET "date" = ("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date;
ALTER TABLE "CheckIn" ALTER COLUMN "date" SET NOT NULL;

ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_feedbackById_fkey" FOREIGN KEY ("feedbackById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
