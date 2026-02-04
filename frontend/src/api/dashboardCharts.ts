import { api } from "./client";

export type ChartType =
  | "line"
  | "bar"
  | "pie"
  | "area"
  | "step_line"
  | "spline"
  | "sparkline"
  | "simple_bar"
  | "grouped_bar"
  | "stacked_bar"
  | "donut"
  | "treemap"
  | "histogram"
  | "box_plot"
  | "scatter_plot"
  | "heatmap"
  | "calendar_heatmap"
  | "waterfall"
  | "spider";

export interface DashboardChart {
  _id: string;
  name: string;
  chart_type: ChartType;
  features: string[];
  visible: boolean;
  order: number;
  created_at?: string;
  updated_at?: string;
}

export async function getDashboardCharts(): Promise<DashboardChart[]> {
  return api<DashboardChart[]>("/dashboard-charts");
}

export async function createDashboardChart(body: {
  name: string;
  chart_type: ChartType;
  features: string[];
  visible?: boolean;
  order?: number;
}): Promise<DashboardChart> {
  return api<DashboardChart>("/dashboard-charts", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateDashboardChart(
  id: string,
  body: Partial<{
    name: string;
    chart_type: ChartType;
    features: string[];
    visible: boolean;
    order: number;
  }>
): Promise<DashboardChart> {
  return api<DashboardChart>(`/dashboard-charts/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteDashboardChart(id: string): Promise<void> {
  return api<void>(`/dashboard-charts/${id}`, { method: "DELETE" });
}
