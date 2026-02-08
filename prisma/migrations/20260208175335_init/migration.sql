-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPERADMIN', 'ADMIN', 'SCHOLAR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SCHOLAR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chore" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChoreAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "choreId" TEXT,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChoreAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChoreConfig" (
    "id" TEXT NOT NULL,
    "timesPerWeek" INTEGER NOT NULL DEFAULT 2,
    "choreDays" TEXT NOT NULL DEFAULT '[1,4]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChoreConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RotationState" (
    "id" TEXT NOT NULL,
    "offset" INTEGER NOT NULL DEFAULT 0,
    "lastRotated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RotationState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "ChoreAssignment_weekStart_idx" ON "ChoreAssignment"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "ChoreAssignment_userId_weekStart_key" ON "ChoreAssignment"("userId", "weekStart");

-- AddForeignKey
ALTER TABLE "ChoreAssignment" ADD CONSTRAINT "ChoreAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreAssignment" ADD CONSTRAINT "ChoreAssignment_choreId_fkey" FOREIGN KEY ("choreId") REFERENCES "Chore"("id") ON DELETE SET NULL ON UPDATE CASCADE;
