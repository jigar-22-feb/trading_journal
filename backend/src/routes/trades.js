const path = require("path");
const router = require("express").Router();
const mongoose = require("mongoose");
const { buildTradeData } = require("../utils/tradeHelpers");
const Trade = require("../models/Trade");
const Strategy = require("../models/Strategy");
const Account = require("../models/Account");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Parse numeric part from trade_id (e.g. trd-1, TRD-42) -> 1, 42. Returns 0 if no match. */
const parseTradeIdNumber = (tradeId) => {
  if (!tradeId || typeof tradeId !== "string") return 0;
  const match = tradeId.match(/trd-(\d+)/i);
  return match ? Math.max(0, parseInt(match[1], 10)) : 0;
};

/** Get next trade number: max(existing numbers) + 1, or 1 if no trades. */
const getNextTradeNumber = async () => {
  const trades = await Trade.find({}).select("trade_id").lean();
  const max = trades.reduce((m, t) => Math.max(m, parseTradeIdNumber(t.trade_id)), 0);
  return max + 1;
};

const listTrades = async (query) => {
  const {
    search,
    asset,
    session,
    strategy_id,
    account_id,
    direction,
    tag,
    date_from,
    date_to,
  } = query;

  const where = {};

  if (asset) where.asset = asset;
  if (session) where.session = session;
  if (strategy_id) where.strategy_id = strategy_id;
  if (account_id) where.account_id = account_id;
  if (direction) where.direction = direction;
  if (tag) where.tags = { $in: [tag] };
  if (date_from || date_to) {
    where.start_datetime = {};
    if (date_from) where.start_datetime.$gte = new Date(date_from);
    if (date_to) where.start_datetime.$lte = new Date(date_to);
  }
  if (search) {
    const regex = new RegExp(search, "i");
    where.$or = [{ trade_id: regex }, { asset: regex }];
  }

  const trades = await Trade.find(where)
    .sort({ start_datetime: -1 })
    .populate("strategy_id", "strategy_name")
    .populate("account_id", "account_name");

  return trades.map((trade) => ({
    ...trade.toObject(),
    strategy: trade.strategy_id
      ? { strategy_id: trade.strategy_id._id, strategy_name: trade.strategy_id.strategy_name }
      : null,
    account: trade.account_id
      ? { account_id: trade.account_id._id, account_name: trade.account_id.account_name }
      : null,
  }));
};

module.exports = (upload) => {
  router.get("/", async (req, res) => {
    const trades = await listTrades(req.query);
    res.json(trades);
  });

  router.get("/next-id", async (req, res) => {
    const next = await getNextTradeNumber();
    res.json({ next_id: `trd-${next}` });
  });

  router.get("/:id", async (req, res) => {
    const trade = await Trade.findOne({ trade_id: req.params.id })
      .populate("strategy_id", "strategy_name")
      .populate("account_id", "account_name");
    if (!trade) {
      return res.status(404).json({ error: "Trade not found" });
    }
    res.json({
      ...trade.toObject(),
      strategy: trade.strategy_id
        ? { strategy_id: trade.strategy_id._id, strategy_name: trade.strategy_id.strategy_name }
        : null,
      account: trade.account_id
        ? { account_id: trade.account_id._id, account_name: trade.account_id.account_name }
        : null,
    });
  });

  router.post("/", async (req, res) => {
    const payload = req.body;
    const tags = Array.isArray(payload.tags) ? payload.tags : [];
    const data = buildTradeData(payload);
    const strategyName =
      typeof payload.strategy_name === "string" ? payload.strategy_name.trim() : "";
    const accountName =
      typeof payload.account_name === "string" ? payload.account_name.trim() : "";
    let strategyId = payload.strategy_id
      ? new mongoose.Types.ObjectId(payload.strategy_id)
      : null;
    let accountId = payload.account_id
      ? new mongoose.Types.ObjectId(payload.account_id)
      : null;
    if (!strategyId && strategyName) {
      const existingStrategy = await Strategy.findOne({
        strategy_name: new RegExp(`^${escapeRegex(strategyName)}$`, "i"),
      });
      if (existingStrategy) strategyId = existingStrategy._id;
    }
    if (!accountId && accountName) {
      const existingAccount = await Account.findOne({
        account_name: new RegExp(`^${escapeRegex(accountName)}$`, "i"),
      });
      if (existingAccount) accountId = existingAccount._id;
    }

    const nextNum = await getNextTradeNumber();
    const tradeId = `trd-${nextNum}`;
    const trade = await Trade.create({
      ...data,
      trade_id: tradeId,
      tags,
      strategy_id: strategyId ?? undefined,
      account_id: accountId ?? undefined,
      trend_multi_timeframe: payload.trend_multi_timeframe ?? null,
    });

    res.status(201).json(trade);
  });

  router.put("/:id", async (req, res) => {
    const payload = req.body;
    const tags = Array.isArray(payload.tags) ? payload.tags : undefined;
    const data = buildTradeData(payload);
    const strategyName =
      typeof payload.strategy_name === "string" ? payload.strategy_name.trim() : "";
    const accountName =
      typeof payload.account_name === "string" ? payload.account_name.trim() : "";
    let strategyId = payload.strategy_id
      ? new mongoose.Types.ObjectId(payload.strategy_id)
      : null;
    let accountId = payload.account_id
      ? new mongoose.Types.ObjectId(payload.account_id)
      : null;
    if (!strategyId && strategyName) {
      const existingStrategy = await Strategy.findOne({
        strategy_name: new RegExp(`^${escapeRegex(strategyName)}$`, "i"),
      });
      if (existingStrategy) strategyId = existingStrategy._id;
    }
    if (!accountId && accountName) {
      const existingAccount = await Account.findOne({
        account_name: new RegExp(`^${escapeRegex(accountName)}$`, "i"),
      });
      if (existingAccount) accountId = existingAccount._id;
    }

    const updated = await Trade.findOneAndUpdate(
      { trade_id: req.params.id },
      {
        ...data,
        tags: tags ?? undefined,
        strategy_id: strategyId ?? undefined,
        account_id: accountId ?? undefined,
        trend_multi_timeframe: payload.trend_multi_timeframe ?? null,
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Trade not found" });
    }
    res.json(updated);
  });

  router.delete("/all", async (req, res) => {
    const result = await Trade.deleteMany({});
    res.json({ status: "deleted", deletedCount: result.deletedCount });
  });

  router.delete("/:id", async (req, res) => {
    await Trade.deleteOne({ trade_id: req.params.id });
    res.json({ status: "deleted" });
  });

  router.post("/:id/images", upload.array("images", 6), async (req, res) => {
    const files = req.files || [];
    const trade = await Trade.findOne({ trade_id: req.params.id });
    if (!trade) {
      return res.status(404).json({ error: "Trade not found" });
    }
    const images = files.map((file) => ({
      image_path: `/uploads/trades/${path.basename(file.path)}`,
      uploaded_at: new Date(),
    }));
    trade.images.push(...images);
    await trade.save();
    res.status(201).json({ count: images.length });
  });

  return router;
};
