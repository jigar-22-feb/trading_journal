import { api } from "./client";

export type FilterOptions = {
  assets: string[];
  sessions: string[];
  strategies: { strategy_id: string; strategy_name: string }[];
  accounts: { account_id: string; account_name: string }[];
  tags: string[];
};

export function getFilters(): Promise<FilterOptions> {
  return api<FilterOptions>("/analytics/filters");
}
