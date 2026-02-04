import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowDownUp,
  BadgeCheck,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Filter,
  Plus,
  Trash2,
  ArrowLeft,
  Minimize2,
  Maximize2,
  User,
  Settings,
  LayoutDashboard,
} from "lucide-react";
import {
  createTrade,
  deleteAllTrades,
  deleteTrade,
  getNextTradeId as fetchNextTradeId,
  getTrades,
  normalizeTrade,
  uploadTradeImages,
  type Trade,
} from "./api/trades";
import { createAccount } from "./api/accounts";
import { createStrategy } from "./api/strategies";
import { getFilters } from "./api/analytics";

  const dateRangeOptions: { value: string; label: string }[] = [
    { value: "Today", label: "Today" },
    { value: "Last 7 days", label: "Last 7 days" },
    { value: "Last 15 days", label: "Last 15 days" },
    { value: "Last 30 days", label: "Last 30 days" },
    { value: "This month", label: "This month" },
    { value: "This year", label: "This year" },
    { value: "All time", label: "All time" },
    { value: "Custom", label: "Custom" },
  ];

const pieColors = ["#6366F1", "#22C55E", "#F59E0B", "#EF4444"];
// Canonical order of feature keys (must match backend seed so DB order = form order)
const TRADE_FEATURE_ORDER = [
  "Setup",
  "Market_condition",
  "Conviction",
  "Risk_notes",
  "Trade_grade",
];
const ACCOUNT_FEATURE_ORDER = ["Broker", "Currency", "Platform"];
const STRATEGY_FEATURE_ORDER = ["Timeframe_focus", "Indicators", "Style"];
const inputBase =
  "rounded-3xl border border-surface-700/60 bg-surface-900/40 px-3 py-2 text-sm text-white placeholder:text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur focus:border-accent-400/70 focus:outline-none focus:ring-2 focus:ring-accent-400/30 w-full max-w-[280px]";
const inputWide =
  "rounded-3xl border border-surface-700/60 bg-surface-900/40 px-3 py-2 text-sm text-white placeholder:text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur focus:border-accent-400/70 focus:outline-none focus:ring-2 focus:ring-accent-400/30 w-full max-w-[360px]";
const textAreaBase =
  "rounded-3xl border border-surface-700/60 bg-surface-900/40 px-3 py-2 text-sm text-white placeholder:text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur focus:border-accent-400/70 focus:outline-none focus:ring-2 focus:ring-accent-400/30 w-full max-w-[560px]";
const btnPrimary =
  "btn-primary rounded-2xl px-5 py-2 text-sm font-semibold text-white ring-1 ring-white/10 transition duration-200 hover:brightness-105 active:translate-y-[1px] active:brightness-95 focus:outline-none focus:ring-2 focus:ring-accent-400/40 disabled:cursor-not-allowed disabled:opacity-60";
const btnSecondary =
  "rounded-2xl border border-surface-700/70 bg-surface-900/60 px-4 py-2 text-sm text-white/90 shadow-[0_10px_20px_rgba(0,0,0,0.25)] ring-1 ring-white/5 transition duration-200 hover:border-accent-400/60 hover:bg-surface-800/70 hover:text-white active:translate-y-[1px] focus:outline-none focus:ring-2 focus:ring-accent-400/30 disabled:cursor-not-allowed disabled:opacity-60";
const btnGhost =
  "rounded-2xl border border-surface-700/60 bg-transparent px-4 py-2 text-sm text-white/80 ring-1 ring-white/5 transition duration-200 hover:border-accent-400/60 hover:bg-surface-800/40 hover:text-white active:translate-y-[1px] focus:outline-none focus:ring-2 focus:ring-accent-400/30 disabled:cursor-not-allowed disabled:opacity-60";

type SelectOption = { value: string; label: string; disabled?: boolean };

type DropdownProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

function Dropdown({
  value,
  onChange,
  options,
  placeholder = "Select…",
  disabled,
  className = "",
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className={`relative ${disabled ? "opacity-60" : ""}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={`${inputBase} flex items-center justify-between text-left ${className}`}
      >
        <span className={selected ? "" : "text-white/60"}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>
      {open && !disabled && (
        <div className="absolute z-30 mt-1 w-full rounded-2xl border border-surface-700 bg-white py-1 text-sm text-slate-900 shadow-soft">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={opt.disabled}
              className={`flex w-full items-center px-3 py-1.5 text-left hover:bg-slate-100 ${
                opt.disabled ? "cursor-not-allowed text-slate-400" : ""
              }`}
              onClick={() => {
                if (opt.disabled) return;
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function App() {
  const [assetFilter, setAssetFilter] = useState("All");
  const [sessionFilter, setSessionFilter] = useState("All");
  const [strategyFilter, setStrategyFilter] = useState("All");
  const defaultAssetOptions = ["BTCUSDT", "ETHUSDT", "XAU/USD", "USOIL"];
  const defaultTradeTypeOptions = ["Scalping", "Intraday", "BTST", "Swing", "Position"];
  const defaultTradeFeatureKeys = TRADE_FEATURE_ORDER;
  const defaultAccountFeatureKeys = ACCOUNT_FEATURE_ORDER;
  const defaultStrategyFeatureKeys = STRATEGY_FEATURE_ORDER;
  const [assetOptions, setAssetOptions] = useState<string[]>(() => {
    if (typeof window === "undefined") return defaultAssetOptions;
    try {
      const stored = window.localStorage.getItem("tj-asset-options");
      if (!stored) return defaultAssetOptions;
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) && parsed.every((v) => typeof v === "string")
        ? (parsed as string[])
        : defaultAssetOptions;
    } catch {
      return defaultAssetOptions;
    }
  });
  const [assetDropdownOpen, setAssetDropdownOpen] = useState(false);
  const [newAssetName, setNewAssetName] = useState("");
  const assetDropdownRef = useRef<HTMLDivElement | null>(null);
  const [tradeTypeOptions, setTradeTypeOptions] = useState<string[]>(() => {
    if (typeof window === "undefined") return defaultTradeTypeOptions;
    try {
      const stored = window.localStorage.getItem("tj-trade-type-options");
      if (!stored) return defaultTradeTypeOptions;
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) && parsed.every((v) => typeof v === "string")
        ? (parsed as string[])
        : defaultTradeTypeOptions;
    } catch {
      return defaultTradeTypeOptions;
    }
  });
  const [tradeTypeDropdownOpen, setTradeTypeDropdownOpen] = useState(false);
  const [newTradeTypeName, setNewTradeTypeName] = useState("");
  const tradeTypeDropdownRef = useRef<HTMLDivElement | null>(null);
  const [accountFeatureOpen, setAccountFeatureOpen] = useState(false);
  const [strategyFeatureOpen, setStrategyFeatureOpen] = useState(false);
  const [tradeFeatureOpen, setTradeFeatureOpen] = useState(false);
  const accountFeatureRef = useRef<HTMLDivElement | null>(null);
  const strategyFeatureRef = useRef<HTMLDivElement | null>(null);
  const tradeFeatureRef = useRef<HTMLDivElement | null>(null);
  const [tradeFeatureKeys, setTradeFeatureKeys] = useState<string[]>(() => {
    if (typeof window === "undefined") return defaultTradeFeatureKeys;
    try {
      const stored = window.localStorage.getItem("tj-trade-feature-keys");
      if (!stored) return defaultTradeFeatureKeys;
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) && parsed.every((v: unknown) => typeof v === "string")
        ? (parsed as string[])
        : defaultTradeFeatureKeys;
    } catch {
      return defaultTradeFeatureKeys;
    }
  });
  const [accountFeatureKeys, setAccountFeatureKeys] = useState<string[]>(() => {
    if (typeof window === "undefined") return defaultAccountFeatureKeys;
    try {
      const stored = window.localStorage.getItem("tj-account-feature-keys");
      if (!stored) return defaultAccountFeatureKeys;
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) && parsed.every((v: unknown) => typeof v === "string")
        ? (parsed as string[])
        : defaultAccountFeatureKeys;
    } catch {
      return defaultAccountFeatureKeys;
    }
  });
  const [strategyFeatureKeys, setStrategyFeatureKeys] = useState<string[]>(() => {
    if (typeof window === "undefined") return defaultStrategyFeatureKeys;
    try {
      const stored = window.localStorage.getItem("tj-strategy-feature-keys");
      if (!stored) return defaultStrategyFeatureKeys;
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) && parsed.every((v: unknown) => typeof v === "string")
        ? (parsed as string[])
        : defaultStrategyFeatureKeys;
    } catch {
      return defaultStrategyFeatureKeys;
    }
  });
  const [accountFeatureMode, setAccountFeatureMode] = useState<"none" | "add" | "delete">(
    "none"
  );
  const [strategyFeatureMode, setStrategyFeatureMode] = useState<
    "none" | "add" | "delete"
  >("none");
  const [tradeFeatureMode, setTradeFeatureMode] = useState<"none" | "add" | "delete">(
    "none"
  );
  const [newAccountFeature, setNewAccountFeature] = useState("");
  const [newStrategyFeature, setNewStrategyFeature] = useState("");
  const [newTradeFeature, setNewTradeFeature] = useState("");
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "emerald-ember";
    return localStorage.getItem("tj-theme") ?? "emerald-ember";
  });
  const [tagPool, setTagPool] = useState<{ name: string; color: string }[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem("tj-tag-pool");
    if (!stored) return [];
    try {
      return JSON.parse(stored) as { name: string; color: string }[];
    } catch {
      return [];
    }
  });
  const [newTag, setNewTag] = useState("");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [tradesLoading, setTradesLoading] = useState(true);
  const [tradesError, setTradesError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmTradeId, setDeleteConfirmTradeId] = useState<string | null>(
    null
  );
  const [deleteAllConfirmStep, setDeleteAllConfirmStep] = useState<1 | 2 | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [accounts, setAccounts] = useState<
    { account_id: string; account_name: string }[]
  >([]);
  const [strategies, setStrategies] = useState<
    { strategy_id: string; strategy_name: string }[]
  >([]);
  const [availableAssets, setAvailableAssets] = useState<string[]>([]);
  const [availableSessions, setAvailableSessions] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState("All time");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [accountScopes, setAccountScopes] = useState({
    totalPnL: "all",
    winRate: "all",
    avgRR: "all",
    avgHolding: "all",
    equityCurve: "all",
    tradeOutcomes: "all",
    sessionPerformance: "all",
    setupQuality: "all",
    calendar: "all",
  });
  const [strategyScopes, setStrategyScopes] = useState({
    totalPnL: "all",
    winRate: "all",
    avgRR: "all",
    avgHolding: "all",
    equityCurve: "all",
    tradeOutcomes: "all",
    sessionPerformance: "all",
    setupQuality: "all",
    calendar: "all",
  });
  const [accountDashboard, setAccountDashboard] = useState("all");
  const [strategyDashboard, setStrategyDashboard] = useState("all");
  const [dateRangeDashboard, setDateRangeDashboard] = useState("All time");
  const [customDateFromDashboard, setCustomDateFromDashboard] = useState("");
  const [customDateToDashboard, setCustomDateToDashboard] = useState("");
  const [dashboardChartVisibility, setDashboardChartVisibility] = useState(() => {
    const defaultVis = {
      equityCurve: true,
      tradeOutcomes: true,
      sessionPerformance: true,
      setupQuality: true,
    };
    try {
      const stored = localStorage.getItem("tj-dashboard-chart-visibility");
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, boolean>;
        return { ...defaultVis, ...parsed };
      }
    } catch {
      // ignore
    }
    return defaultVis;
  });
  const [activeView, setActiveView] = useState<
    "dashboard" | "dashboard-page" | "dashboard-settings" | "new-trade" | "new-account" | "new-strategy" | "settings"
  >("dashboard");
  const [settingsSection, setSettingsSection] = useState<"themes" | "settings">(
    "themes",
  );
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [heroProgress, setHeroProgress] = useState(0);

  useEffect(() => {
    if (!assetDropdownOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!assetDropdownRef.current) return;
      if (!assetDropdownRef.current.contains(event.target as Node)) {
        setAssetDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [assetDropdownOpen]);

  useEffect(() => {
    if (!tradeTypeDropdownOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!tradeTypeDropdownRef.current) return;
      if (!tradeTypeDropdownRef.current.contains(event.target as Node)) {
        setTradeTypeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [tradeTypeDropdownOpen]);

  useEffect(() => {
    if (!accountFeatureOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!accountFeatureRef.current) return;
      if (!accountFeatureRef.current.contains(event.target as Node)) {
        setAccountFeatureOpen(false);
        setAccountFeatureMode("none");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [accountFeatureOpen]);

  useEffect(() => {
    if (!strategyFeatureOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!strategyFeatureRef.current) return;
      if (!strategyFeatureRef.current.contains(event.target as Node)) {
        setStrategyFeatureOpen(false);
        setStrategyFeatureMode("none");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [strategyFeatureOpen]);

  useEffect(() => {
    if (!tradeFeatureOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!tradeFeatureRef.current) return;
      if (!tradeFeatureRef.current.contains(event.target as Node)) {
        setTradeFeatureOpen(false);
        setTradeFeatureMode("none");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [tradeFeatureOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("tj-asset-options", JSON.stringify(assetOptions));
    } catch {
      // ignore storage errors
    }
  }, [assetOptions]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        "tj-trade-type-options",
        JSON.stringify(tradeTypeOptions)
      );
    } catch {
      // ignore storage errors
    }
  }, [tradeTypeOptions]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        "tj-trade-feature-keys",
        JSON.stringify(tradeFeatureKeys)
      );
    } catch {
      // ignore storage errors
    }
  }, [tradeFeatureKeys]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        "tj-account-feature-keys",
        JSON.stringify(accountFeatureKeys)
      );
    } catch {
      // ignore storage errors
    }
  }, [accountFeatureKeys]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        "tj-strategy-feature-keys",
        JSON.stringify(strategyFeatureKeys)
      );
    } catch {
      // ignore storage errors
    }
  }, [strategyFeatureKeys]);

  useEffect(() => {
    let cancelled = false;
    const loadTrades = async () => {
      setTradesLoading(true);
      setTradesError(null);
      try {
        const list = await getTrades();
        if (!cancelled) {
          setTrades(list.map(normalizeTrade));
        }
      } catch (err) {
        if (!cancelled) {
          setTradesError(err instanceof Error ? err.message : "Failed to load trades");
        }
      } finally {
        if (!cancelled) setTradesLoading(false);
      }
    };
    loadTrades();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadFilters = async () => {
      setFiltersLoading(true);
      try {
        const data = await getFilters();
        if (!cancelled) {
          setAccounts(data.accounts ?? []);
          setStrategies(data.strategies ?? []);
          setAvailableAssets(data.assets ?? []);
          setAvailableSessions(data.sessions ?? []);
        }
      } finally {
        if (!cancelled) setFiltersLoading(false);
      }
    };
    loadFilters();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshFilters = async () => {
    setFiltersLoading(true);
    try {
      const data = await getFilters();
      setAccounts(data.accounts ?? []);
      setStrategies(data.strategies ?? []);
      setAvailableAssets(data.assets ?? []);
      setAvailableSessions(data.sessions ?? []);
    } finally {
      setFiltersLoading(false);
    }
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("tj-theme", theme);
  }, [theme]);
  useEffect(() => {
    const maxHeight = 220;
    const onScroll = () => {
      const next = Math.min(1, Math.max(0, window.scrollY / maxHeight));
      setHeroProgress(next);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      const target = event.target as HTMLElement | null;
      if (target instanceof HTMLInputElement && target.type === "number") {
        if (document.activeElement === target) {
          event.preventDefault();
        }
      }
    };
    document.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      document.removeEventListener("wheel", handleWheel);
    };
  }, []);
  useEffect(() => {
    localStorage.setItem("tj-tag-pool", JSON.stringify(tagPool));
  }, [tagPool]);
  useEffect(() => {
    try {
      window.localStorage.setItem(
        "tj-dashboard-chart-visibility",
        JSON.stringify(dashboardChartVisibility)
      );
    } catch {
      // ignore
    }
  }, [dashboardChartVisibility]);
  const getNextTradeIdFromList = (items: Trade[]) => {
    const maxId = items.reduce((max, trade) => {
      const match = trade.trade_id.match(/trd-(\d+)/i);
      if (!match) return max;
      return Math.max(max, Number(match[1]));
    }, 0);
    return `trd-${maxId + 1}`;
  };
  const [customFields, setCustomFields] = useState(() =>
    tradeFeatureKeys.map((key) => ({ key, value: "" }))
  );
  const [rrManual, setRrManual] = useState({
    expected: false,
    actual: false,
    pnl: false,
  });
  const [accountForm, setAccountForm] = useState({
    account_name: "",
    account_type: "Demo",
    initial_balance: "",
  });
  const [accountFields, setAccountFields] = useState(() =>
    accountFeatureKeys.map((key) => ({ key, value: "" }))
  );
  const [strategyForm, setStrategyForm] = useState({
    strategy_name: "",
    strategy_notes: "",
  });
  const [strategyFields, setStrategyFields] = useState(() =>
    strategyFeatureKeys.map((key) => ({ key, value: "" }))
  );
  const [recentLimit, setRecentLimit] = useState("5");
  const [formState, setFormState] = useState({
    trade_id: "",
    start_datetime: "",
    end_datetime: "",
    trade_type: "Scalping",
    asset: "",
    direction: "Long",
    timeframe: "5m",
    session: "London",
    entry_candle_type: "",
    strategy: "",
    entry_price: "",
    exit_price: "",
    risk_percentage: "",
    expected_risk_reward: "",
    actual_risk_reward: "",
    trend_multi_timeframe: "",
    take_profit: "",
    stop_loss: "",
    amount_traded: "",
    lot_size: "",
    leverage: "",
    trade_fees: "",
    pnl: "",
    sl_moved_to_breakeven: false,
    account: "",
    balance_before_trade: "",
    balance_after_trade: "",
    increased_lot_size: false,
    entry_reason: "",
    exit_reason: "",
    notes: "",
    tags: "",
    images: [] as File[],
  });

  const parseNumber = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const computeRiskReward = (
    direction: "Long" | "Short",
    entry: number | null,
    target: number | null,
    stop: number | null
  ) => {
    if (entry === null || target === null || stop === null) return "";
    const risk =
      direction === "Long" ? entry - stop : stop - entry;
    const reward =
      direction === "Long" ? target - entry : entry - target;
    if (risk <= 0) return "";
    const rr = reward / risk;
    if (!Number.isFinite(rr)) return "";
    return rr.toFixed(3);
  };

  useEffect(() => {
    const entry = parseNumber(formState.entry_price);
    const stop = parseNumber(formState.stop_loss);
    const takeProfit = parseNumber(formState.take_profit);
    const exit = parseNumber(formState.exit_price);
    const lotSize = parseNumber(formState.lot_size) ?? 1;
    const direction = formState.direction as "Long" | "Short";

    if (!rrManual.expected) {
      const expected = computeRiskReward(direction, entry, takeProfit, stop);
      setFormState((prev) => ({ ...prev, expected_risk_reward: expected }));
    }
    if (!rrManual.actual) {
      const actual = computeRiskReward(direction, entry, exit, stop);
      setFormState((prev) => ({ ...prev, actual_risk_reward: actual }));
    }
    if (!rrManual.pnl) {
      if (entry === null || exit === null) {
        setFormState((prev) => ({ ...prev, pnl: "" }));
      } else {
        const raw =
          direction === "Long" ? (exit - entry) * lotSize : (entry - exit) * lotSize;
        const pnl = Number.isFinite(raw) ? raw.toFixed(3) : "";
        setFormState((prev) => ({ ...prev, pnl }));
      }
    }
  }, [
    formState.entry_price,
    formState.exit_price,
    formState.take_profit,
    formState.stop_loss,
    formState.direction,
    formState.lot_size,
    rrManual.expected,
    rrManual.actual,
    rrManual.pnl,
  ]);

  useEffect(() => {
    setFormState((prev) =>
      prev.trade_id ? prev : { ...prev, trade_id: getNextTradeIdFromList(trades) }
    );
  }, [trades]);

  useEffect(() => {
    if (activeView === "new-trade") {
      fetchNextTradeId()
        .then((data) => setFormState((prev) => ({ ...prev, trade_id: data.next_id })))
        .catch(() => setFormState((prev) => ({ ...prev, trade_id: getNextTradeIdFromList(trades) })));
    }
  }, [activeView, trades]);

  const resetForm = () => {
    setFormState({
      trade_id: getNextTradeIdFromList(trades),
      start_datetime: "",
      end_datetime: "",
      trade_type: "Scalping",
      asset: "",
      direction: "Long",
      timeframe: "5m",
      session: "London",
      entry_candle_type: "",
      strategy: "",
      entry_price: "",
      exit_price: "",
      risk_percentage: "",
      expected_risk_reward: "",
      actual_risk_reward: "",
      trend_multi_timeframe: "",
      take_profit: "",
      stop_loss: "",
      amount_traded: "",
      lot_size: "",
      leverage: "",
      trade_fees: "",
      pnl: "",
      sl_moved_to_breakeven: false,
      account: "",
      balance_before_trade: "",
      balance_after_trade: "",
      increased_lot_size: false,
      entry_reason: "",
      exit_reason: "",
      notes: "",
      tags: "",
      images: [],
    });
    setRrManual({ expected: false, actual: false, pnl: false });
    setCustomFields(TRADE_FEATURE_ORDER.map((key) => ({ key, value: "" })));
    setNewTag("");
  };

  const normalizeTag = (value: string) => value.trim().replace(/\s+/g, " ");

  const getTagColor = (value: string) => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 45%)`;
  };

  const ensureTagInPool = (value: string) => {
    const tag = normalizeTag(value);
    if (!tag) return;
    setTagPool((prev) => {
      if (prev.some((item) => item.name.toLowerCase() === tag.toLowerCase())) {
        return prev;
      }
      return [...prev, { name: tag, color: getTagColor(tag) }];
    });
  };

  const addTagToField = (value: string) => {
    const tag = normalizeTag(value);
    if (!tag) return;
    const current = formState.tags
      .split(",")
      .map((item) => normalizeTag(item))
      .filter(Boolean);
    if (!current.includes(tag)) {
      const next = [...current, tag].join(", ");
      setFormState((prev) => ({ ...prev, tags: next }));
    }
  };

  const handleAddTag = () => {
    const tag = normalizeTag(newTag);
    if (!tag) return;
    ensureTagInPool(tag);
    addTagToField(tag);
    setNewTag("");
  };

  const handleFieldChange = (
    event:
      | ChangeEvent<HTMLInputElement>
      | ChangeEvent<HTMLSelectElement>
      | ChangeEvent<HTMLTextAreaElement>
  ) => {
    const { name, value, type } = event.target;
    const isCheckbox = type === "checkbox";
    if (name === "expected_risk_reward") {
      setRrManual((prev) => ({ ...prev, expected: true }));
    }
    if (name === "actual_risk_reward") {
      setRrManual((prev) => ({ ...prev, actual: true }));
    }
    if (name === "pnl") {
      setRrManual((prev) => ({ ...prev, pnl: true }));
    }
    setFormState((prev) => ({
      ...prev,
      [name]: isCheckbox
        ? (event.target as HTMLInputElement).checked
        : value,
    }));
  };

  const handleImagesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    setFormState((prev) => ({ ...prev, images: files }));
  };

  const updateCustomField = (index: number, key: "key" | "value", value: string) => {
    setCustomFields((prev) =>
      prev.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, [key]: value } : field
      )
    );
  };

  const addCustomField = () => {
    setCustomFields((prev) => [...prev, { key: "", value: "" }]);
  };

  const removeCustomField = (index: number) => {
    setCustomFields((prev) => prev.filter((_, fieldIndex) => fieldIndex !== index));
  };

  const updateStrategyField = (index: number, key: "key" | "value", value: string) => {
    setStrategyFields((prev) =>
      prev.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, [key]: value } : field
      )
    );
  };

  const addStrategyField = () => {
    setStrategyFields((prev) => [...prev, { key: "", value: "" }]);
  };

  const removeStrategyField = (index: number) => {
    setStrategyFields((prev) => prev.filter((_, fieldIndex) => fieldIndex !== index));
  };

  const updateAccountField = (index: number, key: "key" | "value", value: string) => {
    setAccountFields((prev) =>
      prev.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, [key]: value } : field
      )
    );
  };

  const addAccountField = () => {
    setAccountFields((prev) => [...prev, { key: "", value: "" }]);
  };

  const removeAccountField = (index: number) => {
    setAccountFields((prev) => prev.filter((_, fieldIndex) => fieldIndex !== index));
  };

  const accountNameSuffix: Record<string, string> = {
    Demo: "-D",
    Personal: "-P",
    Funded: "-F",
  };

  const handleAccountSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    const customFieldsObj: Record<string, string> = {};
    accountFields.forEach(({ key, value }) => {
      if (key.trim()) customFieldsObj[key.trim()] = value;
    });
    const baseName = accountForm.account_name.trim();
    const suffix = accountNameSuffix[accountForm.account_type] ?? "-D";
    const account_name = baseName ? `${baseName} ${suffix}` : suffix.slice(1); // "-D" -> "D" only if no name (fallback)
    try {
      await createAccount({
        account_name,
        account_type: accountForm.account_type,
        initial_balance: accountForm.initial_balance
          ? Number(accountForm.initial_balance)
          : null,
        custom_fields: Object.keys(customFieldsObj).length ? customFieldsObj : null,
      });
      await refreshFilters();
      setAccountForm({ account_name: "", account_type: "Demo", initial_balance: "" });
      setAccountFields(ACCOUNT_FEATURE_ORDER.map((key) => ({ key, value: "" })));
      setActiveView("dashboard");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save account");
    }
  };

  const handleStrategySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    const customFieldsObj: Record<string, string> = {};
    strategyFields.forEach(({ key, value }) => {
      if (key.trim()) customFieldsObj[key.trim()] = value;
    });
    try {
      await createStrategy({
        strategy_name: strategyForm.strategy_name.trim(),
        strategy_notes: strategyForm.strategy_notes || null,
        custom_fields: Object.keys(customFieldsObj).length ? customFieldsObj : null,
      });
      await refreshFilters();
      setStrategyForm({ strategy_name: "", strategy_notes: "" });
      setStrategyFields(STRATEGY_FEATURE_ORDER.map((key) => ({ key, value: "" })));
      setActiveView("dashboard");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save strategy");
    }
  };

  const handleTradeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    if (!formState.asset.trim()) {
      setSubmitError("Asset is required.");
      return;
    }
    const tagList = formState.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    tagList.forEach((tag) => ensureTagInPool(tag));
    let trendMtf: Record<string, string> | null = null;
    if (formState.trend_multi_timeframe?.trim()) {
      try {
        trendMtf = JSON.parse(formState.trend_multi_timeframe) as Record<string, string>;
      } catch {
        trendMtf = null;
      }
    }
    const customFieldsObj: Record<string, string> = {};
    customFields.forEach(({ key, value }) => {
      if (key.trim()) customFieldsObj[key.trim()] = value;
    });

    const payload = {
      start_datetime: formState.start_datetime,
      end_datetime: formState.end_datetime || undefined,
      trade_type: formState.trade_type,
      asset: formState.asset,
      direction: formState.direction,
      timeframe: formState.timeframe,
      session: formState.session,
      entry_candle_type: formState.entry_candle_type || undefined,
      strategy_name: formState.strategy || undefined,
      entry_price: Number(formState.entry_price) || 0,
      exit_price: formState.exit_price ? Number(formState.exit_price) : undefined,
      risk_percentage: formState.risk_percentage ? Number(formState.risk_percentage) : undefined,
      expected_risk_reward: formState.expected_risk_reward ? Number(formState.expected_risk_reward) : undefined,
      actual_risk_reward: formState.actual_risk_reward ? Number(formState.actual_risk_reward) : undefined,
      trend_multi_timeframe: trendMtf,
      take_profit: formState.take_profit ? Number(formState.take_profit) : undefined,
      stop_loss: formState.stop_loss ? Number(formState.stop_loss) : undefined,
      amount_traded: formState.amount_traded ? Number(formState.amount_traded) : undefined,
      lot_size: formState.lot_size ? Number(formState.lot_size) : undefined,
      leverage: formState.leverage ? Number(formState.leverage) : undefined,
      trade_fees: formState.trade_fees ? Number(formState.trade_fees) : undefined,
      pnl: formState.pnl ? Number(formState.pnl) : undefined,
      sl_moved_to_breakeven: formState.sl_moved_to_breakeven,
      account_name: formState.account || undefined,
      balance_before_trade: formState.balance_before_trade ? Number(formState.balance_before_trade) : undefined,
      balance_after_trade: formState.balance_after_trade ? Number(formState.balance_after_trade) : undefined,
      increased_lot_size: formState.increased_lot_size,
      entry_reason: formState.entry_reason || undefined,
      exit_reason: formState.exit_reason || undefined,
      notes: formState.notes || undefined,
      custom_fields: Object.keys(customFieldsObj).length ? customFieldsObj : null,
      tags: tagList,
    };

    try {
      const created = await createTrade(payload);
      if (formState.images.length > 0) {
        await uploadTradeImages(created.trade_id, formState.images);
      }
      const list = await getTrades();
      setTrades(list.map(normalizeTrade));
      await refreshFilters();
      setActiveView("dashboard");
      resetForm();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save trade");
    }
  };

  const handleDeleteTrade = async (tradeId: string) => {
    setDeleteConfirmTradeId(null);
    setDeletingId(tradeId);
    try {
      await deleteTrade(tradeId);
      const list = await getTrades();
      setTrades(list.map(normalizeTrade));
      await refreshFilters();
    } catch {
      setTradesError("Failed to delete trade");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAllTrades = async () => {
    setDeleteAllConfirmStep(null);
    setDeletingAll(true);
    try {
      await deleteAllTrades();
      const list = await getTrades();
      setTrades(list.map(normalizeTrade));
      await refreshFilters();
      setFormState((prev) => ({ ...prev, trade_id: "trd-1" }));
    } catch {
      setTradesError("Failed to delete all trades");
    } finally {
      setDeletingAll(false);
    }
  };

  const requiredLabel = (text: string) => (
    <span className="inline-flex items-center gap-1 text-slate-200">
      {text}
      <span className="text-[11px] text-rose-300">*</span>
    </span>
  );

  const stats = useMemo(() => {
    const parseTradeDate = (value: string) => new Date(value).getTime();
    const rangeFrom = (): number | null => {
      const now = new Date();
      if (dateRange === "Today") {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return todayStart.getTime();
      }
      if (dateRange === "Last 7 days")
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
      if (dateRange === "Last 15 days")
        return new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).getTime();
      if (dateRange === "Last 30 days")
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).getTime();
      if (dateRange === "This month")
        return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      if (dateRange === "This year")
        return new Date(now.getFullYear(), 0, 1).getTime();
      if (dateRange === "Custom" && customDateFrom) {
        const d = new Date(customDateFrom);
        return d.getTime();
      }
      return null;
    };
    const rangeTo = (): number | null => {
      if (dateRange === "Today") {
        const now = new Date();
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        return todayEnd.getTime();
      }
      if (dateRange !== "Custom" || !customDateTo) return null;
      const d = new Date(customDateTo);
      d.setHours(23, 59, 59, 999);
      return d.getTime();
    };
    const rangeStartTs = rangeFrom();
    const rangeEndTs = rangeTo();
    const withRange = (list: Trade[]) => {
      if (rangeStartTs === null && rangeEndTs === null) return list;
      return list.filter((trade) => {
        const ts = parseTradeDate(trade.start_datetime_raw);
        if (rangeStartTs !== null && ts < rangeStartTs) return false;
        if (rangeEndTs !== null && ts > rangeEndTs) return false;
        return true;
      });
    };
    const withAccount = (list: Trade[], accountName: string) =>
      accountName === "all"
        ? list
        : list.filter((trade) => trade.account_name === accountName);
    const withStrategy = (list: Trade[], strategyName: string) =>
      strategyName === "all"
        ? list
        : list.filter((trade) => trade.strategy === strategyName);
    const prevRange = (): { start: number; end: number } => {
      const now = new Date();
      if (dateRange === "Today") {
        const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999).getTime();
        const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0).getTime();
        return { start: yesterdayStart, end: yesterdayEnd };
      }
      if (dateRange === "Last 7 days") {
        const end = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
        const start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).getTime();
        return { start, end };
      }
      if (dateRange === "Last 15 days") {
        const end = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).getTime();
        const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).getTime();
        return { start, end };
      }
      if (dateRange === "Last 30 days") {
        const end = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).getTime();
        const start = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).getTime();
        return { start, end };
      }
      if (dateRange === "This month") {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
        const end = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        return { start, end };
      }
      if (dateRange === "This year") {
        const start = new Date(now.getFullYear() - 1, 0, 1).getTime();
        const end = new Date(now.getFullYear(), 0, 1).getTime();
        return { start, end };
      }
      const end = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).getTime();
      const start = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).getTime();
      return { start, end };
    };
    const prevWindow = prevRange();
    const withPrevRange = (list: Trade[]) =>
      list.filter((trade) => {
        const ts = parseTradeDate(trade.start_datetime_raw);
        return ts >= prevWindow.start && ts < prevWindow.end;
      });

    const totalTrades = withStrategy(
      withAccount(withRange(trades), accountScopes.totalPnL),
      strategyScopes.totalPnL
    );
    const prevTrades = withStrategy(
      withAccount(withPrevRange(trades), accountScopes.totalPnL),
      strategyScopes.totalPnL
    );
    const winTrades = withStrategy(
      withAccount(withRange(trades), accountScopes.winRate),
      strategyScopes.winRate
    );
    const rrTrades = withStrategy(
      withAccount(withRange(trades), accountScopes.avgRR),
      strategyScopes.avgRR
    );
    const holdingTrades = withStrategy(
      withAccount(withRange(trades), accountScopes.avgHolding),
      strategyScopes.avgHolding
    );

    const totalPnL = totalTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const prevPnL = prevTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const deltaPct =
      prevTrades.length === 0
        ? null
        : prevPnL === 0
        ? null
        : ((totalPnL - prevPnL) / Math.abs(prevPnL)) * 100;
    const wins = winTrades.filter((trade) => trade.pnl > 0).length;
    const winRate = winTrades.length ? (wins / winTrades.length) * 100 : 0;
    const sumRR = rrTrades.reduce((sum, trade) => sum + trade.actual_risk_reward, 0);
    const avgRR = rrTrades.length ? sumRR / rrTrades.length : 0;
    const avgHolding =
      holdingTrades.length > 0
        ? holdingTrades.reduce((sum, trade) => {
            if (!trade.end_datetime) return sum;
            const start = parseTradeDate(trade.start_datetime_raw);
            const end = parseTradeDate(trade.end_datetime_raw);
            return sum + Math.max(0, end - start);
          }, 0) /
          holdingTrades.length /
          (1000 * 60)
        : 0;

    return {
      totalPnL,
      winRate,
      avgRR,
      avgHolding,
      deltaPct,
      winCount: wins,
      winTradesTotal: winTrades.length,
    };
  }, [trades, dateRange, customDateFrom, customDateTo, accountScopes, strategyScopes]);

  const themeOptions = [
    { value: "emerald-ember", label: "Emerald Ember" },
    { value: "midnight-aurora", label: "Midnight Aurora" },
    { value: "sapphire-carbon", label: "Sapphire Carbon" },
    { value: "crimson-noir", label: "Crimson Noir" },
    { value: "graphite-ivory", label: "Graphite Ivory" },
    { value: "royal-matrix", label: "Royal Matrix" },
    { value: "copper-ice", label: "Copper Ice" },
  ];

  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      const matchesAsset = assetFilter === "All" || trade.asset === assetFilter;
      const matchesSession =
        sessionFilter === "All" || trade.session === sessionFilter;
      const matchesStrategy =
        strategyFilter === "All" || trade.strategy === strategyFilter;
      return matchesAsset && matchesSession && matchesStrategy;
    });
  }, [assetFilter, sessionFilter, strategyFilter, trades]);

  const recentActivityTrades = useMemo(() => {
    const sorted = [...filteredTrades].sort((a, b) => {
      const addedA = new Date(a.created_at ?? a.start_datetime_raw).getTime();
      const addedB = new Date(b.created_at ?? b.start_datetime_raw).getTime();
      if (addedB !== addedA) return addedB - addedA;
      const numA = parseInt(a.trade_id.replace(/trd-(\d+)/i, "$1") || "0", 10);
      const numB = parseInt(b.trade_id.replace(/trd-(\d+)/i, "$1") || "0", 10);
      return numB - numA;
    });
    return recentLimit === "all"
      ? sorted
      : sorted.slice(0, Number(recentLimit));
  }, [filteredTrades, recentLimit]);

  const parseTradeDate = (value: string) => new Date(value);
  const rangeStart = useMemo(() => {
    const now = new Date();
    if (dateRange === "Today")
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (dateRange === "Last 7 days")
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (dateRange === "Last 15 days")
      return new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
    if (dateRange === "Last 30 days")
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (dateRange === "This month")
      return new Date(now.getFullYear(), now.getMonth(), 1);
    if (dateRange === "This year")
      return new Date(now.getFullYear(), 0, 1);
    if (dateRange === "Custom" && customDateFrom)
      return new Date(customDateFrom);
    return null;
  }, [dateRange, customDateFrom]);

  const rangeEnd = useMemo(() => {
    if (dateRange === "Today") {
      const now = new Date();
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return todayEnd;
    }
    if (dateRange !== "Custom" || !customDateTo) return null;
    const d = new Date(customDateTo);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [dateRange, customDateTo]);

  const dateFilteredTrades = useMemo(() => {
    if (!rangeStart && !rangeEnd) return trades;
    return trades.filter((trade) => {
      const t = parseTradeDate(trade.start_datetime_raw).getTime();
      if (rangeStart && t < rangeStart.getTime()) return false;
      if (rangeEnd && t > rangeEnd.getTime()) return false;
      return true;
    });
  }, [trades, rangeStart, rangeEnd]);

  const rangeStartDashboard = useMemo(() => {
    const now = new Date();
    if (dateRangeDashboard === "Today")
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (dateRangeDashboard === "Last 7 days")
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (dateRangeDashboard === "Last 15 days")
      return new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
    if (dateRangeDashboard === "Last 30 days")
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (dateRangeDashboard === "This month")
      return new Date(now.getFullYear(), now.getMonth(), 1);
    if (dateRangeDashboard === "This year")
      return new Date(now.getFullYear(), 0, 1);
    if (dateRangeDashboard === "Custom" && customDateFromDashboard)
      return new Date(customDateFromDashboard);
    return null;
  }, [dateRangeDashboard, customDateFromDashboard]);

  const rangeEndDashboard = useMemo(() => {
    if (dateRangeDashboard === "Today") {
      const now = new Date();
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return todayEnd;
    }
    if (dateRangeDashboard !== "Custom" || !customDateToDashboard) return null;
    const d = new Date(customDateToDashboard);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [dateRangeDashboard, customDateToDashboard]);

  const dateFilteredTradesDashboard = useMemo(() => {
    if (!rangeStartDashboard && !rangeEndDashboard) return trades;
    return trades.filter((trade) => {
      const t = parseTradeDate(trade.start_datetime_raw).getTime();
      if (rangeStartDashboard && t < rangeStartDashboard.getTime()) return false;
      if (rangeEndDashboard && t > rangeEndDashboard.getTime()) return false;
      return true;
    });
  }, [trades, rangeStartDashboard, rangeEndDashboard]);

  const equityTrades = useMemo(() => {
    const byAccount =
      accountScopes.equityCurve === "all"
        ? dateFilteredTrades
        : dateFilteredTrades.filter(
            (trade) => trade.account_name === accountScopes.equityCurve
          );
    const scoped =
      strategyScopes.equityCurve === "all"
        ? byAccount
        : byAccount.filter((trade) => trade.strategy === strategyScopes.equityCurve);
    return [...scoped].sort(
      (a, b) =>
        parseTradeDate(a.start_datetime_raw).getTime() -
        parseTradeDate(b.start_datetime_raw).getTime()
    );
  }, [dateFilteredTrades, accountScopes.equityCurve, strategyScopes.equityCurve]);

  const equitySeries = useMemo(() => {
    return equityTrades.reduce<{ name: string; time: number; equity: number }[]>(
      (acc, trade, index) => {
        const prev = index === 0 ? 0 : acc[index - 1].equity;
        const next = prev + trade.pnl;
        const dateStr = trade.start_datetime.split(" ")[0];
        const time = parseTradeDate(trade.start_datetime_raw).getTime();
        acc.push({ name: dateStr, time, equity: next });
        return acc;
      },
      []
    );
  }, [equityTrades]);

  const outcomeTrades = useMemo(() => {
    const byPm = dateFilteredTrades.filter(
      (trade) =>
        accountScopes.tradeOutcomes === "all" ||
        trade.account_name === accountScopes.tradeOutcomes
    );
    if (strategyScopes.tradeOutcomes === "all") return byPm;
    return byPm.filter(
      (trade) => trade.strategy === strategyScopes.tradeOutcomes
    );
  }, [dateFilteredTrades, accountScopes.tradeOutcomes, strategyScopes.tradeOutcomes]);

  const setupQualityTrades = useMemo(() => {
    const byPm = dateFilteredTrades.filter(
      (trade) =>
        accountScopes.setupQuality === "all" ||
        trade.account_name === accountScopes.setupQuality
    );
    const withStrategy =
      strategyScopes.setupQuality === "all"
        ? byPm
        : byPm.filter(
            (trade) => trade.strategy === strategyScopes.setupQuality
          );
    return [...withStrategy].sort(
      (a, b) =>
        new Date(a.start_datetime_raw).getTime() -
        new Date(b.start_datetime_raw).getTime()
    );
  }, [dateFilteredTrades, accountScopes.setupQuality, strategyScopes.setupQuality]);

  const topSetupsLabel = useMemo(() => {
    if (setupQualityTrades.length === 0) return "—";
    const byStrategy = new Map<string, { wins: number; total: number }>();
    setupQualityTrades.forEach((t) => {
      const cur = byStrategy.get(t.strategy) ?? { wins: 0, total: 0 };
      cur.total += 1;
      if (t.pnl > 0) cur.wins += 1;
      byStrategy.set(t.strategy, cur);
    });
    const sorted = [...byStrategy.entries()]
      .filter(([, v]) => v.total > 0)
      .sort((a, b) => b[1].wins - a[1].wins);
    if (sorted.length === 0) return "—";
    return sorted
      .slice(0, 3)
      .map(([name]) => name)
      .join(" · ");
  }, [setupQualityTrades]);

  const outcomeMetrics = useMemo(() => {
    if (outcomeTrades.length === 0)
      return { bestStrategy: "—", profitFactor: null as number | null, expectancy: null as number | null };
    const totalPnL = outcomeTrades.reduce((s, t) => s + t.pnl, 0);
    const wins = outcomeTrades.filter((t) => t.pnl > 0);
    const losses = outcomeTrades.filter((t) => t.pnl < 0);
    const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
    const profitFactor =
      grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
    const expectancy = totalPnL / outcomeTrades.length;
    const byStrategy = new Map<string, number>();
    for (const t of outcomeTrades) {
      const s = t.strategy || "—";
      byStrategy.set(s, (byStrategy.get(s) ?? 0) + t.pnl);
    }
    let bestStrategy = "—";
    let bestPnL = -Infinity;
    byStrategy.forEach((pnl, name) => {
      if (pnl > bestPnL) {
        bestPnL = pnl;
        bestStrategy = name;
      }
    });
    return {
      bestStrategy,
      profitFactor: grossProfit === 0 && grossLoss === 0 ? null : profitFactor,
      expectancy,
    };
  }, [outcomeTrades]);

  const winLossData = useMemo(() => {
    const wins = outcomeTrades.filter((t) => t.pnl > 0);
    const losses = outcomeTrades.filter((t) => t.pnl <= 0);
    const winsProfit = wins.reduce((sum, t) => sum + t.pnl, 0);
    const lossesProfit = losses.reduce((sum, t) => sum + t.pnl, 0);
    return [
      { name: "Wins", value: wins.length, profit: winsProfit },
      { name: "Losses", value: losses.length, profit: lossesProfit },
    ];
  }, [outcomeTrades]);

  const sessionTrades = useMemo(() => {
    const byAccount =
      accountScopes.sessionPerformance === "all"
        ? dateFilteredTrades
        : dateFilteredTrades.filter(
            (trade) => trade.account_name === accountScopes.sessionPerformance
          );
    return strategyScopes.sessionPerformance === "all"
      ? byAccount
      : byAccount.filter((trade) => trade.strategy === strategyScopes.sessionPerformance);
  }, [dateFilteredTrades, accountScopes.sessionPerformance, strategyScopes.sessionPerformance]);

  const sessionData = availableSessions.length
    ? availableSessions.map((session) => ({
        name: session,
        value: sessionTrades.filter((t) => t.session === session).length,
      }))
    : [
        { name: "London", value: sessionTrades.filter((t) => t.session === "London").length },
        {
          name: "New York",
          value: sessionTrades.filter((t) => t.session === "New York").length,
        },
        { name: "Asia", value: sessionTrades.filter((t) => t.session === "Asia").length },
      ];

  const equityTradesDashboard = useMemo(() => {
    const byAccount =
      accountDashboard === "all"
        ? dateFilteredTradesDashboard
        : dateFilteredTradesDashboard.filter(
            (trade) => trade.account_name === accountDashboard
          );
    const scoped =
      strategyDashboard === "all"
        ? byAccount
        : byAccount.filter((trade) => trade.strategy === strategyDashboard);
    return [...scoped].sort(
      (a, b) =>
        parseTradeDate(a.start_datetime_raw).getTime() -
        parseTradeDate(b.start_datetime_raw).getTime()
    );
  }, [dateFilteredTradesDashboard, accountDashboard, strategyDashboard]);

  const equitySeriesDashboard = useMemo(() => {
    return equityTradesDashboard.reduce<{ name: string; time: number; equity: number }[]>(
      (acc, trade, index) => {
        const prev = index === 0 ? 0 : acc[index - 1].equity;
        const next = prev + trade.pnl;
        const dateStr = trade.start_datetime.split(" ")[0];
        const time = parseTradeDate(trade.start_datetime_raw).getTime();
        acc.push({ name: dateStr, time, equity: next });
        return acc;
      },
      []
    );
  }, [equityTradesDashboard]);

  const outcomeTradesDashboard = useMemo(() => {
    const byAccount = dateFilteredTradesDashboard.filter(
      (trade) =>
        accountDashboard === "all" || trade.account_name === accountDashboard
    );
    if (strategyDashboard === "all") return byAccount;
    return byAccount.filter((trade) => trade.strategy === strategyDashboard);
  }, [dateFilteredTradesDashboard, accountDashboard, strategyDashboard]);

  const outcomeMetricsDashboard = useMemo(() => {
    if (outcomeTradesDashboard.length === 0)
      return { bestStrategy: "—", profitFactor: null as number | null, expectancy: null as number | null };
    const totalPnL = outcomeTradesDashboard.reduce((s, t) => s + t.pnl, 0);
    const wins = outcomeTradesDashboard.filter((t) => t.pnl > 0);
    const losses = outcomeTradesDashboard.filter((t) => t.pnl < 0);
    const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
    const profitFactor =
      grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
    const expectancy = totalPnL / outcomeTradesDashboard.length;
    const byStrategy = new Map<string, number>();
    for (const t of outcomeTradesDashboard) {
      const s = t.strategy || "—";
      byStrategy.set(s, (byStrategy.get(s) ?? 0) + t.pnl);
    }
    let bestStrategy = "—";
    let bestPnL = -Infinity;
    byStrategy.forEach((pnl, name) => {
      if (pnl > bestPnL) {
        bestPnL = pnl;
        bestStrategy = name;
      }
    });
    return {
      bestStrategy,
      profitFactor: grossProfit === 0 && grossLoss === 0 ? null : profitFactor,
      expectancy,
    };
  }, [outcomeTradesDashboard]);

  const winLossDataDashboard = useMemo(() => {
    const wins = outcomeTradesDashboard.filter((t) => t.pnl > 0);
    const losses = outcomeTradesDashboard.filter((t) => t.pnl <= 0);
    const winsProfit = wins.reduce((sum, t) => sum + t.pnl, 0);
    const lossesProfit = losses.reduce((sum, t) => sum + t.pnl, 0);
    return [
      { name: "Wins", value: wins.length, profit: winsProfit },
      { name: "Losses", value: losses.length, profit: lossesProfit },
    ];
  }, [outcomeTradesDashboard]);

  const sessionTradesDashboard = useMemo(() => {
    const byAccount =
      accountDashboard === "all"
        ? dateFilteredTradesDashboard
        : dateFilteredTradesDashboard.filter(
            (trade) => trade.account_name === accountDashboard
          );
    return strategyDashboard === "all"
      ? byAccount
      : byAccount.filter((trade) => trade.strategy === strategyDashboard);
  }, [dateFilteredTradesDashboard, accountDashboard, strategyDashboard]);

  const sessionDataDashboard = availableSessions.length
    ? availableSessions.map((session) => ({
        name: session,
        value: sessionTradesDashboard.filter((t) => t.session === session).length,
      }))
    : [
        { name: "London", value: sessionTradesDashboard.filter((t) => t.session === "London").length },
        {
          name: "New York",
          value: sessionTradesDashboard.filter((t) => t.session === "New York").length,
        },
        { name: "Asia", value: sessionTradesDashboard.filter((t) => t.session === "Asia").length },
      ];

  const setupQualityTradesDashboard = useMemo(() => {
    const byAccount = dateFilteredTradesDashboard.filter(
      (trade) =>
        accountDashboard === "all" || trade.account_name === accountDashboard
    );
    const withStrategy =
      strategyDashboard === "all"
        ? byAccount
        : byAccount.filter(
            (trade) => trade.strategy === strategyDashboard
          );
    return [...withStrategy].sort(
      (a, b) =>
        new Date(a.start_datetime_raw).getTime() -
        new Date(b.start_datetime_raw).getTime()
    );
  }, [dateFilteredTradesDashboard, accountDashboard, strategyDashboard]);

  const topSetupsLabelDashboard = useMemo(() => {
    if (setupQualityTradesDashboard.length === 0) return "—";
    const byStrategy = new Map<string, { wins: number; total: number }>();
    setupQualityTradesDashboard.forEach((t) => {
      const cur = byStrategy.get(t.strategy) ?? { wins: 0, total: 0 };
      cur.total += 1;
      if (t.pnl > 0) cur.wins += 1;
      byStrategy.set(t.strategy, cur);
    });
    const sorted = [...byStrategy.entries()]
      .filter(([, v]) => v.total > 0)
      .sort((a, b) => b[1].wins - a[1].wins);
    if (sorted.length === 0) return "—";
    return sorted
      .slice(0, 3)
      .map(([name]) => name)
      .join(" · ");
  }, [setupQualityTradesDashboard]);

  const calendarMonthStart = useMemo(
    () => new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1),
    [calendarMonth]
  );
  const calendarMonthLabel = useMemo(() => {
    const monthName = calendarMonthStart.toLocaleString("en-US", { month: "long" });
    return `${monthName}-${calendarMonthStart.getFullYear()}`;
  }, [calendarMonthStart]);
  const toDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };
  const calendarStats = useMemo(() => {
    const byAccount =
      accountScopes.calendar === "all"
        ? trades
        : trades.filter((trade) => trade.account_name === accountScopes.calendar);
    const scopedTrades =
      strategyScopes.calendar === "all"
        ? byAccount
        : byAccount.filter((trade) => trade.strategy === strategyScopes.calendar);
    const map = new Map<string, { pnl: number; count: number }>();
    let totalPnL = 0;
    let totalTrades = 0;
    scopedTrades.forEach((trade) => {
      const date = new Date(trade.start_datetime_raw);
      if (
        date.getFullYear() !== calendarMonthStart.getFullYear() ||
        date.getMonth() !== calendarMonthStart.getMonth()
      ) {
        return;
      }
      const key = toDateKey(date);
      const current = map.get(key) ?? { pnl: 0, count: 0 };
      current.pnl += trade.pnl;
      current.count += 1;
      map.set(key, current);
      totalPnL += trade.pnl;
      totalTrades += 1;
    });
    return { map, totalPnL, totalTrades };
  }, [trades, calendarMonthStart, accountScopes.calendar, strategyScopes.calendar]);
  const calendarDays = useMemo(() => {
    const startDay = calendarMonthStart.getDay();
    const startOffset = (startDay + 6) % 7;
    const startDate = new Date(calendarMonthStart);
    startDate.setDate(calendarMonthStart.getDate() - startOffset);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);
      return date;
    });
  }, [calendarMonthStart]);
  const calendarWeeks = useMemo(() => {
    const weeks: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeks.push(calendarDays.slice(i, i + 7));
    }
    return weeks;
  }, [calendarDays]);
  const formatCompact = (value: number, decimals = 3) => {
    const abs = Math.abs(value);
    if (abs >= 1000) {
      return `${(value / 1000).toFixed(3)}K`;
    }
    return value.toFixed(decimals);
  };
  const formatNumber = (value: number) => value.toFixed(3);
  const formatInteger = (value: number) => String(Math.round(Number(value)));

  const CalendarPanel = ({
    compact = false,
    showExpand = false,
  }: {
    compact?: boolean;
    showExpand?: boolean;
  }) => (
    <div
      className={`rounded-3xl border border-surface-800 bg-surface-900/85 shadow-soft ${
        compact ? "cursor-pointer p-5" : "p-6"
      }`}
      onClick={showExpand ? () => setCalendarOpen(true) : undefined}
      role={showExpand ? "button" : undefined}
      tabIndex={showExpand ? 0 : undefined}
      onKeyDown={
        showExpand
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setCalendarOpen(true);
              }
            }
          : undefined
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl border border-surface-700 bg-surface-800/80 px-2 py-1 text-xs text-slate-300">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setCalendarMonth(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                );
              }}
              className="rounded-full p-1 text-slate-300 transition hover:bg-surface-700/70 hover:text-white"
              aria-label="Previous month"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-2 text-sm font-semibold text-white">
              {calendarMonthLabel}
            </span>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setCalendarMonth(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                );
              }}
              className="rounded-full p-1 text-slate-300 transition hover:bg-surface-700/70 hover:text-white"
              aria-label="Next month"
            >
              <ChevronRight size={14} />
            </button>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setCalendarMonth(new Date());
            }}
            className="rounded-2xl border border-surface-700 bg-surface-800/80 px-3 py-1 text-xs text-slate-300 transition hover:border-accent-400/70 hover:text-white"
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-300">
          <span>
            P/L:{" "}
            <span className="font-semibold text-emerald-400">
              {formatCompact(calendarStats.totalPnL, 3)}
            </span>
          </span>
          <span>
            Trades:{" "}
            <span className="font-semibold text-white">{calendarStats.totalTrades}</span>
          </span>
          {showExpand && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setCalendarOpen(true);
              }}
              className="rounded-2xl border border-surface-700 bg-surface-800/80 px-3 py-1 text-xs text-slate-200 transition hover:border-accent-400/70 hover:text-white"
            >
              Expand
            </button>
          )}
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_120px] gap-2 rounded-2xl border border-surface-800 bg-surface-900/60 px-2 py-2 text-[11px] uppercase tracking-[0.25em] text-slate-500">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Summary"].map((label) => (
            <div key={label} className="px-2">
              {label}
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {calendarWeeks.map((week, weekIndex) => {
            const weekSummary = week.reduce(
              (acc, day) => {
                const key = toDateKey(day);
                const stats = calendarStats.map.get(key);
                if (stats) {
                  acc.pnl += stats.pnl;
                  acc.count += stats.count;
                }
                return acc;
              },
              { pnl: 0, count: 0 }
            );
            return (
              <div
                key={`week-${weekIndex}`}
                className="grid grid-cols-[repeat(7,minmax(0,1fr))_120px] gap-2"
              >
                {week.map((day) => {
                  const key = toDateKey(day);
                  const stats = calendarStats.map.get(key);
                  const inMonth = day.getMonth() === calendarMonthStart.getMonth();
                  const isToday = toDateKey(day) === toDateKey(new Date());
                  return (
                    <div
                      key={key}
                      className={`min-h-[90px] rounded-2xl border px-3 py-2 text-xs ${
                        inMonth
                          ? "border-surface-700 bg-surface-900/70 text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                          : "border-surface-800 bg-surface-900/30 text-slate-500"
                      } ${isToday ? "ring-1 ring-accent-400/70" : ""}`}
                    >
                      <div className="text-xs text-slate-400">{day.getDate()}</div>
                      {stats?.count ? (
                        <div className="mt-2 flex flex-1 flex-col items-center justify-center text-center">
                          <div className="text-sm font-semibold text-white">
                            {stats.count}
                          </div>
                          <div
                            className={`mt-1 text-sm font-semibold ${
                              stats.pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {stats.pnl >= 0 ? "+" : ""}
                          {formatCompact(stats.pnl, 3)}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                <div className="min-h-[90px] rounded-2xl border border-surface-700 bg-surface-900/80 px-3 py-2 text-xs text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  <div className="text-[11px] uppercase text-slate-500">Weekly</div>
                  <div className="mt-2 flex flex-1 flex-col items-center justify-center text-center">
                    <div className="text-sm font-semibold text-white">
                      {weekSummary.count}
                    </div>
                    <div
                      className={`mt-1 text-sm font-semibold ${
                        weekSummary.pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {weekSummary.pnl >= 0 ? "+" : ""}
                    {formatCompact(weekSummary.pnl, 3)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen text-slate-100">
      <div className="flex">
        <main className="flex-1">
          <div
            className="relative overflow-hidden border-b border-slate-800/70"
            style={{
              height: `${220 - heroProgress * 220}px`,
              opacity: `${1 - heroProgress * 0.6}`,
            }}
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1600&q=80')",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-surface-950/90 via-surface-900/60 to-transparent" />
          </div>
          <div className="border-b border-slate-800/70 bg-surface-900/60 px-6 py-5 backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              {activeView === "dashboard-page" ? (
                <button
                  onClick={() => setActiveView("dashboard")}
                  className="flex items-center gap-2 rounded-full border border-slate-500/80 bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-50 shadow-[0_10px_25px_rgba(0,0,0,0.35)] hover:bg-slate-800/90 hover:border-slate-300/80 transition"
                >
                  <ArrowLeft size={16} /> Home
                </button>
              ) : activeView === "dashboard-settings" ? (
                <button
                  onClick={() => setActiveView("dashboard-page")}
                  className="flex items-center gap-2 rounded-full border border-slate-500/80 bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-50 shadow-[0_10px_25px_rgba(0,0,0,0.35)] hover:bg-slate-800/90 hover:border-slate-300/80 transition"
                >
                  <ArrowLeft size={16} /> Back to Dashboard
                </button>
              ) : (
                <div className="w-6" aria-hidden="true" />
              )}
              <h1 className="flex-1 text-center text-2xl font-semibold">
                {activeView === "dashboard-settings"
                  ? "Dashboard settings"
                  : activeView === "dashboard-page"
                    ? "Dashboard"
                    : "Trading Journal"}
              </h1>
              <button
                type="button"
                onClick={() => {
                  if (activeView === "dashboard-page") setActiveView("dashboard-settings");
                  else if (activeView === "dashboard-settings") setActiveView("dashboard-page");
                  else setActiveView("settings");
                }}
                className="flex items-center justify-center rounded-full border border-surface-700/70 bg-surface-900/80 p-2 text-slate-300 shadow-[0_10px_20px_rgba(0,0,0,0.25)] hover:bg-surface-800/80 transition"
                title={activeView === "dashboard-page" || activeView === "dashboard-settings" ? "Dashboard settings" : "User"}
              >
                {activeView === "dashboard-page" || activeView === "dashboard-settings" ? (
                  <Settings size={20} />
                ) : (
                  <User size={20} />
                )}
              </button>
            </div>
          </div>
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/70 bg-surface-900/40 px-6 py-4 backdrop-blur">
            {activeView === "dashboard" ? (
              <button
                onClick={() => setActiveView("new-trade")}
                className={`flex items-center gap-2 ${btnPrimary}`}
              >
                <Plus size={16} /> New Trade
              </button>
            ) : activeView !== "dashboard-page" && activeView !== "dashboard-settings" ? (
              <button
                onClick={() => setActiveView("dashboard")}
                className="flex items-center gap-2 rounded-full border border-slate-500/80 bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-50 shadow-[0_10px_25px_rgba(0,0,0,0.35)] hover:bg-slate-800/90 hover:border-slate-300/80 transition"
              >
                <ArrowLeft size={16} /> Home
              </button>
            ) : null}
            <div className="flex flex-wrap items-center justify-end gap-3" />
          </header>

          {activeView === "dashboard" ? (
            <section className="space-y-6 px-6 py-6">
              {tradesError && (
                <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {tradesError}
                </div>
              )}
              <div className="grid gap-6">
                <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                  <div className="rounded-3xl border border-surface-800 bg-surface-900/80 p-4 shadow-soft">
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                      <span className="uppercase tracking-[0.2em] text-slate-500">
                        Performance Metrics
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="min-w-[170px]">
                          <Dropdown
                            value={accountScopes.totalPnL}
                            onChange={(v) =>
                              setAccountScopes((prev) => ({
                                ...prev,
                                totalPnL: v,
                                winRate: v,
                                avgRR: v,
                                avgHolding: v,
                                equityCurve: v,
                                tradeOutcomes: v,
                                sessionPerformance: v,
                                setupQuality: v,
                                calendar: v,
                              }))
                            }
                            options={[
                              { value: "all", label: "All Accounts" },
                              ...accounts.map((account) => ({
                                value: account.account_name,
                                label: account.account_name,
                              })),
                            ]}
                            disabled={filtersLoading}
                            placeholder="All Accounts"
                            className="!max-w-none !px-2 !py-1.5 text-[11px]"
                          />
                        </div>
                        <div className="min-w-[170px]">
                          <Dropdown
                            value={strategyScopes.totalPnL}
                            onChange={(v) =>
                              setStrategyScopes((prev) => ({
                                ...prev,
                                totalPnL: v,
                                winRate: v,
                                avgRR: v,
                                avgHolding: v,
                                equityCurve: v,
                                tradeOutcomes: v,
                                sessionPerformance: v,
                                setupQuality: v,
                                calendar: v,
                              }))
                            }
                            options={[
                              { value: "all", label: "All Strategies" },
                              ...strategies.map((strategy) => ({
                                value: strategy.strategy_name,
                                label: strategy.strategy_name,
                              })),
                            ]}
                            disabled={filtersLoading}
                            placeholder="All Strategies"
                            className="!max-w-none !px-2 !py-1.5 text-[11px]"
                          />
                        </div>
                        <div className="min-w-[150px]">
                          <Dropdown
                            value={dateRange}
                            onChange={(v) => setDateRange(v)}
                            options={dateRangeOptions}
                            placeholder="Date range"
                            className="!max-w-none !px-2 !py-1.5 text-[11px]"
                          />
                        </div>
                        {dateRange === "Custom" && (
                          <>
                            <input
                              type="date"
                              value={customDateFrom}
                              onChange={(e) => setCustomDateFrom(e.target.value)}
                              className="rounded-xl border border-surface-700/60 bg-surface-900/70 px-2 py-1.5 text-[11px] text-white focus:outline-none"
                              title="From date"
                            />
                            <span className="text-slate-500">to</span>
                            <input
                              type="date"
                              value={customDateTo}
                              onChange={(e) => setCustomDateTo(e.target.value)}
                              className="rounded-xl border border-surface-700/60 bg-surface-900/70 px-2 py-1.5 text-[11px] text-white focus:outline-none"
                              title="To date"
                            />
                          </>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-surface-800 bg-surface-900/70 p-4">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>Total PnL</span>
                        </div>
                        <p className="mt-3 text-xl font-semibold text-white">
                          ${stats.totalPnL.toFixed(3)}
                        </p>
                        <p className="mt-1 text-[11px] text-emerald-400">
                          {stats.deltaPct === null
                            ? "No prior period data"
                            : `${stats.deltaPct >= 0 ? "+" : ""}${stats.deltaPct.toFixed(
                                3
                              )}% vs prior period`}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-surface-800 bg-surface-900/70 p-4">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>Win Rate</span>
                        </div>
                        <p className="mt-3 text-xl font-semibold text-white">
                          {stats.winRate.toFixed(3)}%
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {stats.winCount} wins / {stats.winTradesTotal} trades
                        </p>
                      </div>
                      <div className="rounded-2xl border border-surface-800 bg-surface-900/70 p-4">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>Avg. R:R</span>
                        </div>
                        <p className="mt-3 text-xl font-semibold text-white">
                          {stats.avgRR.toFixed(3)}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">Target 2.0+</p>
                      </div>
                      <div className="rounded-2xl border border-surface-800 bg-surface-900/70 p-4">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>Avg. Holding</span>
                        </div>
                        <p className="mt-3 text-xl font-semibold text-white">
                          {stats.avgHolding.toFixed(3)}m
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">Per trade</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-surface-800 bg-surface-900/80 p-5 shadow-soft">
                    <p className="text-sm font-semibold text-white">Quick Actions</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Jump into your most common workflows.
                    </p>
                    <div className="mt-4 space-y-3">
                      <button
                        type="button"
                        onClick={() => setActiveView("dashboard-page")}
                        className={`${btnSecondary} w-full flex items-center justify-center gap-2`}
                      >
                        <LayoutDashboard size={16} />
                        Dashboard
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveView("new-trade")}
                        className={`${btnSecondary} w-full`}
                      >
                        + Trade Entry
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveView("new-account")}
                        className={`${btnGhost} w-full`}
                      >
                        + Add Account
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveView("new-strategy")}
                        className={`${btnGhost} w-full`}
                      >
                        + Add Strategy
                      </button>
                      <button type="button" className={`${btnGhost} w-full`}>
                        + Daily Review
                      </button>
                    </div>
                  </div>
                </div>

                <div className="w-full">
                  <CalendarPanel compact showExpand />
                </div>
              </div>

            <div className="rounded-3xl border border-surface-800 bg-surface-900/80 p-6 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-400">Trade Blotter</p>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">Recent Activity</h2>
                    {!tradesLoading && (
                      <span className="rounded-full border border-surface-600 bg-surface-800/80 px-2.5 py-0.5 text-xs text-slate-400">
                        Showing {recentActivityTrades.length} of {filteredTrades.length}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-200">
                  <div className="min-w-[130px]">
                    <Dropdown
                      value={recentLimit}
                      onChange={(v) => setRecentLimit(v)}
                      options={[
                        { value: "5", label: "5 entries" },
                        { value: "10", label: "10 entries" },
                        { value: "25", label: "25 entries" },
                        { value: "50", label: "50 entries" },
                        { value: "all", label: "All entries" },
                      ]}
                      placeholder="Entries"
                      className="!max-w-none !px-3 !py-2 text-xs"
                    />
                  </div>
                  <div className="min-w-[150px]">
                    <Dropdown
                      value={assetFilter}
                      onChange={(v) => setAssetFilter(v)}
                      options={[
                        { value: "All", label: "All Assets" },
                        ...availableAssets.map((asset) => ({
                          value: asset,
                          label: asset,
                        })),
                      ]}
                      disabled={filtersLoading}
                      placeholder="All Assets"
                      className="!max-w-none !px-3 !py-2 text-xs"
                    />
                  </div>
                  <div className="min-w-[150px]">
                    <Dropdown
                      value={sessionFilter}
                      onChange={(v) => setSessionFilter(v)}
                      options={[
                        { value: "All", label: "All Sessions" },
                        ...availableSessions.map((session) => ({
                          value: session,
                          label: session,
                        })),
                      ]}
                      disabled={filtersLoading}
                      placeholder="All Sessions"
                      className="!max-w-none !px-3 !py-2 text-xs"
                    />
                  </div>
                  <div className="min-w-[170px]">
                    <Dropdown
                      value={strategyFilter}
                      onChange={(v) => setStrategyFilter(v)}
                      options={[
                        { value: "All", label: "All Strategies" },
                        ...strategies.map((strategy) => ({
                          value: strategy.strategy_name,
                          label: strategy.strategy_name,
                        })),
                      ]}
                      disabled={filtersLoading}
                      placeholder="All Strategies"
                      className="!max-w-none !px-3 !py-2 text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteAllConfirmStep(1)}
                    disabled={deletingAll || trades.length === 0}
                    className="rounded-2xl border border-rose-500/60 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete all trade entries"
                  >
                    Delete all entries
                  </button>
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-surface-700">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-800/80 text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Trade</th>
                      <th className="px-4 py-3">Asset</th>
                      <th className="px-4 py-3">Session</th>
                      <th className="px-4 py-3">Strategy</th>
                      <th className="px-4 py-3 text-right">R:R</th>
                      <th className="px-4 py-3 text-right">PnL</th>
                      <th className="w-10 px-4 py-3" aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {tradesLoading ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                          Loading trades…
                        </td>
                      </tr>
                    ) : filteredTrades.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                          No trades yet. Add one with <strong className="text-slate-300">New Trade</strong> or check filters.
                        </td>
                      </tr>
                    ) : (
                    recentActivityTrades.map((trade) => (
                      <tr
                        key={trade.trade_id}
                        className="border-t border-surface-800 text-slate-200 transition hover:bg-surface-800/60"
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold">{trade.trade_id}</div>
                          <div className="text-xs text-slate-400">
                            {trade.start_datetime}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold">{trade.asset}</div>
                          <div className="text-xs text-slate-400">
                            {trade.direction} · {trade.timeframe}
                          </div>
                        </td>
                        <td className="px-4 py-3">{trade.session}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold">{trade.strategy}</div>
                          <div className="text-xs text-slate-400">
                            {trade.trade_type}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {trade.actual_risk_reward.toFixed(3)}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-semibold ${
                            trade.pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {trade.pnl >= 0 ? "+" : ""}
                          {trade.pnl.toFixed(3)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmTradeId(trade.trade_id)}
                            disabled={deletingId === trade.trade_id}
                            className="rounded-xl p-2 text-slate-400 transition hover:bg-surface-800 hover:text-rose-400 disabled:opacity-50"
                            title="Delete trade"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            </section>
          ) : activeView === "settings" ? (
            <section className="px-6 py-6">
              <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="rounded-3xl border border-surface-800 bg-surface-900/80 p-4 shadow-soft">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-3">
                    User
                  </p>
                  <nav className="space-y-1 text-sm">
                    <button
                      type="button"
                      onClick={() => setSettingsSection("themes")}
                      className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left transition ${
                        settingsSection === "themes"
                          ? "bg-surface-800 text-white"
                          : "text-slate-300 hover:bg-surface-800/70"
                      }`}
                    >
                      <span>Themes</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettingsSection("settings")}
                      className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left transition ${
                        settingsSection === "settings"
                          ? "bg-surface-800 text-white"
                          : "text-slate-300 hover:bg-surface-800/70"
                      }`}
                    >
                      <span>Settings</span>
                    </button>
                  </nav>
                </div>
                <div className="rounded-3xl border border-surface-800 bg-surface-900/80 p-6 shadow-soft">
                  {settingsSection === "themes" ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-4 border-b border-surface-800 pb-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                            Appearance
                          </p>
                          <h2 className="text-lg font-semibold">
                            Themes
                          </h2>
                          <p className="mt-1 text-sm text-slate-400">
                            Choose a color theme for your trading journal.
                          </p>
                        </div>
                      </div>
                      <div className="max-w-sm space-y-3">
                        <label className="flex flex-col gap-2 text-sm">
                          <span className="text-slate-200">Theme</span>
                          <div className="min-w-[200px]">
                            <Dropdown
                              value={theme}
                              onChange={(v) => setTheme(v)}
                              options={themeOptions}
                              placeholder="Select theme"
                              className="!max-w-none !px-2 !py-1.5 text-sm"
                            />
                          </div>
                          <span className="text-[11px] text-slate-500">
                            Theme is saved to this browser and applied across the app.
                          </span>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-4 border-b border-surface-800 pb-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                            Preferences
                          </p>
                          <h2 className="text-lg font-semibold">
                            Settings
                          </h2>
                          <p className="mt-1 text-sm text-slate-400">
                            Additional user preferences can be configured here in the future.
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-400">
                        Settings panel is a placeholder for now. Your data and layouts continue
                        to work as before.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          ) : activeView === "dashboard-page" ? (
            <section className="space-y-6 px-6 py-6">
              <div className="rounded-3xl border border-surface-800 bg-surface-900/80 p-6 shadow-soft">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="min-w-[170px]">
                      <Dropdown
                        value={accountDashboard}
                        onChange={(v) => setAccountDashboard(v)}
                        options={[
                          { value: "all", label: "All Accounts" },
                          ...accounts.map((account) => ({
                            value: account.account_name,
                            label: account.account_name,
                          })),
                        ]}
                        disabled={filtersLoading}
                        placeholder="All Accounts"
                        className="!max-w-none !px-2 !py-1.5 text-[11px]"
                      />
                    </div>
                    <div className="min-w-[170px]">
                      <Dropdown
                        value={strategyDashboard}
                        onChange={(v) => setStrategyDashboard(v)}
                        options={[
                          { value: "all", label: "All Strategies" },
                          ...strategies.map((strategy) => ({
                            value: strategy.strategy_name,
                            label: strategy.strategy_name,
                          })),
                        ]}
                        disabled={filtersLoading}
                        placeholder="All Strategies"
                        className="!max-w-none !px-2 !py-1.5 text-[11px]"
                      />
                    </div>
                    <div className="min-w-[150px]">
                      <Dropdown
                        value={dateRangeDashboard}
                        onChange={(v) => setDateRangeDashboard(v)}
                        options={dateRangeOptions}
                        placeholder="Date range"
                        className="!max-w-none !px-2 !py-1.5 text-[11px]"
                      />
                    </div>
                    {dateRangeDashboard === "Custom" && (
                      <>
                        <input
                          type="date"
                          value={customDateFromDashboard}
                          onChange={(e) => setCustomDateFromDashboard(e.target.value)}
                          className="rounded-xl border border-surface-700/60 bg-surface-900/70 px-2 py-1.5 text-[11px] text-white focus:outline-none"
                          title="From date"
                        />
                        <span className="text-slate-500">to</span>
                        <input
                          type="date"
                          value={customDateToDashboard}
                          onChange={(e) => setCustomDateToDashboard(e.target.value)}
                          className="rounded-xl border border-surface-700/60 bg-surface-900/70 px-2 py-1.5 text-[11px] text-white focus:outline-none"
                          title="To date"
                        />
                      </>
                    )}
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
                {dashboardChartVisibility.equityCurve && (
                <div className="rounded-3xl border border-surface-800 bg-surface-900/80 p-6 shadow-soft">
                  <p className="text-sm text-slate-400">PnL Over Time</p>
                  <h2 className="text-lg font-semibold">Equity Curve</h2>
                  <div className="mt-6 h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={equitySeriesDashboard}>
                        <XAxis
                          dataKey="time"
                          type="number"
                          scale="time"
                          domain={["dataMin", "dataMax"]}
                          tick={{ fill: "#94A3B8", fontSize: 11 }}
                          tickFormatter={(value) => {
                            const d = new Date(value);
                            return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
                          }}
                        />
                        <YAxis
                          tick={{ fill: "#94A3B8", fontSize: 11 }}
                          tickFormatter={(value) => formatNumber(Number(value))}
                        />
                        <Tooltip
                          cursor={false}
                          labelFormatter={(value) => {
                            const d = new Date(value);
                            return isNaN(d.getTime()) ? value : d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
                          }}
                          formatter={(value) => formatNumber(Number(value))}
                          contentStyle={{
                            background: "#0f172a",
                            border: "1px solid #1e293b",
                            borderRadius: "12px",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="equity"
                          stroke="#6366F1"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                )}

                {dashboardChartVisibility.tradeOutcomes && (
                <div className="rounded-3xl border border-surface-800 bg-surface-900/80 p-6 shadow-soft">
                  <p className="text-sm text-slate-400">Win/Loss Breakdown</p>
                  <h2 className="text-lg font-semibold">Trade Outcomes</h2>
                  <div className="mt-6 h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={winLossDataDashboard}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={4}
                        >
                          {winLossDataDashboard.map((_, index) => (
                            <Cell key={index} fill={pieColors[index]} />
                          ))}
                        </Pie>
                        <Tooltip
                          cursor={false}
                          formatter={(value, name, props) => {
                            const data = props.payload as { profit?: number };
                            const count = formatNumber(Number(value));
                            const profit = data.profit !== undefined ? formatNumber(data.profit) : "0.000";
                            const profitSign = data.profit !== undefined && data.profit >= 0 ? "+" : "";
                            return `${count} (Profit: ${profitSign}${profit})`;
                          }}
                          labelFormatter={(name) => name}
                          contentStyle={{
                            background: "#0f172a",
                            border: "1px solid #1e293b",
                            borderRadius: "12px",
                            color: "#ffffff",
                          }}
                          itemStyle={{ color: "#ffffff" }}
                          labelStyle={{ color: "#ffffff" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-6 space-y-2 text-sm text-slate-300">
                    <div className="flex items-center justify-between">
                      <span>Best Strategy</span>
                      <span className="font-semibold">{outcomeMetricsDashboard.bestStrategy}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Profit Factor</span>
                      <span
                        className={`font-semibold ${
                          outcomeMetricsDashboard.profitFactor != null &&
                          outcomeMetricsDashboard.profitFactor > 1
                            ? "text-emerald-400"
                            : ""
                        }`}
                      >
                        {outcomeMetricsDashboard.profitFactor == null
                          ? "—"
                          : outcomeMetricsDashboard.profitFactor === Infinity
                            ? "∞"
                            : outcomeMetricsDashboard.profitFactor.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Expectancy</span>
                      <span
                        className={`font-semibold ${
                          outcomeMetricsDashboard.expectancy != null
                            ? outcomeMetricsDashboard.expectancy >= 0
                              ? "text-emerald-400"
                              : "text-red-400"
                            : ""
                        }`}
                      >
                        {outcomeMetricsDashboard.expectancy != null
                          ? `$${outcomeMetricsDashboard.expectancy.toFixed(2)}`
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>
                )}
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
                {dashboardChartVisibility.sessionPerformance && (
                <div className="rounded-3xl border border-surface-800 bg-surface-900/80 p-6 shadow-soft">
                  <p className="text-sm text-slate-400">Session Performance</p>
                  <h2 className="text-lg font-semibold">Trades by Session</h2>
                  <div className="mt-5 h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sessionDataDashboard}>
                        <XAxis dataKey="name" tick={{ fill: "#94A3B8", fontSize: 11 }} />
                        <YAxis
                          tick={{ fill: "#94A3B8", fontSize: 11 }}
                          tickFormatter={(value) => formatInteger(Number(value))}
                        />
                        <Tooltip
                          cursor={false}
                          formatter={(value) => formatInteger(Number(value))}
                          contentStyle={{
                            background: "#0f172a",
                            border: "1px solid #1e293b",
                            borderRadius: "12px",
                          }}
                        />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#6366F1" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                )}

                {dashboardChartVisibility.setupQuality && (
                <div className="rounded-3xl border border-surface-800 bg-surface-900/80 p-6 shadow-soft">
                  <p className="text-sm text-slate-400">Risk vs Reward</p>
                  <h2 className="text-lg font-semibold">Setup Quality</h2>
                  <div className="mt-5 h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={setupQualityTradesDashboard}>
                        <XAxis
                          dataKey="trade_id"
                          tick={{ fill: "#94A3B8", fontSize: 10 }}
                          tickFormatter={(value) => {
                            const m = String(value).match(/trd-(\d+)/i);
                            return m ? m[1] : value;
                          }}
                        />
                        <YAxis
                          tick={{ fill: "#94A3B8", fontSize: 11 }}
                          tickFormatter={(value) => formatNumber(Number(value))}
                        />
                        <Tooltip
                          cursor={false}
                          formatter={(value) => formatNumber(Number(value))}
                          contentStyle={{
                            background: "#0f172a",
                            border: "1px solid #1e293b",
                            borderRadius: "12px",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="actual_risk_reward"
                          name="Actual RR"
                          stroke="#22C55E"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="expected_risk_reward"
                          name="Expected RR"
                          stroke="#F59E0B"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-5 flex items-center justify-between rounded-2xl border border-surface-700 bg-surface-800/70 px-4 py-3 text-xs text-slate-300">
                    <span>Top Setups</span>
                    <span className="font-semibold text-white">
                      {topSetupsLabelDashboard}
                    </span>
                  </div>
                </div>
                )}
              </div>
            </section>
          ) : activeView === "dashboard-settings" ? (
            <section className="px-6 py-6">
              <div className="rounded-3xl border border-surface-800 bg-surface-900/80 p-6 shadow-soft">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-2">
                  Dashboard
                </p>
                <h2 className="text-lg font-semibold text-white mb-4">Visible charts</h2>
                <p className="text-sm text-slate-400 mb-6">
                  Choose which charts to show on the Dashboard page. Only selected charts will be visible.
                </p>
                <ul className="space-y-3">
                  {[
                    { id: "equityCurve" as const, label: "Equity Curve" },
                    { id: "tradeOutcomes" as const, label: "Trade Outcomes" },
                    { id: "sessionPerformance" as const, label: "Trades by Session" },
                    { id: "setupQuality" as const, label: "Setup Quality" },
                  ].map(({ id, label }) => (
                    <li key={id} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id={`chart-${id}`}
                        checked={dashboardChartVisibility[id]}
                        onChange={() =>
                          setDashboardChartVisibility((prev) => ({
                            ...prev,
                            [id]: !prev[id],
                          }))
                        }
                        className="h-4 w-4 rounded border-surface-600 bg-surface-800 text-accent-500 focus:ring-accent-500/50"
                      />
                      <label htmlFor={`chart-${id}`} className="text-sm text-slate-200 cursor-pointer select-none">
                        {label}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : activeView === "new-account" ? (
            <section className="px-6 py-6">
              <div className="rounded-3xl border border-surface-700 bg-surface-900/80 p-6 shadow-soft">
                <form onSubmit={handleAccountSubmit} className="space-y-8">
                  {submitError && (
                    <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                      {submitError}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-surface-800 pb-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                        New Account
                      </p>
                      <div />
                    </div>
                    <div className="flex items-center gap-3">
                      <button type="submit" className={btnPrimary}>
                        Save Account
                      </button>
                    </div>
                  </div>

                  <div className="trade-form-grid grid gap-x-8 gap-y-10 md:grid-cols-2">
                    <label className="trade-form-field flex flex-col gap-2 text-sm">
                      Account Name
                      <input
                        value={accountForm.account_name}
                        onChange={(event) =>
                          setAccountForm((prev) => ({
                            ...prev,
                            account_name: event.target.value,
                          }))
                        }
                        placeholder="e.g. Trading view"
                        className={inputWide}
                        required
                      />
                    </label>
                    <label className="trade-form-field flex flex-col gap-2 text-sm">
                      Account Type
                      <div className="min-w-[160px]">
                        <Dropdown
                          value={accountForm.account_type}
                          onChange={(v) =>
                            setAccountForm((prev) => ({
                              ...prev,
                              account_type: v,
                            }))
                          }
                          options={[
                            { value: "Demo", label: "Demo" },
                            { value: "Personal", label: "Personal" },
                            { value: "Funded", label: "Funded" },
                          ]}
                          placeholder="Select type"
                        />
                      </div>
                      <span className="mt-1 text-[11px] text-slate-500">
                        Name will be saved with suffix: Demo &quot;-D&quot;, Personal &quot;-P&quot;, Funded &quot;-F&quot;
                      </span>
                    </label>
                    <label className="trade-form-field flex flex-col gap-2 text-sm">
                      Initial Balance
                      <input
                        value={accountForm.initial_balance}
                        onChange={(event) =>
                          setAccountForm((prev) => ({
                            ...prev,
                            initial_balance: event.target.value,
                          }))
                        }
                        type="number"
                        step="0.001"
                        className={inputBase}
                        placeholder="0.000"
                      />
                    </label>
                  </div>

                  <div className="trade-form-grid grid gap-x-8 gap-y-10 md:grid-cols-2">
                    <div className="trade-form-field flex flex-col gap-2 text-sm">
                      <p className="text-sm">Account Features</p>
                      <div className="space-y-3">
                        {accountFields.map((field, index) => (
                          <div key={`${field.key}-${index}`} className="flex items-center gap-3">
                            <input
                              value={field.key}
                              onChange={(event) =>
                                updateAccountField(index, "key", event.target.value)
                              }
                              placeholder="Feature"
                              className={inputBase}
                            />
                            <input
                              value={field.value}
                              onChange={(event) =>
                                updateAccountField(index, "value", event.target.value)
                              }
                              placeholder="Value"
                              className={inputWide}
                            />
                            {accountFields.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeAccountField(index)}
                                className="text-xs text-rose-400"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <div
                        ref={accountFeatureRef}
                        className="mt-3 inline-flex w-fit flex-col gap-2 text-xs text-slate-200"
                      >
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (accountFeatureOpen) {
                                setAccountFeatureOpen(false);
                                setAccountFeatureMode("none");
                              } else {
                                setAccountFeatureOpen(true);
                                setAccountFeatureMode("none");
                              }
                            }}
                            className="rounded-full bg-cyan-500 px-3 py-1 text-[10px] font-semibold text-slate-900 shadow-sm hover:bg-cyan-400"
                          >
                            Manage features
                          </button>
                          {accountFeatureOpen && (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setAccountFeatureMode("add")}
                                className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                                  accountFeatureMode === "add"
                                    ? "bg-emerald-500 text-white"
                                    : "bg-surface-900/80 text-slate-200"
                                }`}
                              >
                                Add
                              </button>
                              <button
                                type="button"
                                onClick={() => setAccountFeatureMode("delete")}
                                className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                                  accountFeatureMode === "delete"
                                    ? "bg-rose-500 text-white"
                                    : "bg-surface-900/80 text-slate-200"
                                }`}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                        {accountFeatureOpen && accountFeatureMode === "add" && (
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              value={newAccountFeature}
                              onChange={(e) => setNewAccountFeature(e.target.value)}
                              placeholder="New feature"
                              className={`${inputBase} !bg-white !text-slate-900 placeholder:!text-slate-500 max-w-[260px]`}
                            />
                            <button
                              type="button"
                              className="rounded-2xl bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-accent-400/40"
                              onClick={() => {
                                const key = newAccountFeature.trim();
                                if (!key) return;
                                if (!accountFeatureKeys.includes(key)) {
                                  setAccountFeatureKeys((prev) => [...prev, key]);
                                }
                                setAccountFields((prev) => [...prev, { key, value: "" }]);
                                setNewAccountFeature("");
                              }}
                            >
                              Add
                            </button>
                          </div>
                        )}
                        {accountFeatureOpen && accountFeatureMode === "delete" && (
                          <div className="mt-2 inline-block max-w-xs rounded-2xl border border-surface-700 bg-white px-1.5 py-1 text-slate-900 shadow-soft">
                            {accountFeatureKeys.length === 0 ? (
                              <p className="px-3 py-1 text-[11px] text-slate-500">
                                No features to delete.
                              </p>
                            ) : (
                              <div className="max-h-48 space-y-1 overflow-auto">
                                {accountFeatureKeys.map((key) => (
                                  <div
                                    key={key}
                                    className="flex items-center justify-between gap-2 rounded-xl px-3 py-1.5 text-xs hover:bg-slate-100"
                                  >
                                    <span>{key}</span>
                                    <button
                                      type="button"
                                      className="ml-1 text-rose-400 hover:text-rose-500"
                                      onClick={() => {
                                        if (
                                          window.confirm(
                                            `Delete feature "${key}" from future account entries? Existing data will remain.`
                                          )
                                        ) {
                                          setAccountFeatureKeys((prev) =>
                                            prev.filter((k) => k !== key)
                                          );
                                          setAccountFields((prev) =>
                                            prev.filter((f) => f.key !== key)
                                          );
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </section>
          ) : activeView === "new-strategy" ? (
            <section className="px-6 py-6">
              <div className="rounded-3xl border border-surface-700 bg-surface-900/80 p-6 shadow-soft">
                <form onSubmit={handleStrategySubmit} className="space-y-8">
                  {submitError && (
                    <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                      {submitError}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-surface-800 pb-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                        New Strategy
                      </p>
                      <div />
                    </div>
                    <div className="flex items-center gap-3">
                      <button type="submit" className={btnPrimary}>
                        Save Strategy
                      </button>
                    </div>
                  </div>

                  <div className="trade-form-grid grid gap-x-8 gap-y-10 md:grid-cols-2">
                    <label className="trade-form-field flex flex-col gap-2 text-sm">
                      Strategy Name
                      <input
                        value={strategyForm.strategy_name}
                        onChange={(event) =>
                          setStrategyForm((prev) => ({
                            ...prev,
                            strategy_name: event.target.value,
                          }))
                        }
                        placeholder="9-15 ema"
                        className={inputWide}
                        required
                      />
                    </label>
                    <label className="trade-form-field flex flex-col gap-2 text-sm">
                      Notes
                      <textarea
                        value={strategyForm.strategy_notes}
                        onChange={(event) =>
                          setStrategyForm((prev) => ({
                            ...prev,
                            strategy_notes: event.target.value,
                          }))
                        }
                        rows={3}
                        className={textAreaBase}
                      />
                    </label>
                  </div>

                  <div className="trade-form-grid grid gap-x-8 gap-y-10 md:grid-cols-2">
                    <div className="trade-form-field flex flex-col gap-2 text-sm">
                      <p className="text-sm">Strategy Features</p>
                      <div className="space-y-3">
                        {strategyFields.map((field, index) => (
                          <div key={`${field.key}-${index}`} className="flex items-center gap-3">
                            <input
                              value={field.key}
                              onChange={(event) =>
                                updateStrategyField(index, "key", event.target.value)
                              }
                              placeholder="Feature"
                              className={inputBase}
                            />
                            <input
                              value={field.value}
                              onChange={(event) =>
                                updateStrategyField(index, "value", event.target.value)
                              }
                              placeholder="Value"
                              className={inputWide}
                            />
                            {strategyFields.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeStrategyField(index)}
                                className="text-xs text-rose-400"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <div
                        ref={strategyFeatureRef}
                        className="mt-3 inline-flex w-fit flex-col gap-2 text-xs text-slate-200"
                      >
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (strategyFeatureOpen) {
                                setStrategyFeatureOpen(false);
                                setStrategyFeatureMode("none");
                              } else {
                                setStrategyFeatureOpen(true);
                                setStrategyFeatureMode("none");
                              }
                            }}
                            className="rounded-full bg-cyan-500 px-3 py-1 text-[10px] font-semibold text-slate-900 shadow-sm hover:bg-cyan-400"
                          >
                            Manage features
                          </button>
                          {strategyFeatureOpen && (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setStrategyFeatureMode("add")}
                                className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                                  strategyFeatureMode === "add"
                                    ? "bg-emerald-500 text-white"
                                    : "bg-surface-900/80 text-slate-200"
                                }`}
                              >
                                Add
                              </button>
                              <button
                                type="button"
                                onClick={() => setStrategyFeatureMode("delete")}
                                className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                                  strategyFeatureMode === "delete"
                                    ? "bg-rose-500 text-white"
                                    : "bg-surface-900/80 text-slate-200"
                                }`}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                        {strategyFeatureOpen && strategyFeatureMode === "add" && (
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              value={newStrategyFeature}
                              onChange={(e) => setNewStrategyFeature(e.target.value)}
                              placeholder="New feature"
                              className={`${inputBase} !bg-white !text-slate-900 placeholder:!text-slate-500 max-w-[260px]`}
                            />
                            <button
                              type="button"
                              className="rounded-2xl bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-accent-400/40"
                              onClick={() => {
                                const key = newStrategyFeature.trim();
                                if (!key) return;
                                if (!strategyFeatureKeys.includes(key)) {
                                  setStrategyFeatureKeys((prev) => [...prev, key]);
                                }
                                setStrategyFields((prev) => [...prev, { key, value: "" }]);
                                setNewStrategyFeature("");
                              }}
                            >
                              Add
                            </button>
                          </div>
                        )}
                        {strategyFeatureOpen && strategyFeatureMode === "delete" && (
                          <div className="mt-2 inline-block max-w-xs rounded-2xl border border-surface-700 bg-white px-1.5 py-1 text-slate-900 shadow-soft">
                            {strategyFeatureKeys.length === 0 ? (
                              <p className="px-3 py-1 text-[11px] text-slate-500">
                                No features to delete.
                              </p>
                            ) : (
                              <div className="max-h-48 space-y-1 overflow-auto">
                                {strategyFeatureKeys.map((key) => (
                                  <div
                                    key={key}
                                    className="flex items-center justify-between gap-2 rounded-xl px-3 py-1.5 text-xs hover:bg-slate-100"
                                  >
                                    <span>{key}</span>
                                    <button
                                      type="button"
                                      className="ml-1 text-rose-400 hover:text-rose-500"
                                      onClick={() => {
                                        if (
                                          window.confirm(
                                            `Delete feature "${key}" from future strategy entries? Existing data will remain.`
                                          )
                                        ) {
                                          setStrategyFeatureKeys((prev) =>
                                            prev.filter((k) => k !== key)
                                          );
                                          setStrategyFields((prev) =>
                                            prev.filter((f) => f.key !== key)
                                          );
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </section>
          ) : (
            <section className="px-6 py-6">
              <div className="rounded-3xl border border-surface-700 bg-surface-900/80 p-6 shadow-soft">
                <form onSubmit={handleTradeSubmit} className="space-y-8">
                  {submitError && (
                    <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                      {submitError}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-surface-800 pb-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                        New Trade
                      </p>
                      <div />
                    </div>
                    <div className="flex items-center gap-3">
                      <button type="submit" className={btnPrimary}>
                        Save Trade
                      </button>
                    </div>
                  </div>

                  <div className="trade-form-grid grid gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
                    <label className="trade-form-field flex flex-col gap-2 text-sm">
                      Trade ID
                      <input
                        name="trade_id"
                        value={formState.trade_id ? formState.trade_id.toUpperCase() : ""}
                        readOnly
                        placeholder="Auto (e.g. TRD-1)"
                        className={`${inputBase} cursor-default opacity-90`}
                        title="Assigned automatically when you save"
                      />
                    </label>
                    <label className="trade-form-field flex flex-col gap-2 text-sm">
                      {requiredLabel("Start Date/Time")}
                      <input
                        name="start_datetime"
                        value={formState.start_datetime}
                        onChange={handleFieldChange}
                        type="datetime-local"
                        required
                        className={inputBase}
                      />
                    </label>
                    <label className="trade-form-field flex flex-col gap-2 text-sm">
                      End Date/Time
                      <input
                        name="end_datetime"
                        value={formState.end_datetime}
                        onChange={handleFieldChange}
                        type="datetime-local"
                        className={inputBase}
                      />
                    </label>
                    <label className="trade-form-field flex flex-col gap-2 text-sm">
                      Account
                      <div className="min-w-[200px]">
                        <Dropdown
                          value={formState.account}
                          onChange={(v) =>
                            setFormState((prev) => ({ ...prev, account: v }))
                          }
                          options={[
                            { value: "", label: "Select account" },
                            ...accounts.map((account) => ({
                              value: account.account_name,
                              label: account.account_name,
                            })),
                          ]}
                          placeholder="Select account"
                        />
                      </div>
                    </label>
                    <label className="trade-form-field flex flex-col gap-2 text-sm">
                      Balance Before Trade
                      <input
                        name="balance_before_trade"
                        value={formState.balance_before_trade}
                        onChange={handleFieldChange}
                        type="number"
                        step="0.01"
                        className={inputBase}
                      />
                    </label>
                    <label className="trade-form-field flex flex-col gap-2 text-sm">
                      Balance After Trade
                      <input
                        name="balance_after_trade"
                        value={formState.balance_after_trade}
                        onChange={handleFieldChange}
                        type="number"
                        step="0.01"
                        className={inputBase}
                      />
                    </label>
                    <label className="trade-form-field flex flex-col gap-2 text-sm">
                      Strategy
                      <div className="min-w-[200px]">
                        <Dropdown
                          value={formState.strategy}
                          onChange={(v) =>
                            setFormState((prev) => ({ ...prev, strategy: v }))
                          }
                          options={[
                            { value: "", label: "Select strategy" },
                            ...strategies.map((strategy) => ({
                              value: strategy.strategy_name,
                              label: strategy.strategy_name,
                            })),
                          ]}
                          placeholder="Select strategy"
                        />
                      </div>
                    </label>
                    <label className="trade-form-field flex flex-col gap-2 text-sm">
                      {requiredLabel("Session")}
                      <div className="min-w-[160px]">
                        <Dropdown
                          value={formState.session}
                          onChange={(v) =>
                            setFormState((prev) => ({ ...prev, session: v }))
                          }
                          options={[
                            { value: "London", label: "London" },
                            { value: "New York", label: "New York" },
                            { value: "Asia", label: "Asia" },
                          ]}
                          placeholder="Select session"
                        />
                      </div>
                    </label>
                    <label className="trade-form-field flex flex-col gap-2 text-sm">
                      {requiredLabel("Asset")}
                      <div ref={assetDropdownRef} className="relative">
                        <button
                          type="button"
                          onClick={() => setAssetDropdownOpen((open) => !open)}
                          className={`${inputWide} flex items-center justify-between text-left`}
                        >
                          <span className={formState.asset ? "" : "text-white/60"}>
                            {formState.asset || "Select asset"}
                          </span>
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        </button>
                        {assetDropdownOpen && (
                          <div className="absolute z-20 mt-1 w-full rounded-2xl border border-surface-700 bg-white text-slate-900 py-1 text-sm shadow-soft">
                            {assetOptions.map((asset) => (
                              <div
                                key={asset}
                                className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-100"
                              >
                                <button
                                  type="button"
                                  className="flex-1 text-left"
                                  onClick={() => {
                                    setFormState((prev) => ({ ...prev, asset }));
                                    setAssetDropdownOpen(false);
                                  }}
                                >
                                  {asset}
                                </button>
                                <button
                                  type="button"
                                  className="ml-2 text-xs text-rose-400 hover:text-rose-300"
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        `Remove asset "${asset}" from the list? This won't change existing trades.`
                                      )
                                    ) {
                                      setAssetOptions((prev) =>
                                        prev.filter((item) => item !== asset)
                                      );
                                      if (formState.asset === asset) {
                                        setFormState((prev) => ({ ...prev, asset: "" }));
                                      }
                                    }
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                            <div className="mt-1 border-t border-surface-800 px-3 py-2">
                              <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                  <input
                                    value={newAssetName}
                                    onChange={(event) => setNewAssetName(event.target.value)}
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-400/30"
                                  />
                                  {!newAssetName && (
                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-600">
                                      Add asset...
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  className="rounded-2xl bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-accent-400/40"
                                  onClick={() => {
                                    const raw = newAssetName.trim();
                                    if (!raw) return;
                                    const asset = raw.toUpperCase();
                                    setAssetOptions((prev) =>
                                      prev.includes(asset) ? prev : [...prev, asset]
                                    );
                                    setFormState((prev) => ({ ...prev, asset }));
                                    setNewAssetName("");
                                    setAssetDropdownOpen(false);
                                  }}
                                >
                                  Add
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </label>
                    <label className="trade-form-field flex flex-col gap-2 text-sm">
                      {requiredLabel("Trade Type")}
                      <div ref={tradeTypeDropdownRef} className="relative min-w-[180px]">
                        <button
                          type="button"
                          onClick={() =>
                            setTradeTypeDropdownOpen((open) => !open)
                          }
                          className={`${inputBase} flex items-center justify-between text-left !max-w-none`}
                        >
                          <span
                            className={
                              formState.trade_type ? "" : "text-white/60"
                            }
                          >
                            {formState.trade_type || "Select type"}
                          </span>
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        </button>
                        {tradeTypeDropdownOpen && (
                          <div className="absolute z-20 mt-1 w-full rounded-2xl border border-surface-700 bg-white text-slate-900 py-1 text-sm shadow-soft">
                            {tradeTypeOptions.map((type) => (
                              <div
                                key={type}
                                className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-100"
                              >
                                <button
                                  type="button"
                                  className="flex-1 text-left"
                                  onClick={() => {
                                    setFormState((prev) => ({
                                      ...prev,
                                      trade_type: type,
                                    }));
                                    setTradeTypeDropdownOpen(false);
                                  }}
                                >
                                  {type}
                                </button>
                                <button
                                  type="button"
                                  className="ml-2 text-xs text-rose-400 hover:text-rose-300"
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        `Remove trade type "${type}" from the list? This won't change existing trades.`
                                      )
                                    ) {
                                      setTradeTypeOptions((prev) =>
                                        prev.filter((item) => item !== type)
                                      );
                                      if (formState.trade_type === type) {
                                        setFormState((prev) => ({
                                          ...prev,
                                          trade_type: "",
                                        }));
                                      }
                                    }
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                            <div className="mt-1 border-t border-surface-800 px-3 py-2">
                              <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                  <input
                                    value={newTradeTypeName}
                                    onChange={(event) =>
                                      setNewTradeTypeName(event.target.value)
                                    }
                                    className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-400/30"
                                  />
                                  {!newTradeTypeName && (
                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-600">
                                      Add trade type...
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  className="rounded-2xl bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-accent-400/40"
                                  onClick={() => {
                                    const raw = newTradeTypeName.trim();
                                    if (!raw) return;
                                    const type = raw;
                                    setTradeTypeOptions((prev) =>
                                      prev.includes(type) ? prev : [...prev, type]
                                    );
                                    setFormState((prev) => ({
                                      ...prev,
                                      trade_type: type,
                                    }));
                                    setNewTradeTypeName("");
                                    setTradeTypeDropdownOpen(false);
                                  }}
                                >
                                  Add
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </label>
                    <label className="trade-form-field flex flex-col gap-2 text-sm">
                      {requiredLabel("Direction")}
                      <div className="min-w-[160px]">
                        <Dropdown
                          value={formState.direction}
                          onChange={(v) =>
                            setFormState((prev) => ({ ...prev, direction: v }))
                          }
                          options={[
                            { value: "Long", label: "Long" },
                            { value: "Short", label: "Short" },
                          ]}
                          placeholder="Select direction"
                        />
                      </div>
                    </label>
                    <label className="trade-form-field flex flex-col gap-2 text-sm">
                      Lot Size
                      <input
                        name="lot_size"
                        value={formState.lot_size}
                        onChange={handleFieldChange}
                        type="number"
                        step="0.01"
                        className={inputBase}
                      />
                    </label>
                    <label className="trade-form-field flex flex-col gap-2 text-sm">
                      {requiredLabel("Timeframe")}
                      <input
                        name="timeframe"
                        value={formState.timeframe}
                        onChange={handleFieldChange}
                        placeholder="1m, 3m, 1H, 4H"
                        required
                        className={inputBase}
                      />
                    </label>
                    <label className="trade-form-field flex flex-col gap-2 text-sm">
                      Leverage
                      <input
                        name="leverage"
                        value={formState.leverage}
                        onChange={handleFieldChange}
                        type="number"
                        step="0.01"
                        className={inputBase}
                      />
                    </label>
                    <label className="trade-form-field flex flex-col gap-2 text-sm">
                      Trend Multi-Timeframe (JSON)
                      <textarea
                        name="trend_multi_timeframe"
                        value={formState.trend_multi_timeframe}
                        onChange={handleFieldChange}
                        placeholder='{"1m":"bullish","15m":"bearish"}'
                        rows={3}
                        className={textAreaBase}
                      />
                    </label>
                    <label className="trade-form-field flex flex-col gap-2 text-sm">
                      Amount Traded
                      <input
                        name="amount_traded"
                        value={formState.amount_traded}
                        onChange={handleFieldChange}
                        type="number"
                        step="0.01"
                        className={inputBase}
                      />
                    </label>
                    <label className="trade-form-field flex flex-col gap-2 text-sm">
                      Entry Candle Type
                      <input
                        name="entry_candle_type"
                        value={formState.entry_candle_type}
                        onChange={handleFieldChange}
                        placeholder="Marubozu, Hammer..."
                        className={inputWide}
                      />
                    </label>
                  </div>

                  <div className="trade-form-grid grid gap-x-8 gap-y-10 md:grid-cols-3">
                    <label className="trade-form-field flex flex-col gap-2 text-sm">
                      {requiredLabel("Entry Price")}
                      <input
                        name="entry_price"
                        value={formState.entry_price}
                        onChange={handleFieldChange}
                        type="number"
                        step="0.01"
                        required
                        className={inputBase}
                      />
                    </label>
                    <label className="trade-form-field flex flex-col gap-2 text-sm">
                      Exit Price
                      <input
                        name="exit_price"
                        value={formState.exit_price}
                        onChange={handleFieldChange}
                        type="number"
                        step="0.01"
                        className={inputBase}
                      />
                    </label>
                    <label className="trade-form-field flex flex-col gap-2 text-sm">
                      Risk %
                      <input
                        name="risk_percentage"
                        value={formState.risk_percentage}
                        onChange={handleFieldChange}
                        type="number"
                        step="0.01"
                        className={inputBase}
                      />
                    </label>
                    <label className="trade-form-field flex flex-col gap-2 text-sm">
                      Take Profit
                      <input
                        name="take_profit"
                        value={formState.take_profit}
                        onChange={handleFieldChange}
                        type="number"
                        step="0.01"
                        className={inputBase}
                      />
                    </label>
                    <label className="trade-form-field flex flex-col gap-2 text-sm">
                      Stop Loss
                      <input
                        name="stop_loss"
                        value={formState.stop_loss}
                        onChange={handleFieldChange}
                        type="number"
                        step="0.01"
                        className={inputBase}
                      />
                    </label>
                    <label className="trade-form-field flex flex-col gap-2 text-sm">
                      Trade Fees
                      <input
                        name="trade_fees"
                        value={formState.trade_fees}
                        onChange={handleFieldChange}
                        type="number"
                        step="0.01"
                        className={inputBase}
                      />
                    </label>
                    <label className="trade-form-field flex flex-col gap-2 text-sm">
                      Expected R:R
                      <input
                        name="expected_risk_reward"
                        value={formState.expected_risk_reward}
                        onChange={handleFieldChange}
                        type="number"
                        step="0.01"
                        className={inputBase}
                      />
                    </label>
                    <label className="trade-form-field flex flex-col gap-2 text-sm">
                      Actual R:R
                      <input
                        name="actual_risk_reward"
                        value={formState.actual_risk_reward}
                        onChange={handleFieldChange}
                        type="number"
                        step="0.01"
                        className={inputBase}
                      />
                    </label>
                    <label className="trade-form-field flex flex-col gap-2 text-sm">
                      PnL
                      <input
                        name="pnl"
                        value={formState.pnl}
                        onChange={handleFieldChange}
                        type="number"
                        step="0.01"
                        className={inputBase}
                      />
                    </label>
                  </div>

                  <div className="trade-form-grid grid gap-x-8 gap-y-6 md:grid-cols-1">
                    <div className="trade-form-field flex flex-col gap-3 text-sm">
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="flex min-w-[220px] flex-1 flex-col gap-2">
                          Tags (comma separated)
                          <input
                            name="tags"
                            value={formState.tags}
                            onChange={handleFieldChange}
                            placeholder="Momentum, A+ Setup"
                            className={inputWide}
                          />
                        </label>
                        <label className="flex flex-col gap-2">
                          Add to pool
                          <div className="flex items-center gap-2">
                            <input
                              value={newTag}
                              onChange={(event) => setNewTag(event.target.value)}
                              placeholder="New tag"
                              className={inputBase}
                            />
                            <button
                              type="button"
                              onClick={handleAddTag}
                              className={btnSecondary}
                            >
                              Add
                            </button>
                          </div>
                        </label>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {tagPool.length === 0 ? (
                          <span className="text-xs text-slate-500">
                            Tag pool is empty. Add your first tag.
                          </span>
                        ) : (
                          tagPool.map((tag) => (
                            <button
                              key={tag.name}
                              type="button"
                              onClick={() => addTagToField(tag.name)}
                              className="rounded-full px-3 py-1 text-xs text-white shadow-soft transition hover:brightness-110"
                              style={{ backgroundColor: tag.color }}
                            >
                              {tag.name}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="trade-form-grid grid gap-x-8 gap-y-10 md:grid-cols-2">
                    <label className="trade-form-field flex flex-col gap-2 text-sm">
                      Entry Reason
                      <textarea
                        name="entry_reason"
                        value={formState.entry_reason}
                        onChange={handleFieldChange}
                        rows={3}
                        className={textAreaBase}
                      />
                    </label>
                    <label className="trade-form-field flex flex-col gap-2 text-sm">
                      Exit Reason
                      <textarea
                        name="exit_reason"
                        value={formState.exit_reason}
                        onChange={handleFieldChange}
                        rows={3}
                        className={textAreaBase}
                      />
                    </label>
                    <label className="trade-form-field flex flex-col gap-2 text-sm md:col-span-2">
                      Notes
                      <textarea
                        name="notes"
                        value={formState.notes}
                        onChange={handleFieldChange}
                        rows={4}
                        className={textAreaBase}
                      />
                    </label>
                  </div>

                  <div className="trade-form-grid grid gap-x-8 gap-y-10 md:grid-cols-2">
                    <div className="flex items-center gap-4 pt-6 text-sm">
                      <label className="flex items-center gap-2">
                        <input
                          name="sl_moved_to_breakeven"
                          type="checkbox"
                          checked={formState.sl_moved_to_breakeven}
                          onChange={handleFieldChange}
                          className="h-4 w-4 rounded border-surface-700"
                        />
                        SL moved to breakeven
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          name="increased_lot_size"
                          type="checkbox"
                          checked={formState.increased_lot_size}
                          onChange={handleFieldChange}
                          className="h-4 w-4 rounded border-surface-700"
                        />
                        Increased lot size
                      </label>
                    </div>
                  </div>

                  <div className="trade-form-grid mt-6 grid gap-x-8 gap-y-10 md:grid-cols-2">
                    <div className="trade-form-field flex flex-col gap-2 text-sm">
                      <span>Upload Images</span>
                      <div className="flex flex-wrap items-center gap-3">
                        <label className={`${btnSecondary} cursor-pointer`}>
                          Choose Files
                          <input
                            type="file"
                            multiple
                            onChange={handleImagesChange}
                            className="hidden"
                          />
                        </label>
                        <span className="text-xs text-slate-400">
                          {formState.images.length
                            ? `${formState.images.length} file(s) selected`
                            : "No files selected"}
                        </span>
                      </div>
                      {formState.images.length > 0 && (
                        <div className="text-xs text-slate-400">
                          {formState.images.map((file) => file.name).join(", ")}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="trade-form-grid mt-6 grid gap-x-8 gap-y-10 md:grid-cols-2">
                    <div className="trade-form-field flex flex-col gap-2 text-sm">
                      <p className="text-sm">Trade Features</p>
                      <div className="space-y-3">
                        {customFields.map((field, index) => (
                          <div key={`${field.key}-${index}`} className="flex items-center gap-3">
                            <input
                              value={field.key}
                              onChange={(event) =>
                                updateCustomField(index, "key", event.target.value)
                              }
                              placeholder="Field"
                              className={inputBase}
                            />
                            <input
                              value={field.value}
                              onChange={(event) =>
                                updateCustomField(index, "value", event.target.value)
                              }
                              placeholder="Value"
                              className={inputWide}
                            />
                            {customFields.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeCustomField(index)}
                                className="text-xs text-rose-400"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <div
                        ref={tradeFeatureRef}
                        className="mt-3 inline-flex w-fit flex-col gap-2 text-xs text-slate-200"
                      >
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (tradeFeatureOpen) {
                                setTradeFeatureOpen(false);
                                setTradeFeatureMode("none");
                              } else {
                                setTradeFeatureOpen(true);
                                setTradeFeatureMode("none");
                              }
                            }}
                            className="rounded-full bg-cyan-500 px-3 py-1 text-[10px] font-semibold text-slate-900 shadow-sm hover:bg-cyan-400"
                          >
                            Manage features
                          </button>
                          {tradeFeatureOpen && (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setTradeFeatureMode("add")}
                                className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                                  tradeFeatureMode === "add"
                                    ? "bg-emerald-500 text-white"
                                    : "bg-surface-900/80 text-slate-200"
                                }`}
                              >
                                Add
                              </button>
                              <button
                                type="button"
                                onClick={() => setTradeFeatureMode("delete")}
                                className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                                  tradeFeatureMode === "delete"
                                    ? "bg-rose-500 text-white"
                                    : "bg-surface-900/80 text-slate-200"
                                }`}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                        {tradeFeatureOpen && tradeFeatureMode === "add" && (
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              value={newTradeFeature}
                              onChange={(e) => setNewTradeFeature(e.target.value)}
                              placeholder="New feature"
                              className={`${inputBase} !bg-white !text-slate-900 placeholder:!text-slate-500 max-w-[260px]`}
                            />
                            <button
                              type="button"
                              className="rounded-2xl bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-accent-400/40"
                              onClick={() => {
                                const key = newTradeFeature.trim();
                                if (!key) return;
                                if (!tradeFeatureKeys.includes(key)) {
                                  setTradeFeatureKeys((prev) => [...prev, key]);
                                }
                                setCustomFields((prev) => [...prev, { key, value: "" }]);
                                setNewTradeFeature("");
                              }}
                            >
                              Add
                            </button>
                          </div>
                        )}
                        {tradeFeatureOpen && tradeFeatureMode === "delete" && (
                          <div className="mt-2 inline-block max-w-xs rounded-2xl border border-surface-700 bg-white px-1.5 py-1 text-slate-900 shadow-soft">
                            {tradeFeatureKeys.length === 0 ? (
                              <p className="px-3 py-1 text-[11px] text-slate-500">
                                No features to delete.
                              </p>
                            ) : (
                              <div className="max-h-48 space-y-1 overflow-auto">
                                {tradeFeatureKeys.map((key) => (
                                  <div
                                    key={key}
                                    className="flex items-center justify-between gap-2 rounded-xl px-3 py-1.5 text-xs hover:bg-slate-100"
                                  >
                                    <span>{key}</span>
                                    <button
                                      type="button"
                                      className="ml-1 text-rose-400 hover:text-rose-500"
                                      onClick={() => {
                                        if (
                                          window.confirm(
                                            `Delete feature "${key}" from future trade entries? Existing data will remain.`
                                          )
                                        ) {
                                          setTradeFeatureKeys((prev) =>
                                            prev.filter((k) => k !== key)
                                          );
                                          setCustomFields((prev) =>
                                            prev.filter((f) => f.key !== key)
                                          );
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center pt-6">
                    <button type="submit" className={btnPrimary}>
                      Save Trade
                    </button>
                  </div>
                </form>
              </div>
            </section>
          )}
        </main>
        {calendarOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-surface-950/90 p-6 backdrop-blur"
            onClick={() => setCalendarOpen(false)}
          >
            <div
              className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-surface-700 bg-surface-900 p-6 shadow-soft"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    Calendar Overview
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-white">
                    Trading Calendar
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setCalendarOpen(false)}
                  className={btnGhost}
                >
                  Close
                </button>
              </div>
              <div className="mt-5">
                <CalendarPanel />
              </div>
            </div>
          </div>
        )}
        {deleteConfirmTradeId && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-surface-950/80 p-6 backdrop-blur"
            onClick={() => setDeleteConfirmTradeId(null)}
          >
            <div
              className="w-full max-w-sm rounded-3xl border border-surface-700 bg-surface-900 p-6 shadow-soft"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-sm text-slate-300">
                Are you sure you want to delete trade{" "}
                <strong className="text-white">{deleteConfirmTradeId}</strong>?
                This cannot be undone.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmTradeId(null)}
                  className={btnSecondary}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteTrade(deleteConfirmTradeId)}
                  className="rounded-2xl border border-rose-500/60 bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/30 focus:outline-none focus:ring-2 focus:ring-rose-400/40"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
        {deleteAllConfirmStep === 1 && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-surface-950/80 p-6 backdrop-blur"
            onClick={() => setDeleteAllConfirmStep(null)}
          >
            <div
              className="w-full max-w-sm rounded-3xl border border-surface-700 bg-surface-900 p-6 shadow-soft"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-sm text-slate-300">
                Are you sure you want to delete <strong className="text-white">all</strong> trade entries? This cannot be undone.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteAllConfirmStep(null)}
                  className={btnSecondary}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteAllConfirmStep(2)}
                  className="rounded-2xl border border-rose-500/60 bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/30 focus:outline-none focus:ring-2 focus:ring-rose-400/40"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}
        {deleteAllConfirmStep === 2 && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-surface-950/80 p-6 backdrop-blur"
            onClick={() => setDeleteAllConfirmStep(null)}
          >
            <div
              className="w-full max-w-sm rounded-3xl border border-surface-700 bg-surface-900 p-6 shadow-soft"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-sm text-slate-300">
                This will permanently remove every trade. Are you really sure?
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteAllConfirmStep(null)}
                  className={btnSecondary}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteAllTrades()}
                  disabled={deletingAll}
                  className="rounded-2xl border border-rose-500/60 bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/30 focus:outline-none focus:ring-2 focus:ring-rose-400/40 disabled:opacity-50"
                >
                  Delete all
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
