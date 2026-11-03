-- CreateTable
CREATE TABLE "SlotSpin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "spinKey" TEXT NOT NULL,
    "bet" INTEGER NOT NULL,
    "stops" JSONB NOT NULL,
    "totalPayout" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlotSpin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SlotSpin_userId_game_createdAt_idx" ON "SlotSpin"("userId", "game", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SlotSpin_userId_spinKey_key" ON "SlotSpin"("userId", "spinKey");

-- AddForeignKey
ALTER TABLE "SlotSpin" ADD CONSTRAINT "SlotSpin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
