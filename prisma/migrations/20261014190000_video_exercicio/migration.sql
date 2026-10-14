-- Vídeo de execução: enviado pelo treinador (Exercise) ou gerado por IA (ExerciseArt)
ALTER TABLE "Exercise" ADD COLUMN "videoKey" TEXT;
ALTER TABLE "ExerciseArt" ADD COLUMN "videoKey" TEXT;
