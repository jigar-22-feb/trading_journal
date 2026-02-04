const router = require("express").Router();
const Account = require("../models/Account");
const Trade = require("../models/Trade");

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports = () => {
  router.get("/", async (_, res) => {
    const accounts = await Account.find().sort({ created_at: -1 });
    const withTrades = await Promise.all(
      accounts.map(async (account) => {
        const trades = await Trade.find({ account_id: account._id });
        return { ...account.toObject(), trades };
      })
    );
    res.json(withTrades);
  });

  router.get("/:id", async (req, res) => {
    const account = await Account.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }
    const trades = await Trade.find({ account_id: account._id });
    res.json({ ...account.toObject(), trades });
  });

  router.post("/", async (req, res) => {
    const name = (req.body.account_name || "").trim();
    if (!name) {
      return res.status(400).json({ error: "Account name is required." });
    }
    const existing = await Account.findOne({
      account_name: new RegExp(`^${escapeRegex(name)}$`, "i"),
    });
    if (existing) {
      return res.status(409).json({
        error: "An account with this name already exists. Please choose a different name.",
      });
    }
    const initialBalance =
      typeof req.body.initial_balance === "number" ? req.body.initial_balance : null;
    const account = await Account.create({
      account_name: req.body.account_name,
      account_balance: req.body.account_balance ?? initialBalance,
      initial_balance: initialBalance,
      account_type: req.body.account_type,
      custom_fields: req.body.custom_fields ?? null,
    });
    res.status(201).json(account);
  });

  router.put("/:id", async (req, res) => {
    const name = (req.body.account_name || "").trim();
    if (name) {
      const existing = await Account.findOne({
        account_name: new RegExp(`^${escapeRegex(name)}$`, "i"),
        _id: { $ne: req.params.id },
      });
      if (existing) {
        return res.status(409).json({
          error: "An account with this name already exists. Please choose a different name.",
        });
      }
    }
    const initialBalance =
      typeof req.body.initial_balance === "number" ? req.body.initial_balance : null;
    const account = await Account.findByIdAndUpdate(
      req.params.id,
      {
        account_name: req.body.account_name,
        account_balance: req.body.account_balance ?? initialBalance,
        initial_balance: initialBalance,
        account_type: req.body.account_type,
        custom_fields: req.body.custom_fields ?? null,
      },
      { new: true }
    );
    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }
    res.json(account);
  });

  router.delete("/:id", async (req, res) => {
    await Account.findByIdAndDelete(req.params.id);
    res.json({ status: "deleted" });
  });

  return router;
};
