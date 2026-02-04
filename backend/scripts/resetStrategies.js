const mongoose = require("mongoose");
const Strategy = require("../src/models/Strategy");
const Trade = require("../src/models/Trade");

const STRATEGY_NAMES = ["9-15 ema", "8-33 ema", "MMC"];

const connect = async () => {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/trading_journal";
  await mongoose.connect(uri);
};

const run = async () => {
  await connect();

  await Strategy.deleteMany({ strategy_name: { $nin: STRATEGY_NAMES } });
  const strategies = [];
  for (const name of STRATEGY_NAMES) {
    const strategy = await Strategy.findOneAndUpdate(
      { strategy_name: name },
      { strategy_name: name },
      { upsert: true, new: true }
    );
    strategies.push(strategy);
  }

  const trades = await Trade.find().sort({ created_at: 1 });
  if (trades.length) {
    const bulk = trades.map((trade, index) => {
      const strategy = strategies[index % strategies.length];
      return {
        updateOne: {
          filter: { _id: trade._id },
          update: {
            $set: {
              strategy_id: strategy._id,
              strategy_name: strategy.strategy_name,
            },
          },
        },
      };
    });
    await Trade.bulkWrite(bulk);
  }

  await mongoose.disconnect();
  console.log("Strategies reset to:", STRATEGY_NAMES.join(", "));
};

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
