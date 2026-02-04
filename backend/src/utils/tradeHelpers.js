const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const toBoolean = (value) => {
  if (value === undefined || value === null || value === "") {
    return false;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  return ["true", "yes", "1"].includes(String(value).toLowerCase());
};

const toDateOrNull = (value) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const buildTradeData = (payload) => ({
  start_datetime: new Date(payload.start_datetime),
  end_datetime: toDateOrNull(payload.end_datetime),
  trade_type: payload.trade_type,
  asset: payload.asset,
  direction: payload.direction,
  timeframe: payload.timeframe,
  session: payload.session,
  entry_candle_type: payload.entry_candle_type ?? null,
  strategy_name: payload.strategy_name ?? null,
  entry_price: Number(payload.entry_price),
  exit_price: toNumberOrNull(payload.exit_price),
  risk_percentage: toNumberOrNull(payload.risk_percentage),
  expected_risk_reward: toNumberOrNull(payload.expected_risk_reward),
  actual_risk_reward: toNumberOrNull(payload.actual_risk_reward),
  trend_multi_timeframe: payload.trend_multi_timeframe ?? null,
  take_profit: toNumberOrNull(payload.take_profit),
  stop_loss: toNumberOrNull(payload.stop_loss),
  amount_traded: toNumberOrNull(payload.amount_traded),
  lot_size: toNumberOrNull(payload.lot_size),
  leverage: toNumberOrNull(payload.leverage),
  trade_fees: toNumberOrNull(payload.trade_fees),
  pnl: toNumberOrNull(payload.pnl),
  sl_moved_to_breakeven: toBoolean(payload.sl_moved_to_breakeven),
  account_name: payload.account_name ?? null,
  balance_before_trade: toNumberOrNull(payload.balance_before_trade),
  balance_after_trade: toNumberOrNull(payload.balance_after_trade),
  increased_lot_size: toBoolean(payload.increased_lot_size),
  entry_reason: payload.entry_reason ?? null,
  exit_reason: payload.exit_reason ?? null,
  notes: payload.notes ?? null,
  custom_fields: payload.custom_fields ?? null,
});

const buildTagCreates = (tags = []) =>
  tags.map((tag) => ({
    tag: {
      connectOrCreate: {
        where: { tag_name: tag },
        create: { tag_name: tag },
      },
    },
  }));

module.exports = {
  buildTradeData,
  buildTagCreates,
  toDateOrNull,
  toNumberOrNull,
  toBoolean,
};
