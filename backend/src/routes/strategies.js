const path = require("path");
const router = require("express").Router();
const Strategy = require("../models/Strategy");
const Trade = require("../models/Trade");

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports = (upload) => {
  router.get("/", async (_, res) => {
    const strategies = await Strategy.find().sort({ created_at: -1 });
    const withTrades = await Promise.all(
      strategies.map(async (strategy) => {
        const trades = await Trade.find({ strategy_id: strategy._id });
        return { ...strategy.toObject(), trades };
      })
    );
    res.json(withTrades);
  });

  router.get("/:id", async (req, res) => {
    const strategy = await Strategy.findById(req.params.id);
    if (!strategy) {
      return res.status(404).json({ error: "Strategy not found" });
    }
    const trades = await Trade.find({ strategy_id: strategy._id });
    res.json({ ...strategy.toObject(), trades });
  });

  router.post("/", async (req, res) => {
    const name = (req.body.strategy_name || "").trim();
    if (!name) {
      return res.status(400).json({ error: "Strategy name is required." });
    }
    const existing = await Strategy.findOne({
      strategy_name: new RegExp(`^${escapeRegex(name)}$`, "i"),
    });
    if (existing) {
      return res.status(409).json({
        error: "A strategy with this name already exists. Please choose a different name.",
      });
    }
    const strategy = await Strategy.create({
      strategy_name: req.body.strategy_name,
      strategy_notes: req.body.strategy_notes ?? null,
      custom_fields: req.body.custom_fields ?? null,
    });
    res.status(201).json(strategy);
  });

  router.put("/:id", async (req, res) => {
    const name = (req.body.strategy_name || "").trim();
    if (name) {
      const existing = await Strategy.findOne({
        strategy_name: new RegExp(`^${escapeRegex(name)}$`, "i"),
        _id: { $ne: req.params.id },
      });
      if (existing) {
        return res.status(409).json({
          error: "A strategy with this name already exists. Please choose a different name.",
        });
      }
    }
    const strategy = await Strategy.findByIdAndUpdate(
      req.params.id,
      {
        strategy_name: req.body.strategy_name,
        strategy_notes: req.body.strategy_notes ?? null,
        custom_fields: req.body.custom_fields ?? null,
      },
      { new: true }
    );
    if (!strategy) {
      return res.status(404).json({ error: "Strategy not found" });
    }
    res.json(strategy);
  });

  router.delete("/:id", async (req, res) => {
    await Strategy.findByIdAndDelete(req.params.id);
    res.json({ status: "deleted" });
  });

  router.post("/:id/images", upload.array("images", 6), async (req, res) => {
    const files = req.files || [];
    const strategy = await Strategy.findById(req.params.id);
    if (!strategy) {
      return res.status(404).json({ error: "Strategy not found" });
    }
    const images = files.map((file) => ({
      image_path: `/uploads/strategies/${path.basename(file.path)}`,
      uploaded_at: new Date(),
    }));
    strategy.images.push(...images);
    await strategy.save();
    res.status(201).json({ count: images.length });
  });

  return router;
};
