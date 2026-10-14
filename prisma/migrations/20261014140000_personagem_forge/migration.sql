-- Personagem FORGE: versões masculina/feminina, posição inicial e final, imagem-mestre de estilo
CREATE TYPE "Sex" AS ENUM ('MALE', 'FEMALE');

ALTER TABLE "User" ADD COLUMN "sex" "Sex";

CREATE TABLE "ExerciseArt" (
    "id" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "sex" "Sex" NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "startKey" TEXT NOT NULL,
    "endKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExerciseArt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ExerciseArt_exerciseId_sex_approved_key" ON "ExerciseArt"("exerciseId", "sex", "approved");
ALTER TABLE "ExerciseArt" ADD CONSTRAINT "ExerciseArt_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- Imagens do primeiro piloto (personagem duplicado) saem de cena; a imagem manual continua.
ALTER TABLE "Exercise" DROP COLUMN "imageCandidateKey";
UPDATE "Exercise" SET "imageKey" = NULL WHERE "imageKey" LIKE '%/ia-%';
