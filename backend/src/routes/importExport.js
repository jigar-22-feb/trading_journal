const fs = require("fs");
const path = require("path");
const router = require("express").Router();
const { parse } = require("csv-parse/sync");
const { Parser } = require("json2csv");
const xlsx = require("xlsx");
const {
  buildTradeData,
  toNumberOrNull,
} = require("../utils/tradeHelpers");
const Trade = require("../models/Trade");
const { getTagNamesByTradeId, syncTagsForTrade } = require("../utils/tagHelpers");

const parseTags = (value) => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  return String(value)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
};

const normalizeRow = (row) => ({
  start_datetime: row.start_datetime ?? row.startDate ?? row.start,
  end_datetime: row.end_datetime ?? row.endDate ?? row.end,
  trade_type: row.trade_type ?? row.tradeType,
  asset: row.asset,
  direction: row.direction,
  timeframe: row.timeframe,
  session: row.session,
  entry_candle_type: row.entry_candle_type ?? row.entryCandle,
  strategy_id: row.strategy_id,
  entry_price: row.entry_price ?? row.entryPrice,
  exit_price: row.exit_price ?? row.exitPrice,
  risk_percentage: row.risk_percentage ?? row.riskPercent,
  expected_risk_reward: row.expected_risk_reward ?? row.expectedRR,
  actual_risk_reward: row.actual_risk_reward ?? row.actualRR,
  trend_multi_timeframe: row.trend_multi_timeframe,
  take_profit: row.take_profit ?? row.takeProfit,
  stop_loss: row.stop_loss ?? row.stopLoss,
  amount_traded: row.amount_traded ?? row.amount,
  lot_size: row.lot_size ?? row.lotSize,
  leverage: row.leverage,
  trade_fees: row.trade_fees ?? row.fees,
  pnl: row.pnl,
  sl_moved_to_breakeven: row.sl_moved_to_breakeven,
  account_id: row.account_id,
  balance_before_trade: row.balance_before_trade,
  balance_after_trade: row.balance_after_trade,
  increased_lot_size: row.increased_lot_size,
  entry_reason: row.entry_reason,
  exit_reason: row.exit_reason,
  notes: row.notes,
  custom_fields: row.custom_fields,
  tags: parseTags(row.tags),
});

const exportTrade = (trade) => ({
  trade_id: trade.trade_id,
  start_datetime: trade.start_datetime,
  end_datetime: trade.end_datetime,
  trade_type: trade.trade_type,
  asset: trade.asset,
  direction: trade.direction,
  timeframe: trade.timeframe,
  session: trade.session,
  entry_candle_type: trade.entry_candle_type,
  strategy_id: trade.strategy_id?.toString() ?? null,
  entry_price: trade.entry_price,
  exit_price: trade.exit_price,
  risk_percentage: trade.risk_percentage,
  expected_risk_reward: trade.expected_risk_reward,
  actual_risk_reward: trade.actual_risk_reward,
  trend_multi_timeframe: trade.trend_multi_timeframe,
  take_profit: trade.take_profit,
  stop_loss: trade.stop_loss,
  amount_traded: trade.amount_traded,
  lot_size: trade.lot_size,
  leverage: trade.leverage,
  trade_fees: trade.trade_fees,
  pnl: trade.pnl,
  sl_moved_to_breakeven: trade.sl_moved_to_breakeven,
  account_id: trade.account_id?.toString() ?? null,
  balance_before_trade: trade.balance_before_trade,
  balance_after_trade: trade.balance_after_trade,
  increased_lot_size: trade.increased_lot_size,
  entry_reason: trade.entry_reason,
  exit_reason: trade.exit_reason,
  notes: trade.notes,
  tags: (trade.tags || []).join(", "),
  custom_fields: trade.custom_fields,
});

module.exports = (upload) => {
  router.get("/export/trades", async (req, res) => {
    const format = (req.query.format || "json").toLowerCase();
    const trades = await Trade.find().sort({ start_datetime: -1 });
    const tradeIds = trades.map((t) => t.trade_id);
    const tagsByTradeId = await getTagNamesByTradeId(tradeIds);
    const payload = trades.map((t) =>
      exportTrade({ ...t.toObject(), tags: tagsByTradeId.get(t.trade_id) || [] })
    );

    if (format === "csv") {
      const parser = new Parser();
      const csv = parser.parse(payload);
      res.header("Content-Type", "text/csv");
      res.attachment("trades.csv");
      return res.send(csv);
    }

    if (format === "xlsx") {
      const worksheet = xlsx.utils.json_to_sheet(payload);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, "Trades");
      const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
      res.header(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.attachment("trades.xlsx");
      return res.send(buffer);
    }

    res.json(payload);
  });

  router.post("/import/trades", upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Missing import file" });
    }

    const filePath = req.file.path;
    const extension = path.extname(req.file.originalname).toLowerCase();
    let rows = [];

    try {
      if (extension === ".json") {
        const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        rows = Array.isArray(raw) ? raw : raw.trades || [];
      } else if (extension === ".csv") {
        const raw = fs.readFileSync(filePath, "utf-8");
        rows = parse(raw, { columns: true, skip_empty_lines: true });
      } else if (extension === ".xlsx") {
        const workbook = xlsx.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = xlsx.utils.sheet_to_json(sheet);
      } else {
        return res.status(400).json({ error: "Unsupported file format" });
      }

      const results = [];
      const errors = [];

      for (const row of rows) {
        const normalized = normalizeRow(row);
        if (
          !normalized.start_datetime ||
          !normalized.trade_type ||
          !normalized.asset ||
          !normalized.direction ||
          !normalized.timeframe ||
          !normalized.session ||
          normalized.entry_price === undefined
        ) {
          errors.push({ row, error: "Missing required fields" });
          continue;
        }

        const data = buildTradeData(normalized);
        const tradeId = normalized.trade_id || `trd-${Date.now()}`;
        const trade = await Trade.create({
          ...data,
          trade_id: tradeId,
          strategy_id: normalized.strategy_id || undefined,
          account_id: normalized.account_id || undefined,
        });

        await syncTagsForTrade(trade.trade_id, parseTags(normalized.tags));
        results.push(trade.trade_id);
      }

      res.json({
        imported: results.length,
        errors,
      });
    } finally {
      fs.unlink(filePath, () => {});
    }
  });

  router.get("/export/analytics", async (_, res) => {
    const trades = await Trade.find();
    const totalPnL = trades.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);
    const averagePnL =
      trades.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0) /
      (trades.length || 1);
    res.json({
      totalPnL,
      averagePnL: toNumberOrNull(averagePnL),
      trades: trades.length,
    });
  });

  return router;
};
