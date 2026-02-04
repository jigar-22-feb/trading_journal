# Database migration

## How to run the migration (trade IDs + accounts)

This migration:

1. Sets all trade IDs to **trd-1**, **trd-2**, … (by creation date).
2. Changes any account type **Paper** to **Demo**.
3. Ensures these three accounts exist: **Trading view -D** (Demo), **Delta ex -P** (Personal), **exness -F** (Funding).
4. Assigns every trade to one of these accounts (by name and `account_id`).

**Steps:**

1. Make sure **MongoDB is running** (e.g. `mongodb://127.0.0.1:27017`).
2. Open a terminal in the **backend** folder:
   ```bash
   cd backend
   node scripts/migrateAccountsAndTradeIds.js
   ```
3. You should see log lines for each step. When it finishes, trade IDs are trd-1, trd-2, … and all trades use one of the three account names above.

**Optional:** To use a different database URL, set `MONGODB_URI` in a `.env` file in the backend folder before running the script.

## Where “account” is stored on a trade

Each **trade** document in MongoDB has:

- **account_id** – ObjectId reference to the Account document.
- **account_name** – String (e.g. `"Trading view -D"`).

You can see both in MongoDB Compass under the `trades` collection.

## Custom fields / features in the database

All of these are stored and returned by the API:

- **Trade:** `custom_fields` (object, key/value). Form: “Trade Features”.
- **Account:** `custom_fields` (object). Form: “Account Features”.
- **Strategy:** `custom_fields` (object). Form: “Strategy Features” / custom feature fields.

They appear in the same form sections in the UI and are persisted in the corresponding collections.
