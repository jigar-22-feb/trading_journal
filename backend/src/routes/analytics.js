const router = require("express").Router();
const Trade = require("../models/Trade");
const Strategy = require("../models/Strategy");
const Account = require("../models/Account");
const { getAllTagNames } = require("../utils/tagHelpers");

const buildPnLSeries = (trades) => {
  let equity = 10000;
  return trades
    .sort((a, b) => a.start_datetime.getTime() - b.start_datetime.getTime())
    .map((trade) => {
      equity += trade.pnl ?? 0;
      return {
        date: trade.start_datetime,
        pnl: trade.pnl ?? 0,
        equity,
      };
    });
};

module.exports = () => {
  router.get("/overview", async (_, res) => {
    const trades = await Trade.find();
    const totalPnL = trades.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);
    const wins = trades.filter((trade) => (trade.pnl ?? 0) > 0).length;
    const winRate = trades.length ? (wins / trades.length) * 100 : 0;
    const avgRR =
      trades.reduce((sum, trade) => sum + (trade.actual_risk_reward ?? 0), 0) /
      (trades.length || 1);

    res.json({
      totalPnL,
      tradeCount: trades.length,
      winRate,
      avgRR,
      equityCurve: buildPnLSeries(trades),
    });
  });

  router.get("/sessions", async (_, res) => {
    const sessions = await Trade.find({}, { session: 1, pnl: 1 });
    const stats = sessions.reduce((acc, trade) => {
      const key = trade.session;
      if (!acc[key]) {
        acc[key] = { trades: 0, pnl: 0 };
      }
      acc[key].trades += 1;
      acc[key].pnl += trade.pnl ?? 0;
      return acc;
    }, {});

    res.json(stats);
  });

  router.get("/filters", async (_, res) => {
    const [
      assets,
      sessions,
      strategies,
      accounts,
      tags,
      tradeAccountNames,
      tradeStrategyNames,
    ] = await Promise.all([
      Trade.distinct("asset"),
      Trade.distinct("session"),
      Strategy.find({}, { _id: 1, strategy_name: 1 }),
      Account.find({}, { _id: 1, account_name: 1 }),
      getAllTagNames(),
      Trade.distinct("account_name"),
      Trade.distinct("strategy_name"),
    ]);

    const accountItems = accounts.map((item) => ({
      account_id: item._id,
      account_name: item.account_name,
    }));
    const accountNameSet = new Set(
      accountItems.map((item) => item.account_name?.toLowerCase()).filter(Boolean)
    );
    (tradeAccountNames || [])
      .map((name) => (typeof name === "string" ? name.trim() : ""))
      .filter(Boolean)
      .forEach((name) => {
        if (!accountNameSet.has(name.toLowerCase())) {
          accountItems.push({ account_id: name, account_name: name });
          accountNameSet.add(name.toLowerCase());
        }
      });

    const strategyItems = strategies.map((item) => ({
      strategy_id: item._id,
      strategy_name: item.strategy_name,
    }));
    const strategyNameSet = new Set(
      strategyItems.map((item) => item.strategy_name?.toLowerCase()).filter(Boolean)
    );
    (tradeStrategyNames || [])
      .map((name) => (typeof name === "string" ? name.trim() : ""))
      .filter(Boolean)
      .forEach((name) => {
        if (!strategyNameSet.has(name.toLowerCase())) {
          strategyItems.push({ strategy_id: name, strategy_name: name });
          strategyNameSet.add(name.toLowerCase());
        }
      });

    res.json({
      assets,
      sessions,
      strategies: strategyItems,
      accounts: accountItems,
      tags,
    });
  });

  return router;
};
