/*
  Warnings:

  - A unique constraint covering the columns `[userId,weekStart,dayIndex]` on the table `ChoreAssignment` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ChoreAssignment_userId_weekStart_key";

-- AlterTable
ALTER TABLE "ChoreAssignment" ADD COLUMN     "dayIndex" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "ChoreAssignment_userId_weekStart_dayIndex_key" ON "ChoreAssignment"("userId", "weekStart", "dayIndex");
