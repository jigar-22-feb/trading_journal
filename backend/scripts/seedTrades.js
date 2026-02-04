const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const Trade = require("../src/models/Trade");
const Account = require("../src/models/Account");
const Strategy = require("../src/models/Strategy");

const randomBetween = (min, max) => Math.random() * (max - min) + min;
const randomInt = (min, max) => Math.floor(randomBetween(min, max + 1));
const pick = (arr) => arr[randomInt(0, arr.length - 1)];

const assetConfigs = [
  { asset: "BTCUSDT", min: 35000, max: 75000 },
  { asset: "ETHUSDT", min: 1500, max: 4000 },
  { asset: "EURUSD", min: 1.05, max: 1.15 },
  { asset: "XAUUSD", min: 1800, max: 2500 },
  { asset: "NAS100", min: 14000, max: 18000 },
];

const sessions = ["London", "New York", "Asia"];
const tradeTypes = ["Scalping", "Day Trade", "Swing"];
const timeframes = ["5m", "15m", "1h", "4h"];
const candleTypes = ["Breakout", "Engulfing", "Pinbar", "Inside Bar", "Doji"];
const tagPool = ["confident", "news", "trend", "reversal", "cleanup"];

const computeRiskReward = (direction, entry, target, stop) => {
  const risk = direction === "Long" ? entry - stop : stop - entry;
  const reward = direction === "Long" ? target - entry : entry - target;
  if (risk <= 0) return null;
  const rr = reward / risk;
  return Number.isFinite(rr) ? rr : null;
};

const getMonthDates = (base, monthsAgo) => {
  const year = base.getFullYear();
  const month = base.getMonth() - monthsAgo;
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { year: start.getFullYear(), month: start.getMonth(), days: end.getDate() };
};

const ensureAccounts = async () => {
  const seeds = [
    { account_name: "Paper", account_type: "paper" },
    { account_name: "Funding", account_type: "funding" },
    { account_name: "Personal", account_type: "personal" },
  ];
  const results = [];
  for (const seed of seeds) {
    const existing = await Account.findOne({
      account_name: new RegExp(`^${seed.account_name}$`, "i"),
    });
    if (existing) {
      results.push(existing);
    } else {
      results.push(await Account.create(seed));
    }
  }
  return results;
};

const ensureStrategies = async () => {
  const seeds = [
    { strategy_name: "Momentum Breakout" },
    { strategy_name: "VWAP Bounce" },
    { strategy_name: "Trend Pullback" },
    { strategy_name: "Range Fade" },
  ];
  const results = [];
  for (const seed of seeds) {
    const existing = await Strategy.findOne({
      strategy_name: new RegExp(`^${seed.strategy_name}$`, "i"),
    });
    if (existing) {
      results.push(existing);
    } else {
      results.push(await Strategy.create(seed));
    }
  }
  return results;
};

const buildTrade = (monthMeta, accounts, strategies, indexOffset) => {
  const { year, month, days } = monthMeta;
  const day = randomInt(1, days);
  const hour = randomInt(6, 20);
  const minute = randomInt(0, 59);
  const start = new Date(year, month, day, hour, minute, 0);
  const end = new Date(start.getTime() + randomInt(15, 240) * 60000);

  const assetConfig = pick(assetConfigs);
  const entry = Number(randomBetween(assetConfig.min, assetConfig.max).toFixed(2));
  const direction = Math.random() > 0.48 ? "Long" : "Short";
  const riskDistance = Number((entry * randomBetween(0.001, 0.01)).toFixed(2));
  const rrTarget = Number(randomBetween(1.2, 3.5).toFixed(2));
  const takeProfit =
    direction === "Long"
      ? Number((entry + riskDistance * rrTarget).toFixed(2))
      : Number((entry - riskDistance * rrTarget).toFixed(2));
  const stopLoss =
    direction === "Long"
      ? Number((entry - riskDistance).toFixed(2))
      : Number((entry + riskDistance).toFixed(2));

  const win = Math.random() > 0.45;
  const exitMove = riskDistance * (win ? randomBetween(0.6, rrTarget) : -randomBetween(0.2, 0.9));
  const exit =
    direction === "Long"
      ? Number((entry + exitMove).toFixed(2))
      : Number((entry - exitMove).toFixed(2));
  const lotSize = Number(randomBetween(0.5, 3.5).toFixed(2));
  const rawPnl =
    direction === "Long" ? (exit - entry) * lotSize : (entry - exit) * lotSize;
  const fees = Number(randomBetween(0.5, 6).toFixed(2));
  const pnl = Number((rawPnl - fees).toFixed(2));

  const account = pick(accounts);
  const strategy = pick(strategies);
  const expectedRR = computeRiskReward(direction, entry, takeProfit, stopLoss);
  const actualRR = computeRiskReward(direction, entry, exit, stopLoss);
  const tags = [pick(tagPool), Math.random() > 0.6 ? pick(tagPool) : null]
    .filter(Boolean)
    .filter((value, idx, arr) => arr.indexOf(value) === idx);

  return {
    trade_id: `TRD-${Date.now()}-${indexOffset}`,
    start_datetime: start,
    end_datetime: end,
    trade_type: pick(tradeTypes),
    asset: assetConfig.asset,
    direction,
    timeframe: pick(timeframes),
    session: pick(sessions),
    entry_candle_type: pick(candleTypes),
    strategy_id: strategy?._id,
    strategy_name: strategy?.strategy_name ?? "",
    entry_price: entry,
    exit_price: exit,
    risk_percentage: Number(randomBetween(0.5, 2.5).toFixed(2)),
    expected_risk_reward: expectedRR ? Number(expectedRR.toFixed(2)) : null,
    actual_risk_reward: actualRR ? Number(actualRR.toFixed(2)) : null,
    take_profit: takeProfit,
    stop_loss: stopLoss,
    amount_traded: Number(randomBetween(100, 5000).toFixed(2)),
    lot_size: lotSize,
    leverage: randomInt(1, 20),
    trade_fees: fees,
    pnl,
    sl_moved_to_breakeven: Math.random() > 0.8,
    account_id: account?._id,
    account_name: account?.account_name ?? "",
    balance_before_trade: Number(randomBetween(1000, 20000).toFixed(2)),
    balance_after_trade: Number(randomBetween(1000, 22000).toFixed(2)),
    increased_lot_size: Math.random() > 0.7,
    entry_reason: "Rule-based entry",
    exit_reason: win ? "Target hit" : "Stopped out",
    notes: "Seeded trade",
    tags,
  };
};

const run = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is missing in backend/.env");
  }
  await mongoose.connect(uri);

  const accounts = await ensureAccounts();
  const strategies = await ensureStrategies();

  const now = new Date();
  const trades = [];
  let indexOffset = 1;
  for (let i = 0; i < 5; i += 1) {
    const monthMeta = getMonthDates(now, i);
    const count = randomInt(8, 10);
    for (let j = 0; j < count; j += 1) {
      trades.push(buildTrade(monthMeta, accounts, strategies, indexOffset));
      indexOffset += 1;
    }
  }

  await Trade.insertMany(trades);
  console.log(`Inserted ${trades.length} trades across 5 months.`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  mongoose.disconnect().finally(() => process.exit(1));
});
