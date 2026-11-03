-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('ACTIVE', 'SETTLED');

-- CreateTable
CREATE TABLE "BlackjackRound" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "RoundStatus" NOT NULL DEFAULT 'ACTIVE',
    "state" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "dealKey" TEXT NOT NULL,
    "totalStake" INTEGER NOT NULL,
    "totalPayout" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "BlackjackRound_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BlackjackRound_userId_status_idx" ON "BlackjackRound"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BlackjackRound_userId_dealKey_key" ON "BlackjackRound"("userId", "dealKey");

-- AddForeignKey
ALTER TABLE "BlackjackRound" ADD CONSTRAINT "BlackjackRound_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
