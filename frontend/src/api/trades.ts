import { api, apiUpload } from "./client";

/** Trade shape returned by the backend (with relations). */
export interface ApiTrade {
  trade_id: string;
  start_datetime: string;
  end_datetime: string | null;
  created_at?: string;
  trade_type: string;
  asset: string;
  direction: string;
  timeframe: string;
  session: string;
  entry_candle_type: string | null;
  strategy_id: string | null;
  entry_price: number;
  exit_price: number | null;
  risk_percentage: number | null;
  expected_risk_reward: number | null;
  actual_risk_reward: number | null;
  take_profit: number | null;
  stop_loss: number | null;
  amount_traded: number | null;
  lot_size: number | null;
  leverage: number | null;
  trade_fees: number | null;
  pnl: number | null;
  strategy?: { strategy_id: string; strategy_name: string } | null;
  account?: { account_id: string; account_name: string } | null;
  strategy_name?: string | null;
  account_name?: string | null;
  tags?: { tag: { tag_name: string } }[] | string[];
}

/** Normalized trade for the UI (matches App Trade type). */
export interface Trade {
  trade_id: string;
  start_datetime: string;
  end_datetime: string;
  start_datetime_raw: string;
  end_datetime_raw: string;
  created_at: string;
  trade_type: string;
  asset: string;
  direction: "Long" | "Short";
  timeframe: string;
  session: string;
  entry_candle_type: string;
  strategy: string;
  entry_price: number;
  exit_price: number;
  risk_percentage: number;
  expected_risk_reward: number;
  actual_risk_reward: number;
  take_profit: number;
  stop_loss: number;
  amount_traded: number;
  leverage: number;
  trade_fees: number;
  pnl: number;
  tags: string[];
  account_id?: string;
  account_name?: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const y = d.getFullYear();
  return `${day}-${m}-${y}`;
}

export function normalizeTrade(apiTrade: ApiTrade): Trade {
  const strategyName = apiTrade.strategy?.strategy_name ?? apiTrade.strategy_name ?? "";
  const accountName = apiTrade.account?.account_name ?? apiTrade.account_name ?? "";
  return {
    trade_id: apiTrade.trade_id,
    start_datetime: formatDate(apiTrade.start_datetime),
    end_datetime: formatDate(apiTrade.end_datetime ?? null),
    start_datetime_raw: apiTrade.start_datetime,
    end_datetime_raw: apiTrade.end_datetime ?? "",
    created_at: apiTrade.created_at ?? apiTrade.start_datetime ?? "",
    trade_type: apiTrade.trade_type,
    asset: apiTrade.asset,
    direction: apiTrade.direction as "Long" | "Short",
    timeframe: apiTrade.timeframe,
    session: apiTrade.session,
    entry_candle_type: apiTrade.entry_candle_type ?? "",
    strategy: strategyName,
    entry_price: apiTrade.entry_price ?? 0,
    exit_price: apiTrade.exit_price ?? 0,
    risk_percentage: apiTrade.risk_percentage ?? 0,
    expected_risk_reward: apiTrade.expected_risk_reward ?? 0,
    actual_risk_reward: apiTrade.actual_risk_reward ?? 0,
    take_profit: apiTrade.take_profit ?? 0,
    stop_loss: apiTrade.stop_loss ?? 0,
    amount_traded: apiTrade.amount_traded ?? 0,
    leverage: apiTrade.leverage ?? 0,
    trade_fees: apiTrade.trade_fees ?? 0,
    pnl: apiTrade.pnl ?? 0,
    tags: Array.isArray(apiTrade.tags)
      ? (apiTrade.tags as Array<{ tag?: { tag_name?: string } } | string>)
          .map((t) => (typeof t === "string" ? t : t.tag?.tag_name ?? ""))
          .filter(Boolean)
      : [],
    account_id: apiTrade.account?.account_id ?? (accountName || undefined),
    account_name: accountName || undefined,
  };
}

export function getTrades(params?: {
  search?: string;
  asset?: string;
  session?: string;
  strategy_id?: string;
}): Promise<ApiTrade[]> {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.asset && params.asset !== "All") q.set("asset", params.asset);
  if (params?.session && params.session !== "All") q.set("session", params.session);
  if (params?.strategy_id) q.set("strategy_id", params.strategy_id);
  const query = q.toString();
  return api<ApiTrade[]>(`/trades${query ? `?${query}` : ""}`);
}

export function getNextTradeId(): Promise<{ next_id: string }> {
  return api<{ next_id: string }>("/trades/next-id");
}

export function deleteAllTrades(): Promise<{ status: string; deletedCount?: number }> {
  return api<{ status: string; deletedCount?: number }>("/trades/all", {
    method: "DELETE",
  });
}

export function createTrade(body: {
  start_datetime: string;
  end_datetime?: string;
  trade_type: string;
  asset: string;
  direction: string;
  timeframe: string;
  session: string;
  entry_candle_type?: string;
  strategy_name?: string;
  entry_price: number;
  exit_price?: number;
  risk_percentage?: number;
  expected_risk_reward?: number;
  actual_risk_reward?: number;
  trend_multi_timeframe?: Record<string, string> | null;
  take_profit?: number;
  stop_loss?: number;
  amount_traded?: number;
  lot_size?: number;
  leverage?: number;
  trade_fees?: number;
  pnl?: number;
  sl_moved_to_breakeven?: boolean;
  account_name?: string;
  balance_before_trade?: number;
  balance_after_trade?: number;
  increased_lot_size?: boolean;
  entry_reason?: string;
  exit_reason?: string;
  notes?: string;
  custom_fields?: Record<string, string> | null;
  tags?: string[];
}): Promise<ApiTrade> {
  return api<ApiTrade>("/trades", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getTrade(tradeId: string): Promise<TradeDetail> {
  return api<TradeDetail>(`/trades/${tradeId}`);
}

/** Full trade as returned by GET /trades/:id (includes notes, images, etc.) */
export interface TradeDetail extends ApiTrade {
  notes?: string | null;
  entry_reason?: string | null;
  exit_reason?: string | null;
  custom_fields?: Record<string, string> | null;
  images?: { image_path: string; uploaded_at?: string }[];
  tags?: string[];
  sl_moved_to_breakeven?: boolean;
  increased_lot_size?: boolean;
  balance_before_trade?: number;
  balance_after_trade?: number;
}

export function deleteTrade(tradeId: string): Promise<void> {
  return api(`/trades/${tradeId}`, { method: "DELETE" });
}

export function uploadTradeImages(tradeId: string, files: File[]): Promise<{ count: number }> {
  if (files.length === 0) return Promise.resolve({ count: 0 });
  const formData = new FormData();
  files.forEach((f) => formData.append("images", f));
  return apiUpload(`/trades/${tradeId}/images`, formData);
}
