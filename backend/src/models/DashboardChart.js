const mongoose = require("mongoose");

const DashboardChartSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    chart_type: {
      type: String,
      required: true,
      enum: [
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
      ],
    },
    features: [{ type: String, trim: true }],
    visible: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

module.exports = mongoose.model("DashboardChart", DashboardChartSchema);
