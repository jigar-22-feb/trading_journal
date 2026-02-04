/**
 * One-time migration:
 * 1. Migrate trade_id to trd-1, trd-2, ... (by created_at)
 * 2. Change account_type "Paper" to "Demo"
 * 3. Ensure three accounts exist: "Trading view -D" (Demo), "Delta ex -P" (Personal), "exness -F" (Funding)
 * 4. Assign all trades to one of these accounts (default: "Trading view -D")
 *
 * Run from backend folder: node scripts/migrateAccountsAndTradeIds.js
 * Ensure MongoDB is running (e.g. mongodb://127.0.0.1:27017/trading_journal).
 */
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/trading_journal";

const DEMO_ACCOUNT = { account_name: "Trading view -D", account_type: "Demo" };
const PERSONAL_ACCOUNT = { account_name: "Delta ex -P", account_type: "Personal" };
const FUNDING_ACCOUNT = { account_name: "exness -F", account_type: "Funding" };

async function connect() {
  await mongoose.connect(MONGODB_URI);
}

async function run() {
  await connect();
  const Trade = require("../src/models/Trade");
  const Account = require("../src/models/Account");

  console.log("--- 1. Migrating trade_id to trd-1, trd-2, ... ---");
  const trades = await Trade.find({}).sort({ created_at: 1 }).lean();
  console.log(`Found ${trades.length} trades.`);

  for (let i = 0; i < trades.length; i++) {
    await Trade.updateOne(
      { _id: trades[i]._id },
      { $set: { trade_id: `_mig_${trades[i]._id}` } }
    );
  }
  for (let i = 0; i < trades.length; i++) {
    await Trade.updateOne(
      { _id: trades[i]._id },
      { $set: { trade_id: `trd-${i + 1}` } }
    );
  }
  console.log("Trade IDs updated to trd-1, trd-2, ...");

  console.log("--- 2. Updating account_type Paper -> Demo ---");
  const paperResult = await Account.updateMany(
    { account_type: "Paper" },
    { $set: { account_type: "Demo" } }
  );
  console.log(`Updated ${paperResult.modifiedCount} account(s) from Paper to Demo.`);

  console.log("--- 3. Ensuring default accounts exist ---");
  const defaults = [
    { account_name: DEMO_ACCOUNT.account_name, account_type: DEMO_ACCOUNT.account_type },
    { account_name: PERSONAL_ACCOUNT.account_name, account_type: PERSONAL_ACCOUNT.account_type },
    { account_name: FUNDING_ACCOUNT.account_name, account_type: FUNDING_ACCOUNT.account_type },
  ];
  const accountIds = {};
  for (const def of defaults) {
    let acc = await Account.findOne({ account_name: def.account_name });
    if (!acc) {
      acc = await Account.create({
        account_name: def.account_name,
        account_type: def.account_type,
      });
      console.log(`Created account: ${acc.account_name}`);
    } else {
      await Account.updateOne(
        { _id: acc._id },
        { $set: { account_type: def.account_type } }
      );
    }
    accountIds[def.account_name] = acc._id;
  }

  console.log("--- 4. Assigning all trades to one of the three accounts ---");
  const defaultAccountId = accountIds[DEMO_ACCOUNT.account_name];
  const defaultAccountName = DEMO_ACCOUNT.account_name;
  const validNames = [DEMO_ACCOUNT.account_name, PERSONAL_ACCOUNT.account_name, FUNDING_ACCOUNT.account_name];

  const allTrades = await Trade.find({}).lean();
  let updated = 0;
  for (const t of allTrades) {
    const currentName = (t.account_name || "").trim();
    const matchName = validNames.find(
      (n) => n.toLowerCase() === currentName.toLowerCase()
    );
    const targetName = matchName || defaultAccountName;
    const targetId = accountIds[targetName] || defaultAccountId;
    if (t.account_id?.toString() !== targetId.toString() || (t.account_name || "") !== targetName) {
      await Trade.updateOne(
        { _id: t._id },
        { $set: { account_id: targetId, account_name: targetName } }
      );
      updated++;
    }
  }
  console.log(`Updated account_id/account_name for ${updated} trade(s).`);

  console.log("--- Done ---");
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
