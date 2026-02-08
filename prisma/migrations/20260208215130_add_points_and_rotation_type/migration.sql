-- CreateEnum
CREATE TYPE "RotationType" AS ENUM ('WEEKLY', 'DAILY');

-- AlterTable
ALTER TABLE "Chore" ADD COLUMN     "rotationType" "RotationType" NOT NULL DEFAULT 'WEEKLY';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 0;
