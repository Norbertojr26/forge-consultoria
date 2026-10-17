-- CreateTable
CREATE TABLE "Routine" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "sleepGoalHours" DOUBLE PRECISION,
    "bedtime" TEXT,
    "sleepNotes" TEXT,
    "mobilityPerWeek" INTEGER,
    "mobilityNotes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Routine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardioPrescription" (
    "id" TEXT NOT NULL,
    "routineId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "modality" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "perWeek" INTEGER NOT NULL,
    "intensity" TEXT,
    "notes" TEXT,

    CONSTRAINT "CardioPrescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobilityDrill" (
    "id" TEXT NOT NULL,
    "routineId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "prescription" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "MobilityDrill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardioLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "prescriptionId" TEXT,
    "kind" TEXT NOT NULL,
    "modality" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "distanceKm" DOUBLE PRECISION,
    "avgHr" INTEGER,
    "rpe" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardioLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SleepLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "bedtime" TEXT NOT NULL,
    "wakeTime" TEXT NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "quality" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SleepLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Routine_studentId_key" ON "Routine"("studentId");

-- CreateIndex
CREATE INDEX "CardioLog_userId_date_idx" ON "CardioLog"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "SleepLog_userId_date_key" ON "SleepLog"("userId", "date");

-- AddForeignKey
ALTER TABLE "Routine" ADD CONSTRAINT "Routine_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardioPrescription" ADD CONSTRAINT "CardioPrescription_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobilityDrill" ADD CONSTRAINT "MobilityDrill_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardioLog" ADD CONSTRAINT "CardioLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SleepLog" ADD CONSTRAINT "SleepLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

