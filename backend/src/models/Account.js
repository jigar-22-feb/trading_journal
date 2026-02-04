const mongoose = require("mongoose");

const AccountSchema = new mongoose.Schema(
  {
    account_name: { type: String, required: true },
    account_balance: { type: Number },
    initial_balance: { type: Number },
    account_type: { type: String, required: true },
    custom_fields: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

module.exports = mongoose.model("Account", AccountSchema);
