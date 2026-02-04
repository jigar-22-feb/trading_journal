const mongoose = require("mongoose");
const dotenv = require("dotenv");

const Trade = require("./models/Trade");
const Account = require("./models/Account");
const Strategy = require("./models/Strategy");

dotenv.config();

const DEFAULT_MONGO_URI = "mongodb://127.0.0.1:27017/trading_journal";
const MONGODB_URI = process.env.MONGODB_URI || DEFAULT_MONGO_URI;

async function ensureDemoAccount() {
  const existing = await Account.findOne();
  if (existing) return existing;

  return Account.create({
    account_name: "Demo Account",
    account_type: "Demo",
    initial_balance: 10000,
    account_balance: 10000,
    custom_fields: {},
  });
}

async function ensureDemoStrategy() {
  const existing = await Strategy.findOne();
  if (existing) return existing;

  return Strategy.create({
    strategy_name: "Demo Strategy",
    strategy_notes: "Seed data strategy used for demo trades.",
    custom_fields: {},
    images: [],
  });
}

async function seedTrades() {
  const account = await ensureDemoAccount();
  const strategy = await ensureDemoStrategy();

  const baseDate = new Date();

  const assets = ["BTCUSDT", "ETHUSDT", "XAU/USD", "USOIL"];
  const tradeTypes = ["Scalping", "Intraday", "BTST", "Swing", "Position"];
  const directions = ["Long", "Short"];
  const timeframes = ["M5", "M15", "H1", "H4", "D1"];
  const sessions = ["Tokyo", "London", "New York"];

  let balance = account.account_balance ?? account.initial_balance ?? 10000;

  for (let i = 0; i < 100; i += 1) {
    const tradeId = `seed-trd-${i + 1}`;

    // Skip if this trade_id already exists so the script is idempotent
    // and can be safely re-run without duplicate key errors.
    // eslint-disable-next-line no-await-in-loop
    const exists = await Trade.exists({ trade_id: tradeId });
    if (exists) continue;

    const dayOffset = -(i % 60); // spread roughly over last 60 days
    const start = new Date(baseDate);
    start.setDate(start.getDate() + dayOffset);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const riskPercentage = 1 + (i % 3); // 1–3%
    const expectedRR = 1 + (i % 4); // 1–4R
    const isWin = i % 3 !== 0; // about 2/3 wins

    const riskAmount = balance * (riskPercentage / 100);
    const pnl = isWin ? riskAmount * expectedRR : -riskAmount;

    const entryPrice = 100 + i;
    const exitPrice = entryPrice + (isWin ? 5 : -5);

    const tradeDoc = {
      trade_id: tradeId,
      start_datetime: start,
      end_datetime: end,
      trade_type: tradeTypes[i % tradeTypes.length],
      asset: assets[i % assets.length],
      direction: directions[i % directions.length],
      timeframe: timeframes[i % timeframes.length],
      session: sessions[i % sessions.length],
      entry_candle_type: "Seed",
      strategy_id: strategy._id,
      strategy_name: strategy.strategy_name,
      entry_price: entryPrice,
      exit_price: exitPrice,
      risk_percentage: riskPercentage,
      expected_risk_reward: expectedRR,
      actual_risk_reward: isWin ? expectedRR - 0.2 : -1,
      take_profit: entryPrice + 10,
      stop_loss: entryPrice - 10,
      amount_traded: 1000,
      lot_size: 1,
      leverage: 10,
      trade_fees: 1,
      pnl,
      sl_moved_to_breakeven: false,
      account_id: account._id,
      account_name: account.account_name,
      balance_before_trade: balance,
      balance_after_trade: balance + pnl,
      increased_lot_size: i % 10 === 0,
      entry_reason: "Seed trade entry reason.",
      exit_reason: "Seed trade exit reason.",
      notes: "This is a dummy trade created by the seed script.",
      custom_fields: {},
      tags: ["seed"],
      images: [],
    };

    // eslint-disable-next-line no-await-in-loop
    await Trade.create(tradeDoc);
    balance += pnl;
  }

  console.log("✅ Seeded up to 100 demo trades.");
}

async function main() {
  try {
    console.log(`Connecting to MongoDB at ${MONGODB_URI}...`);
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    await seedTrades();
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

main();

