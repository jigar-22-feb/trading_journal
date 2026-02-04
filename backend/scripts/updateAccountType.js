/**
 * Update account type from "Funding" to "Funded" in the database
 * Run: node scripts/updateAccountType.js
 */
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const Account = require("../src/models/Account");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/trading_journal";

async function updateAccountType() {
  await mongoose.connect(MONGODB_URI);

  console.log("=== Updating Account Type: Funding → Funded ===");
  
  // Find all accounts with type "Funding"
  const fundingAccounts = await Account.find({ account_type: "Funding" });
  
  if (fundingAccounts.length === 0) {
    console.log("No accounts found with type 'Funding'");
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(`Found ${fundingAccounts.length} account(s) with type 'Funding':`);
  fundingAccounts.forEach(acc => {
    console.log(`  - ${acc.account_name} (${acc.account_type})`);
  });

  // Update all accounts with type "Funding" to "Funded"
  const result = await Account.updateMany(
    { account_type: "Funding" },
    { $set: { account_type: "Funded" } }
  );

  console.log(`\n✅ Updated ${result.modifiedCount} account(s) from 'Funding' to 'Funded'`);

  // Verify the update
  const updatedAccounts = await Account.find({ account_type: "Funded" });
  console.log("\nUpdated accounts:");
  updatedAccounts.forEach(acc => {
    console.log(`  - ${acc.account_name} (${acc.account_type})`);
  });

  await mongoose.disconnect();
  process.exit(0);
}

updateAccountType().catch((err) => {
  console.error("Error updating account type:", err);
  process.exit(1);
});
