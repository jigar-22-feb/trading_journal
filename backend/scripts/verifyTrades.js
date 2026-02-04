const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const Trade = require("../src/models/Trade");
const Strategy = require("../src/models/Strategy");
const Account = require("../src/models/Account");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/trading_journal";

async function verify() {
  await mongoose.connect(MONGODB_URI);

  const totalTrades = await Trade.countDocuments();
  const strategies = await Trade.distinct("strategy_name");
  const accounts = await Trade.distinct("account_name");
  
  // Get all tags (they're stored as arrays)
  const allTrades = await Trade.find({}).select("tags").lean();
  const allTags = new Set();
  allTrades.forEach(t => {
    if (Array.isArray(t.tags)) {
      t.tags.forEach(tag => allTags.add(tag));
    }
  });

  const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);
  const recentTrades = await Trade.countDocuments({
    start_datetime: { $gte: sixMonthsAgo }
  });

  // Check strategy distribution
  const strategyCounts = {};
  for (const s of strategies) {
    strategyCounts[s] = await Trade.countDocuments({ strategy_name: s });
  }

  // Check account distribution
  const accountCounts = {};
  for (const a of accounts) {
    accountCounts[a] = await Trade.countDocuments({ account_name: a });
  }

  console.log("=== Trade Verification ===");
  console.log(`Total trades: ${totalTrades}`);
  console.log(`Trades in last 6 months: ${recentTrades}`);
  console.log(`\nStrategies used: ${strategies.join(", ")}`);
  console.log("Strategy distribution:");
  Object.entries(strategyCounts).forEach(([s, count]) => {
    console.log(`  ${s}: ${count} trades`);
  });
  console.log(`\nAccounts used: ${accounts.join(", ")}`);
  console.log("Account distribution:");
  Object.entries(accountCounts).forEach(([a, count]) => {
    console.log(`  ${a}: ${count} trades`);
  });
  console.log(`\nUnique tags: ${allTags.size}`);
  const tagArray = Array.from(allTags).slice(0, 20);
  console.log(`Sample tags (first 20): ${tagArray.join(", ")}`);

  // Verify all required strategies exist
  const requiredStrategies = ["9-15 ema", "8-33 ema", "MMC"];
  const missingStrategies = requiredStrategies.filter(s => !strategies.includes(s));
  if (missingStrategies.length > 0) {
    console.log(`\n⚠️  Missing strategies: ${missingStrategies.join(", ")}`);
  } else {
    console.log("\n✅ All required strategies are present");
  }

  await mongoose.disconnect();
  process.exit(0);
}

verify().catch((err) => {
  console.error(err);
  process.exit(1);
});
