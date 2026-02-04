/**
 * Seed dummy trades with all fields and custom_fields (Trade Features) in canonical form order.
 * Uses existing accounts (Trading view -D, Delta ex -P, exness -F) and strategies (9-15 ema, 8-33 ema, MMC).
 * Run: node scripts/seedDummyTrades.js
 *
 * Feature key order must match the form order so DB and UI stay in sync.
 */
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const Trade = require("../src/models/Trade");
const Account = require("../src/models/Account");
const Strategy = require("../src/models/Strategy");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/trading_journal";

// Canonical order of feature keys (same as in forms: Trade Features, Account Features, Strategy Features)
const TRADE_FEATURE_ORDER = [
  "Setup",
  "Market_condition",
  "Conviction",
  "Risk_notes",
  "Trade_grade",
];
const ACCOUNT_FEATURE_ORDER = ["Broker", "Currency", "Platform"];
const STRATEGY_FEATURE_ORDER = ["Timeframe_focus", "Indicators", "Style"];

/** Build an object with keys in the given order (so DB order matches form order). */
function buildOrderedFields(keys, keyToValue) {
  const o = {};
  keys.forEach((k) => {
    const v = keyToValue[k];
    if (v !== undefined && v !== null) o[k] = v;
  });
  return o;
}

const randomBetween = (min, max) => Math.random() * (max - min) + min;
const randomInt = (min, max) => Math.floor(randomBetween(min, max + 1));
const pick = (arr) => arr[randomInt(0, arr.length - 1)];

const assets = ["BTCUSDT", "ETHUSDT", "EURUSD", "XAUUSD", "NAS100"];
const sessions = ["London", "New York", "Asia"];
const tradeTypes = ["Scalping", "Day Trade", "Swing"];
const timeframes = ["5m", "15m", "1h", "4h"];
const candleTypes = ["Breakout", "Engulfing", "Pinbar", "Inside Bar", "Doji"];
const setups = ["9-15 ema pullback", "8-33 trend", "MMC breakout"];
const marketConditions = ["Trending", "Ranging", "Volatile", "Quiet"];
const convictions = ["High", "Medium", "Low"];
const tradeGrades = ["A", "B", "C"];
const tagPool = ["confident", "news", "trend", "reversal"];

function computeRR(direction, entry, target, stop) {
  const risk = direction === "Long" ? entry - stop : stop - entry;
  const reward = direction === "Long" ? target - entry : entry - target;
  if (risk <= 0) return null;
  return Number((reward / risk).toFixed(3));
}

async function ensureAccounts() {
  const names = ["Trading view -D", "Delta ex -P", "exness -F"];
  const types = ["Demo", "Personal", "Funding"];
  const accounts = [];
  for (let i = 0; i < names.length; i++) {
    let acc = await Account.findOne({ account_name: names[i] });
    if (!acc) {
      acc = await Account.create({
        account_name: names[i],
        account_type: types[i],
        initial_balance: 10000,
        custom_fields: buildOrderedFields(ACCOUNT_FEATURE_ORDER, {
          Broker: i === 0 ? "Trading view" : i === 1 ? "Delta" : "Exness",
          Currency: "USD",
          Platform: "MT5",
        }),
      });
      console.log("Created account:", acc.account_name);
    }
    accounts.push(acc);
  }
  return accounts;
}

async function ensureStrategies() {
  const names = ["9-15 ema", "8-33 ema", "MMC"];
  const strategies = [];
  for (const name of names) {
    let s = await Strategy.findOne({ strategy_name: name });
    if (!s) {
      s = await Strategy.create({
        strategy_name: name,
        strategy_notes: `Strategy: ${name}`,
        custom_fields: buildOrderedFields(STRATEGY_FEATURE_ORDER, {
          Timeframe_focus: "15m-1h",
          Indicators: "EMA",
          Style: "Trend",
        }),
      });
      console.log("Created strategy:", s.strategy_name);
    }
    strategies.push(s);
  }
  return strategies;
}

async function getNextTradeNumber() {
  const trades = await Trade.find({}).select("trade_id").lean();
  const parse = (id) => {
    const m = (id || "").match(/trd-(\d+)/i);
    return m ? parseInt(m[1], 10) : 0;
  };
  const max = trades.reduce((m, t) => Math.max(m, parse(t.trade_id)), 0);
  return max + 1;
}

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

function buildDummyTrade(index, accounts, strategies, startTradeNum) {
  const now = Date.now();
  const startMs = now - randomBetween(0, SIX_MONTHS_MS);
  const start = new Date(startMs);
  start.setHours(9 + (index % 8), index % 60, 0, 0);
  const end = new Date(start.getTime() + (30 + index * 5) * 60000);

  const asset = pick(assets);
  const direction = index % 2 === 0 ? "Long" : "Short";
  const ranges = {
    BTCUSDT: [40000, 70000],
    ETHUSDT: [2000, 3500],
    EURUSD: [1.05, 1.15],
    XAUUSD: [1800, 2500],
    NAS100: [14000, 18000],
  };
  const [min, max] = ranges[asset] || [100, 200];
  const entry = Number(randomBetween(min, max).toFixed(2));
  const stopDist = Number((entry * 0.005).toFixed(2));
  const stop = direction === "Long" ? entry - stopDist : entry + stopDist;
  const tpDist = Number((stopDist * (1.5 + index * 0.1)).toFixed(2));
  const takeProfit = direction === "Long" ? entry + tpDist : entry - tpDist;
  const exitMove = stopDist * (index % 3 === 0 ? -0.5 : 1.2);
  const exit = direction === "Long" ? entry + exitMove : entry - exitMove;

  const lotSize = Number(randomBetween(0.1, 2).toFixed(2));
  const rawPnl = direction === "Long" ? (exit - entry) * lotSize : (entry - exit) * lotSize;
  const fees = Number(randomBetween(0.5, 3).toFixed(2));
  const pnl = Number((rawPnl - fees).toFixed(3));
  const expectedRR = computeRR(direction, entry, takeProfit, stop);
  const actualRR = computeRR(direction, entry, exit, stop);

  const account = pick(accounts);
  const strategy = pick(strategies);

  const custom_fields = buildOrderedFields(TRADE_FEATURE_ORDER, {
    Setup: pick(setups),
    Market_condition: pick(marketConditions),
    Conviction: pick(convictions),
    Risk_notes: `R:R ${(actualRR || 0).toFixed(2)}`,
    Trade_grade: pick(tradeGrades),
  });

  const tags = [pick(tagPool)];
  if (index % 2 === 0) tags.push(pick(tagPool));
  const uniqueTags = [...new Set(tags)];

  return {
    trade_id: `trd-${startTradeNum + index}`,
    start_datetime: start,
    end_datetime: end,
    trade_type: pick(tradeTypes),
    asset,
    direction,
    timeframe: pick(timeframes),
    session: pick(sessions),
    entry_candle_type: pick(candleTypes),
    strategy_id: strategy._id,
    strategy_name: strategy.strategy_name,
    entry_price: entry,
    exit_price: exit,
    risk_percentage: Number(randomBetween(0.5, 2).toFixed(2)),
    expected_risk_reward: expectedRR,
    actual_risk_reward: actualRR,
    take_profit: takeProfit,
    stop_loss: stop,
    amount_traded: Number((entry * lotSize).toFixed(2)),
    lot_size: lotSize,
    leverage: randomInt(5, 20),
    trade_fees: fees,
    pnl,
    sl_moved_to_breakeven: index % 4 === 0,
    account_id: account._id,
    account_name: account.account_name,
    balance_before_trade: 10000 + index * 50,
    balance_after_trade: 10000 + index * 50 + pnl,
    increased_lot_size: index % 5 === 0,
    entry_reason: "Setup + confluence",
    exit_reason: pnl >= 0 ? "Target" : "Stop",
    notes: `Dummy trade ${index + 1}`,
    custom_fields,
    tags: uniqueTags,
  };
}

async function run() {
  await mongoose.connect(MONGODB_URI);

  const accounts = await ensureAccounts();
  const strategies = await ensureStrategies();
  if (accounts.length === 0) throw new Error("Need at least one account");
  if (strategies.length === 0) throw new Error("Need at least one strategy");

  const startNum = await getNextTradeNumber();
  const count = Number(process.env.SEED_COUNT) || 100;
  const trades = [];
  for (let i = 0; i < count; i++) {
    trades.push(buildDummyTrade(i, accounts, strategies, startNum));
  }

  await Trade.insertMany(trades);
  console.log(`Inserted ${trades.length} dummy trades (trd-${startNum} to trd-${startNum + count - 1}) over last 6 months.`);
  console.log("Trade Features order in DB:", TRADE_FEATURE_ORDER.join(" → "));
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
