-- CreateTable
CREATE TABLE "Trade" (
    "trade_id" TEXT NOT NULL PRIMARY KEY,
    "start_datetime" DATETIME NOT NULL,
    "end_datetime" DATETIME,
    "trade_type" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "session" TEXT NOT NULL,
    "entry_candle_type" TEXT,
    "strategy_id" TEXT,
    "entry_price" REAL NOT NULL,
    "exit_price" REAL,
    "risk_percentage" REAL,
    "expected_risk_reward" REAL,
    "actual_risk_reward" REAL,
    "trend_multi_timeframe" JSONB,
    "take_profit" REAL,
    "stop_loss" REAL,
    "amount_traded" REAL,
    "lot_size" REAL,
    "leverage" REAL,
    "trade_fees" REAL,
    "pnl" REAL,
    "sl_moved_to_breakeven" BOOLEAN NOT NULL DEFAULT false,
    "account_id" TEXT,
    "balance_before_trade" REAL,
    "balance_after_trade" REAL,
    "increased_lot_size" BOOLEAN NOT NULL DEFAULT false,
    "entry_reason" TEXT,
    "exit_reason" TEXT,
    "notes" TEXT,
    "custom_fields" JSONB,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Trade_strategy_id_fkey" FOREIGN KEY ("strategy_id") REFERENCES "Strategy" ("strategy_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Trade_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account" ("account_id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Strategy" (
    "strategy_id" TEXT NOT NULL PRIMARY KEY,
    "strategy_name" TEXT NOT NULL,
    "strategy_notes" TEXT,
    "custom_fields" JSONB,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Account" (
    "account_id" TEXT NOT NULL PRIMARY KEY,
    "account_name" TEXT NOT NULL,
    "account_balance" REAL,
    "account_type" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Tag" (
    "tag_id" TEXT NOT NULL PRIMARY KEY,
    "tag_name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "TradeTag" (
    "trade_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    PRIMARY KEY ("trade_id", "tag_id"),
    CONSTRAINT "TradeTag_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "Trade" ("trade_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TradeTag_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "Tag" ("tag_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TradeImage" (
    "image_id" TEXT NOT NULL PRIMARY KEY,
    "trade_id" TEXT NOT NULL,
    "image_path" TEXT NOT NULL,
    "uploaded_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TradeImage_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "Trade" ("trade_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StrategyImage" (
    "image_id" TEXT NOT NULL PRIMARY KEY,
    "strategy_id" TEXT NOT NULL,
    "image_path" TEXT NOT NULL,
    "uploaded_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StrategyImage_strategy_id_fkey" FOREIGN KEY ("strategy_id") REFERENCES "Strategy" ("strategy_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Trade_start_datetime_idx" ON "Trade"("start_datetime");

-- CreateIndex
CREATE INDEX "Trade_strategy_id_idx" ON "Trade"("strategy_id");

-- CreateIndex
CREATE INDEX "Trade_account_id_idx" ON "Trade"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_tag_name_key" ON "Tag"("tag_name");

-- CreateIndex
CREATE INDEX "TradeTag_tag_id_idx" ON "TradeTag"("tag_id");

-- CreateIndex
CREATE INDEX "TradeImage_trade_id_idx" ON "TradeImage"("trade_id");

-- CreateIndex
CREATE INDEX "StrategyImage_strategy_id_idx" ON "StrategyImage"("strategy_id");
