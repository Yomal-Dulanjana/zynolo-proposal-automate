// src/components/SalesAnalytics.tsx — Visual Reports & Sales Analytics (Powered by Recharts)
import React, { useState, useEffect, useCallback } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Trophy,
  PieChart as PieIcon,
  Users,
  Calendar,
  AlertCircle,
  Loader2,
  BarChart3,
  RotateCcw,
  Filter,
  AlertOctagon,
} from "lucide-react";

interface AnalyticsData {
  stats: {
    totalProposals: number;
    pipelineValue: number;
    wonTotalValue: number;
    wonBaseRevenue?: number;
    grossBillingWon?: number;
    overallTotalValue: number;
    avgDealValue: number;
    winRate: number;
    wonCount: number;
    activeCount: number;
    lostCount: number;
    draftCount: number;
    totalGrossProfitWon?: number;
    averageGrossMargin?: number;
  };
  monthlyTrend: Array<{
    month: string;
    proposed: number;
    proposedGross?: number;
    won: number;
    wonGross?: number;
    grossProfit?: number;
    lost: number;
    count: number;
  }>;
  conversionDonut: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  lossReasonBreakdown?: Array<{
    name: string;
    count: number;
    color: string;
  }>;
  volumeDistribution: Array<{
    name: string;
    count: number;
    totalValue: number;
    color: string;
  }>;
}

const DONUT_COLORS = ["#10b981", "#3b82f6", "#ef4444", "#f59e0b"];

export default function SalesAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Multi-Level Date Filter States
  const [period, setPeriod] = useState<"daily" | "monthly" | "yearly">("monthly");
  const [singleDate, setSingleDate] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const hasActiveFilters = Boolean(singleDate || fromDate || toDate || period !== "monthly");

  const fetchAnalytics = useCallback(async () => {
    try {
      setFetching(true);
      const params = new URLSearchParams();
      params.set("period", period);
      if (singleDate) params.set("date", singleDate);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);

      const res = await fetch(`/api/analytics?${params.toString()}`);
      const resData = await res.json();
      if (resData.success) {
        setData(resData);
        setError(null);
      } else {
        setError(resData.message || "Failed to load sales analytics.");
      }
    } catch {
      setError("Network error fetching analytics data.");
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, [period, singleDate, fromDate, toDate]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleResetFilters = () => {
    setPeriod("monthly");
    setSingleDate("");
    setFromDate("");
    setToDate("");
  };

  const formatLKR = (num: number) =>
    `Rs. ${(num || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatShortLKR = (num: number) => {
    if (num >= 1_000_000) return `Rs. ${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `Rs. ${(num / 1_000).toFixed(0)}k`;
    return `Rs. ${num}`;
  };

  if (loading) {
    return (
      <div className="py-28 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="animate-spin text-red-600 mb-3" size={36} />
        <p className="text-sm font-semibold">Generating visual analytics &amp; performance metrics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-white border border-rose-200 rounded-2xl text-center max-w-lg mx-auto">
        <AlertCircle size={36} className="mx-auto text-rose-600 mb-2" />
        <h3 className="text-base font-bold text-slate-800">Analytics Unavailable</h3>
        <p className="text-sm text-slate-500 mt-1">{error || "Unable to compute metrics."}</p>
        <button
          onClick={handleResetFilters}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700"
        >
          Reset Filters
        </button>
      </div>
    );
  }

  const { stats, monthlyTrend, conversionDonut, volumeDistribution } = data;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading font-semibold text-2xl text-slate-900 tracking-tight flex items-center gap-2.5">
            <TrendingUp className="text-red-600" size={26} />
            Sales Insights &amp; Commercial Analytics
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-sans">
            Executive performance dashboard tracking revenue run-rates, deal conversion ratios, and enterprise volume.
          </p>
        </div>

        {fetching && (
          <div className="flex items-center gap-2 text-xs font-heading font-medium text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl self-start md:self-auto">
            <Loader2 size={14} className="animate-spin" />
            <span>Updating metrics...</span>
          </div>
        )}
      </div>

      {/* Multi-Level Interactive Date Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4.5 shadow-sm space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* 1. Pre-set Period Selector (Daily / Monthly / Yearly) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-heading font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-1">
              <Filter size={14} className="text-red-600" />
              Interval:
            </span>
            <div className="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-heading font-medium">
              <button
                type="button"
                onClick={() => setPeriod("daily")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  period === "daily"
                    ? "bg-white text-slate-900 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => setPeriod("monthly")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  period === "monthly"
                    ? "bg-white text-slate-900 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setPeriod("yearly")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  period === "yearly"
                    ? "bg-white text-slate-900 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Yearly
              </button>
            </div>
          </div>

          {/* 2. Custom Date & Date Range Pickers */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Single Exact Date */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <Calendar size={13} className="text-slate-400" />
                Exact Date:
              </span>
              <input
                type="date"
                value={singleDate}
                onChange={(e) => {
                  setSingleDate(e.target.value);
                  if (e.target.value) {
                    setFromDate("");
                    setToDate("");
                  }
                }}
                className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>

            <div className="text-slate-300 hidden sm:block">|</div>

            {/* Date Range: From -> To */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Range:</span>
              <input
                type="date"
                placeholder="From"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  if (e.target.value) setSingleDate("");
                }}
                className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-600"
                title="From Date"
              />
              <span className="text-xs text-slate-400 font-bold">&ndash;</span>
              <input
                type="date"
                placeholder="To"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  if (e.target.value) setSingleDate("");
                }}
                className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-600"
                title="To Date"
              />
            </div>

            {/* Reset / Clear Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                title="Reset all filters to default"
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            )}
          </div>

        </div>
      </div>

      {/* 5 Core Commercial KPI Stat Cards (Strict Standard Corporate Accounting) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* 1. My Revenue Won (Excl. VAT) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-heading font-semibold text-slate-500 uppercase tracking-wider">Revenue Won (Excl. VAT)</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Trophy size={18} />
            </div>
          </div>
          <div className="text-xl font-heading font-semibold text-emerald-600 tabular-nums">{formatLKR(stats.monthlyBaseRevenue || stats.wonBaseRevenue || stats.wonTotalValue)} / mo</div>
          <div className="text-[11px] font-medium text-slate-500 mt-1 font-sans">
            {stats.wonCount} closed won {stats.wonCount === 1 ? "deal" : "deals"} &bull; Gross Billing: {formatLKR(stats.grossBillingWon || stats.grossBilling || ((stats.wonBaseRevenue || stats.wonTotalValue) * 1.18))}
          </div>
        </div>

        {/* 2. My Gross Profit (Monthly) */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-heading font-semibold text-emerald-800 uppercase tracking-wider">My Gross Profit (Monthly)</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="text-xl font-heading font-semibold text-emerald-600 tabular-nums">{formatLKR(stats.monthlyGrossProfit || stats.totalGrossProfitWon || 0)}</div>
          <div className="text-[11px] font-medium text-emerald-700 mt-1 font-sans flex flex-col gap-0.5">
            <span>Annualized GP (12M): {formatLKR(stats.annualGrossProfit || ((stats.monthlyGrossProfit || stats.totalGrossProfitWon || 0) * 12))}</span>
            <span className="inline-block mt-0.5 w-max px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
              60% Corporate GP Rule
            </span>
          </div>
        </div>

        {/* 3. My Gross Margin */}
        <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-heading font-semibold text-blue-800 uppercase tracking-wider">My Gross Margin</span>
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="text-xl font-heading font-semibold text-blue-600 tabular-nums">60.0%</div>
          <div className="text-[11px] font-medium text-blue-600/90 mt-1 font-sans">
            Standard Zynolo HRM Profit Margin
          </div>
        </div>

        {/* 4. Active Pipeline Value */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-heading font-semibold text-slate-500 uppercase tracking-wider">Active Pipeline</span>
            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <BarChart3 size={18} />
            </div>
          </div>
          <div className="text-xl font-heading font-semibold text-red-600 tabular-nums">{formatLKR(stats.pipelineValue)}</div>
          <div className="text-[11px] font-medium text-slate-500 mt-1 font-sans">
            Base volume in negotiation
          </div>
        </div>

        {/* 5. Win / Close Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-heading font-semibold text-slate-500 uppercase tracking-wider">Win / Close Rate</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <PieIcon size={18} />
            </div>
          </div>
          <div className="text-xl font-heading font-semibold text-slate-900 tabular-nums">{stats.winRate}%</div>
          <div className="text-[11px] font-medium text-slate-500 mt-1 font-sans">
            {stats.wonCount} won of {stats.totalProposals} proposals
          </div>
        </div>
      </div>

      {/* Row 1: Trend Area Chart (with 3 areas) & Conversion Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue & Pipeline Trend Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-heading font-semibold text-slate-900 flex items-center gap-2">
                <TrendingUp size={18} className="text-red-600" />
                Revenue &amp; Pipeline Trend ({period.charAt(0).toUpperCase() + period.slice(1)})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-sans">
                Comparison of Proposed Volume vs. Won Revenue vs. Lost / Expired Value over time.
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  {/* Proposed Volume: #3b82f6 */}
                  <linearGradient id="colorProposed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>

                  {/* Won Revenue: #10b981 */}
                  <linearGradient id="colorWon" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>

                  {/* Lost / Expired Value: #ef4444 */}
                  <linearGradient id="colorLost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatShortLKR}
                />
                <Tooltip
                  content={({ active, payload, label }: any) => {
                    if (active && payload && payload.length) {
                      const d = payload[0]?.payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800 text-xs space-y-1.5 min-w-[210px]">
                          <p className="font-heading font-semibold text-slate-200 border-b border-slate-800 pb-1">{label}</p>
                          <div className="flex justify-between gap-3 text-emerald-400">
                            <span>Net Revenue:</span>
                            <span className="font-bold">{formatLKR(d.won)}</span>
                          </div>
                          <div className="flex justify-between gap-3 text-slate-300">
                            <span>Gross With VAT:</span>
                            <span>{formatLKR(d.wonGross || (d.won * 1.18))}</span>
                          </div>
                          <div className="flex justify-between gap-3 text-green-400">
                            <span>Gross Profit:</span>
                            <span className="font-bold">{formatLKR(d.grossProfit || 0)}</span>
                          </div>
                          <div className="flex justify-between gap-3 text-sky-400 border-t border-slate-800 pt-1">
                            <span>Proposed (Net):</span>
                            <span>{formatLKR(d.proposed)}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
                
                {/* 1. Proposed Volume */}
                <Area
                  type="monotone"
                  dataKey="proposed"
                  name="Proposed Base Volume (Excl. VAT)"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorProposed)"
                />

                {/* 2. Won Revenue */}
                <Area
                  type="monotone"
                  dataKey="won"
                  name="Net Won Revenue (Excl. VAT)"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorWon)"
                />

                {/* 3. Lost / Expired Value */}
                <Area
                  type="monotone"
                  dataKey="lost"
                  name="Lost / Expired Volume"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorLost)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Win-Rate / Conversion Donut */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-heading font-semibold text-base text-slate-900 flex items-center gap-2 mb-1">
              <PieIcon size={18} className="text-red-600" />
              Pipeline Conversion Ratio
            </h3>
            <p className="text-xs text-slate-500 mb-4 font-sans">
              Breakdown of won, active pipeline, and lost/expired proposals.
            </p>
          </div>

          <div className="h-56 w-full relative flex items-center justify-center font-sans">
            {conversionDonut.length === 0 ? (
              <div className="text-xs text-slate-400">No deal data available for this range</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={conversionDonut}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {conversionDonut.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || DONUT_COLORS[index % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="font-heading font-semibold text-2xl text-slate-900 tabular-nums">{stats.winRate}%</span>
              <span className="text-[10px] uppercase font-heading font-semibold text-slate-400">Win Rate</span>
            </div>
          </div>

          {/* Donut Legend */}
          <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs font-sans">
            {conversionDonut.length === 0 ? (
              <div className="text-slate-400 text-center py-1">No recorded proposals</div>
            ) : (
              conversionDonut.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </span>
                  <span className="font-heading font-medium text-slate-900">{item.value} deals</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Row 2: Client Workforce Volume Distribution */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="font-heading font-semibold text-base text-slate-900 flex items-center gap-2">
              <Users size={18} className="text-red-600" />
              Workforce Scope Distribution
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-sans">
              Segmentation of proposals based on client organization employee tiers.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* Bar Chart */}
          <div className="h-64 w-full lg:col-span-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeDistribution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatShortLKR}
                />
                <Tooltip
                  formatter={(val: any) => [formatLKR(Number(val)), "Total Value"]}
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "none",
                    borderRadius: "10px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="totalValue" name="Commercial Value" radius={[8, 8, 0, 0]}>
                  {volumeDistribution.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Segment Cards */}
          <div className="space-y-3">
            {volumeDistribution.map((tier, idx) => (
              <div
                key={idx}
                className="p-3.5 border border-slate-100 rounded-xl bg-slate-50 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-8 rounded-full"
                    style={{ backgroundColor: tier.color }}
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">{tier.name}</div>
                    <div className="text-[11px] text-slate-500">{tier.count} corporate engagements</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black text-slate-900">{formatLKR(tier.totalValue)}</div>
                  <div className="text-[10px] text-slate-400">Total Volume</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Deal Loss Root-Cause Breakdown */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="font-heading font-semibold text-base text-slate-900 flex items-center gap-2">
              <AlertOctagon size={18} className="text-rose-600" />
              Commercial Deal Loss Root-Cause Breakdown
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-sans">
              Primary objections and market feedback on dropped or declined proposals.
            </p>
          </div>

          <div className="text-xs font-heading font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">
            {stats.lostCount} Total Lost Opportunities
          </div>
        </div>

        {!data?.lossReasonBreakdown || data.lossReasonBreakdown.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 font-sans">
            No dropped or lost proposals recorded in this active time window.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            {/* Donut Chart */}
            <div className="h-56 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.lossReasonBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="count"
                  >
                    {data.lossReasonBreakdown.map((entry, index) => (
                      <Cell key={`loss-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-rose-700">{stats.lostCount}</span>
                <span className="text-[10px] uppercase font-bold text-slate-400">Lost</span>
              </div>
            </div>

            {/* List */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.lossReasonBreakdown.map((item, idx) => {
                const pct = stats.lostCount > 0 ? Math.round((item.count / stats.lostCount) * 100) : 0;
                return (
                  <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-heading font-semibold text-slate-800 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        {item.name}
                      </span>
                      <span className="font-bold text-slate-900">{item.count} ({pct}%)</span>
                    </div>

                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
