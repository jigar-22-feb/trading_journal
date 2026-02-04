const mongoose = require("mongoose");

const TradeImageSchema = new mongoose.Schema(
  {
    image_path: { type: String, required: true },
    uploaded_at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const TradeSchema = new mongoose.Schema(
  {
    trade_id: { type: String, unique: true, index: true },
    start_datetime: { type: Date, required: true },
    end_datetime: { type: Date },
    trade_type: { type: String, required: true },
    asset: { type: String, required: true },
    direction: { type: String, required: true },
    timeframe: { type: String, required: true },
    session: { type: String, required: true },
    entry_candle_type: { type: String },
    strategy_id: { type: mongoose.Schema.Types.ObjectId, ref: "Strategy" },
    strategy_name: { type: String },
    entry_price: { type: Number, required: true },
    exit_price: { type: Number },
    risk_percentage: { type: Number },
    expected_risk_reward: { type: Number },
    actual_risk_reward: { type: Number },
    trend_multi_timeframe: { type: mongoose.Schema.Types.Mixed },
    take_profit: { type: Number },
    stop_loss: { type: Number },
    amount_traded: { type: Number },
    lot_size: { type: Number },
    leverage: { type: Number },
    trade_fees: { type: Number },
    pnl: { type: Number },
    sl_moved_to_breakeven: { type: Boolean, default: false },
    account_id: { type: mongoose.Schema.Types.ObjectId, ref: "Account" },
    account_name: { type: String },
    balance_before_trade: { type: Number },
    balance_after_trade: { type: Number },
    increased_lot_size: { type: Boolean, default: false },
    entry_reason: { type: String },
    exit_reason: { type: String },
    notes: { type: String },
    custom_fields: { type: mongoose.Schema.Types.Mixed },
    images: [TradeImageSchema],
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

module.exports = mongoose.model("Trade", TradeSchema);
