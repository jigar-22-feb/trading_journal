const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/trading_journal";

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

const ensureUploadDir = (folder) => {
  const fullPath = path.join(__dirname, "..", "uploads", folder);
  fs.mkdirSync(fullPath, { recursive: true });
  return fullPath;
};

const createStorage = (folder) =>
  multer.diskStorage({
    destination: (_, __, callback) => {
      callback(null, ensureUploadDir(folder));
    },
    filename: (_, file, callback) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const safeName = file.originalname.replace(/\s+/g, "-");
      callback(null, `${uniqueSuffix}-${safeName}`);
    },
  });

const tradeUpload = multer({ storage: createStorage("trades") });
const strategyUpload = multer({ storage: createStorage("strategies") });
const importUpload = multer({ storage: createStorage("imports") });

app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

app.use("/trades", require("./routes/trades")(tradeUpload));
app.use(
  "/strategies",
  require("./routes/strategies")(strategyUpload)
);
app.use("/accounts", require("./routes/accounts")());
app.use("/analytics", require("./routes/analytics")());
app.use("/", require("./routes/importExport")(importUpload));

app.use((err, _, res, __) => {
  console.error("API Error:", err);
  res.status(500).json({ error: "Something went wrong." });
});

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`Trading Journal API running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  });
