const router = require("express").Router();
const DashboardChart = require("../models/DashboardChart");

const VALID_CHART_TYPES = [
  "line",
  "bar",
  "pie",
  "area",
  "step_line",
  "spline",
  "sparkline",
  "simple_bar",
  "grouped_bar",
  "stacked_bar",
  "donut",
  "treemap",
  "histogram",
  "box_plot",
  "scatter_plot",
  "heatmap",
  "calendar_heatmap",
  "waterfall",
  "spider",
];

module.exports = () => {
router.get("/", async (_, res) => {
  const charts = await DashboardChart.find().sort({ order: 1, created_at: 1 });
  res.json(charts);
});

router.post("/", async (req, res) => {
  const name = (req.body.name || "").trim();
  if (!name) {
    return res.status(400).json({ error: "Chart name is required." });
  }
  const chart_type = (req.body.chart_type || "").toLowerCase();
  if (!VALID_CHART_TYPES.includes(chart_type)) {
    return res.status(400).json({
      error: `chart_type must be one of: ${VALID_CHART_TYPES.join(", ")}.`,
    });
  }
  const features = Array.isArray(req.body.features)
    ? req.body.features.map((f) => String(f).trim()).filter(Boolean)
    : [];
  const visible = req.body.visible !== false;
  const order = typeof req.body.order === "number" ? req.body.order : 0;
  const chart = await DashboardChart.create({
    name,
    chart_type,
    features,
    visible,
    order,
  });
  res.status(201).json(chart);
});

router.put("/:id", async (req, res) => {
  const updates = {};
  if (req.body.name !== undefined) updates.name = String(req.body.name).trim();
  if (req.body.chart_type !== undefined) {
    const ct = String(req.body.chart_type).toLowerCase();
    if (!VALID_CHART_TYPES.includes(ct)) {
      return res.status(400).json({
        error: `chart_type must be one of: ${VALID_CHART_TYPES.join(", ")}.`,
      });
    }
    updates.chart_type = ct;
  }
  if (req.body.features !== undefined) {
    updates.features = Array.isArray(req.body.features)
      ? req.body.features.map((f) => String(f).trim()).filter(Boolean)
      : [];
  }
  if (req.body.visible !== undefined) updates.visible = Boolean(req.body.visible);
  if (req.body.order !== undefined) updates.order = Number(req.body.order);
  const chart = await DashboardChart.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true }
  );
  if (!chart) {
    return res.status(404).json({ error: "Chart not found." });
  }
  res.json(chart);
});

router.delete("/:id", async (req, res) => {
  const chart = await DashboardChart.findByIdAndDelete(req.params.id);
  if (!chart) {
    return res.status(404).json({ error: "Chart not found." });
  }
  res.json({ status: "deleted" });
});

return router;
};
