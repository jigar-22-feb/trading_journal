/**
 * Migrate all existing trades to numeric trade_id: trd-1, trd-2, ...
 * Order is by created_at (oldest first).
 * Run once: node scripts/migrateTradeIds.js
 */
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const connect = async () => {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/trading_journal";
  await mongoose.connect(uri);
};

const run = async () => {
  await connect();
  const Trade = require("../src/models/Trade");

  const trades = await Trade.find({}).sort({ created_at: 1 }).lean();
  console.log(`Found ${trades.length} trades to migrate.`);

  // First set all to temporary ids to avoid unique constraint conflicts
  for (let i = 0; i < trades.length; i++) {
    await Trade.updateOne(
      { _id: trades[i]._id },
      { $set: { trade_id: `_mig_${trades[i]._id}` } }
    );
  }
  // Then set final trd-1, trd-2, ...
  for (let i = 0; i < trades.length; i++) {
    await Trade.updateOne(
      { _id: trades[i]._id },
      { $set: { trade_id: `trd-${i + 1}` } }
    );
  }

  console.log("Done. Trade IDs are now trd-1, trd-2, ...");
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
