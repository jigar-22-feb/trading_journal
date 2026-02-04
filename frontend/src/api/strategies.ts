import { api } from "./client";

export interface Strategy {
  _id: string;
  strategy_name: string;
  strategy_notes?: string | null;
  custom_fields?: Record<string, string> | null;
}

export function createStrategy(body: {
  strategy_name: string;
  strategy_notes?: string | null;
  custom_fields?: Record<string, string> | null;
}): Promise<Strategy> {
  return api<Strategy>("/strategies", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
