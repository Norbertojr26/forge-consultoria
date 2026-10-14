-- RIR por série, alvo de RIR por exercício e exercício copiado na série (histórico entre planos)
ALTER TABLE "WorkoutItem" ADD COLUMN "targetRir" INTEGER;
ALTER TABLE "SetLog" ADD COLUMN "rir" INTEGER, ADD COLUMN "exerciseId" TEXT;
UPDATE "SetLog" s SET "exerciseId" = i."exerciseId" FROM "WorkoutItem" i WHERE s."itemId" = i."id";
CREATE INDEX "SetLog_exerciseId_idx" ON "SetLog"("exerciseId");
