-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('pending', 'success', 'failed');

-- CreateTable
CREATE TABLE "Stock" (
    "id" SERIAL NOT NULL,
    "rank" INTEGER NOT NULL,
    "stockCode" TEXT NOT NULL,
    "providerSymbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyPrice" (
    "id" SERIAL NOT NULL,
    "stockId" INTEGER NOT NULL,
    "tradingDate" TIMESTAMP(3) NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MYR',
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "status" "SyncStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "errorSummary" TEXT,
    "rowsInserted" INTEGER NOT NULL DEFAULT 0,
    "rowsUpdated" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Stock_rank_key" ON "Stock"("rank");

-- CreateIndex
CREATE UNIQUE INDEX "Stock_stockCode_key" ON "Stock"("stockCode");

-- CreateIndex
CREATE UNIQUE INDEX "Stock_providerSymbol_key" ON "Stock"("providerSymbol");

-- CreateIndex
CREATE INDEX "Stock_isActive_rank_idx" ON "Stock"("isActive", "rank");

-- CreateIndex
CREATE INDEX "DailyPrice_tradingDate_idx" ON "DailyPrice"("tradingDate");

-- CreateIndex
CREATE INDEX "DailyPrice_stockId_tradingDate_idx" ON "DailyPrice"("stockId", "tradingDate" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "DailyPrice_stockId_tradingDate_key" ON "DailyPrice"("stockId", "tradingDate");

-- CreateIndex
CREATE INDEX "SyncRun_targetDate_status_idx" ON "SyncRun"("targetDate", "status");

-- CreateIndex
CREATE INDEX "SyncRun_createdAt_idx" ON "SyncRun"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "DailyPrice" ADD CONSTRAINT "DailyPrice_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
