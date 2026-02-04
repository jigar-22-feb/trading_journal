const mongoose = require("mongoose");

const TagSchema = new mongoose.Schema(
  {
    tag_name: { type: String, required: true, trim: true, unique: true },
    trade_ids: { type: [String], default: [] },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

TagSchema.index({ tag_name: 1 });
TagSchema.index({ trade_ids: 1 });

module.exports = mongoose.model("Tag", TagSchema);
