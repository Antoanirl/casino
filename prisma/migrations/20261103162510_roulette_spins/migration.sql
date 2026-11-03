-- CreateTable
CREATE TABLE "RouletteSpin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "spinKey" TEXT NOT NULL,
    "bets" JSONB NOT NULL,
    "pocket" INTEGER NOT NULL,
    "totalStake" INTEGER NOT NULL,
    "totalPayout" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RouletteSpin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RouletteSpin_userId_createdAt_idx" ON "RouletteSpin"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RouletteSpin_userId_spinKey_key" ON "RouletteSpin"("userId", "spinKey");

-- AddForeignKey
ALTER TABLE "RouletteSpin" ADD CONSTRAINT "RouletteSpin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
