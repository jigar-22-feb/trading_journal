const mongoose = require("mongoose");

const StrategyImageSchema = new mongoose.Schema(
  {
    image_path: { type: String, required: true },
    uploaded_at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const StrategySchema = new mongoose.Schema(
  {
    strategy_name: { type: String, required: true },
    strategy_notes: { type: String },
    custom_fields: { type: mongoose.Schema.Types.Mixed },
    images: [StrategyImageSchema],
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

module.exports = mongoose.model("Strategy", StrategySchema);
