-- AlterTable
ALTER TABLE "CardioLog" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "stravaActivityId" BIGINT;

-- CreateTable
CREATE TABLE "StravaConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "athleteId" BIGINT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scope" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "profilePicture" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StravaConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StravaWebhookEvent" (
    "id" TEXT NOT NULL,
    "aspectType" TEXT NOT NULL,
    "objectType" TEXT NOT NULL,
    "objectId" BIGINT NOT NULL,
    "ownerId" BIGINT NOT NULL,
    "updates" JSONB,
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StravaWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StravaConnection_userId_key" ON "StravaConnection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StravaConnection_athleteId_key" ON "StravaConnection"("athleteId");

-- CreateIndex
CREATE INDEX "StravaWebhookEvent_ownerId_processedAt_idx" ON "StravaWebhookEvent"("ownerId", "processedAt");

-- CreateIndex
CREATE INDEX "StravaWebhookEvent_objectId_idx" ON "StravaWebhookEvent"("objectId");

-- CreateIndex
CREATE UNIQUE INDEX "CardioLog_stravaActivityId_key" ON "CardioLog"("stravaActivityId");

-- AddForeignKey
ALTER TABLE "StravaConnection" ADD CONSTRAINT "StravaConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

