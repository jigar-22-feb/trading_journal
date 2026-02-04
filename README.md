## Trading Journal – Full Stack Project

This repository contains a complete **trading journal web application** with:

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Recharts
- **Backend**: Node.js + Express + Mongoose
- **Database**: MongoDB (local) with visual access via **MongoDB Compass**

The project is designed to run well inside **Cursor**, and all day‑to‑day development (including UI work) happens in the `frontend` React app.

---

### 1. Repository Structure

- **`backend/`**
  - `src/server.js`: Express API server entrypoint.
  - `src/models/Account.js`: Mongoose model for trading accounts.
  - `src/models/Strategy.js`: Mongoose model for strategies.
  - `src/models/Trade.js`: Mongoose model for individual trades.
  - `src/routes/*.js`: REST API routes for trades, accounts, strategies, analytics, imports/exports.
  - `src/seedDummyData.js`: Script that seeds **100 demo trades**, plus a demo account and demo strategy.
- **`frontend/`**
  - `src/App.tsx`: Main React application (dashboard, charts, forms, feature management).
  - `src/api/*.ts`: Typed API clients for talking to the backend.
- **Root**
  - `package.json`: Runs backend and frontend together via `concurrently`.
  - `setup.ps1`: One‑shot setup script for a new machine (described below).

---

### 2. Prerequisites (on any new machine)

Install these manually **once**:

- **Git**
- **Node.js (LTS)** – from `https://nodejs.org`
- **MongoDB Community Server** – local instance (default URI `mongodb://127.0.0.1:27017`)
- **MongoDB Compass** – for visually exploring the database

> On Windows, the `setup.ps1` script will try to install **MongoDB** and **MongoDB Compass** automatically if **Chocolatey** (`choco`) is available.  
> If Chocolatey is not installed, you can download MongoDB + Compass from `https://www.mongodb.com/try/download`.

---

### 3. One‑Command Setup on a Fresh Machine (Windows + PowerShell)

1. **Clone or copy** this project to the new machine.
2. Open **PowerShell** in the project root (folder containing `setup.ps1`).
3. Run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\setup.ps1
```

What `setup.ps1` does:

- Verifies that **Node.js** and **npm** are installed.
- Tries to install **MongoDB** and **MongoDB Compass** using Chocolatey (if available).
- Runs `npm install` in the root.
- Runs `npm run install:all` to install dependencies inside `backend/` and `frontend/`.
- Creates `backend/.env` (if missing) with:
  - `MONGODB_URI=mongodb://127.0.0.1:27017/trading_journal`
  - `PORT=4000`
- Runs `npm run seed:dummies` in `backend/`, which:
  - Ensures a **demo account** and **demo strategy** exist.
  - Inserts up to **100 dummy trades** (idempotent – safe to re‑run).

After the script finishes you have:

- Node deps installed
- MongoDB populated with 100 demo trades
- Backend env configured and ready

---

### 4. Running the App in Development

From the **project root**:

```bash
npm run dev
```

This:

- Starts the **backend** API on `http://localhost:4000`
- Starts the **frontend** dev server on `http://localhost:5173`

Open the frontend in a browser:

- `http://localhost:5173`

You can check the backend health endpoint:

- `http://localhost:4000/health`

---

### 5. Database & Seed Data Details

- Default Mongo URI used by both backend and seed:  
  `mongodb://127.0.0.1:27017/trading_journal`
- Seed script: `backend/src/seedDummyData.js`
  - Creates a **demo account** (`Demo Account`) and **demo strategy** (`Demo Strategy`) if they don’t exist.
  - Inserts trades with IDs `seed-trd-1` ... `seed-trd-100`.
  - Distributes trades over roughly the **last 60 days**, with varied:
    - Assets: `BTCUSDT`, `ETHUSDT`, `XAU/USD`, `USOIL`
    - Trade types: `Scalping`, `Intraday`, `BTST`, `Swing`, `Position`
    - Sessions, timeframes, directions, PnL, risk, and RR values.
  - Script is **idempotent**: if a trade with a given `trade_id` already exists, it is skipped.

To re‑run the seed manually:

```bash
cd backend
npm run seed:dummies
```

---

### 6. MongoDB Compass Connection

1. Open **MongoDB Compass**.
2. Use this connection string:

```text
mongodb://127.0.0.1:27017/trading_journal
```

You will see:

- Database: `trading_journal`
- Collections:
  - `trades`
  - `accounts`
  - `strategies`

The 100 dummy trades created by `seedDummyData.js` will be visible in `trades`.

---

### 7. Frontend Overview (Cursor‑Friendly)

Most day‑to‑day work in Cursor happens in `frontend/src/App.tsx`.  
Key pieces:

- **Dashboard** with:
  - Trades by session chart
  - Risk vs reward chart
  - Equity curve
  - Win/loss & performance metrics
- **Trade / Account / Strategy forms** with:
  - Dynamic dropdowns (assets, trade types)
  - Custom feature management (Add / Delete / Remove per entry)
  - Client‑side persistence for user‑defined dropdown options.

The UI uses:

- Tailwind utility classes + a small set of shared style constants.
- `recharts` for all charts.
- `lucide-react` for icons.

---

### 8. Backend Overview

- **Express server** in `backend/src/server.js`:
  - Serves REST routes under `/trades`, `/accounts`, `/strategies`, `/analytics`.
  - Connects to MongoDB via Mongoose.
  - Handles uploads to `uploads/` (trades & strategies images, imports).
- **Models** in `backend/src/models/*` define the MongoDB schema used across the app.

If you change any of these models, ensure the frontend field handling and forms stay in sync.

---

### 9. Typical Workflow on a New Machine

1. Clone/copy the repo.
2. Run `.\setup.ps1` once (PowerShell).
3. Start dev servers: `npm run dev`.
4. Open `http://localhost:5173` in a browser.
5. Use MongoDB Compass with `mongodb://127.0.0.1:27017/trading_journal` to inspect data.

From there, you can continue developing exactly as on the original machine.

