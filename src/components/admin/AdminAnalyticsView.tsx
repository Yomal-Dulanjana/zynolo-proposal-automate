// src/components/admin/AdminAnalyticsView.tsx — Dedicated Executive Sales Analytics with Rep & Date Filtering
import React, { useState, useMemo } from "react";
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
  RotateCcw,
  BarChart3,
  Filter,
  UserCheck,
  ChevronDown,
  AlertOctagon,
  FileText,
} from "lucide-react";
import type { AdminProposalItem, RepPerformanceMetric } from "./types";
import {
  calculateAnalytics,
  ACTIVE_PIPELINE_STATUSES,
  buildPipelineTrendData,
  computeConversionRatio,
} from "../../lib/analytics.js";

interface AdminAnalyticsViewProps {
  proposals: AdminProposalItem[];
  reps: RepPerformanceMetric[];
}

const DONUT_COLORS = ["#10b981", "#3b82f6", "#ef4444", "#f59e0b"];

export default function AdminAnalyticsView({ proposals, reps }: AdminAnalyticsViewProps) {
  // ── Multi-Criteria Filters ───────────────────────────────────────────────────
  const [selectedRepId, setSelectedRepId] = useState<string>("ALL");
  const [period, setPeriod] = useState<"daily" | "monthly" | "yearly">("monthly");
  const [singleDate, setSingleDate] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const formatLKR = (num: number) =>
    `Rs. ${(num || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatShortLKR = (num: number) => {
    if (num >= 1_000_000) return `Rs. ${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `Rs. ${(num / 1_000).toFixed(0)}k`;
    return `Rs. ${num}`;
  };

  const handleResetFilters = () => {
    setSelectedRepId("ALL");
    setPeriod("monthly");
    setSingleDate("");
    setFromDate("");
    setToDate("");
  };

  const hasActiveFilters = Boolean(
    selectedRepId !== "ALL" || singleDate || fromDate || toDate || period !== "monthly"
  );

  // ── 1. Filter Proposals by Rep & Date Criteria ────────────────────────────────
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      // Rep filter — safe string comparison supporting both numeric and string ids
      if (selectedRepId !== "ALL" && String(p.salesUserId) !== String(selectedRepId)) {
        return false;
      }

      const pDate = new Date(p.proposalDate).toISOString().split("T")[0];

      // Exact single date filter
      if (singleDate && pDate !== singleDate) {
        return false;
      }

      // Range filters
      if (fromDate && pDate < fromDate) return false;
      if (toDate && pDate > toDate) return false;

      return true;
    });
  }, [proposals, selectedRepId, singleDate, fromDate, toDate]);

  // ── 2. Dynamic Metric Calculations (Standard Corporate Accounting Engine) ──
  const analytics = useMemo(() => {
    return calculateAnalytics(filteredProposals as any);
  }, [filteredProposals]);

  const totalCount = analytics.totalCount;
  const wonCount = analytics.wonCount;
  const baseWonRevenue = analytics.baseWonRevenue;
  const monthlyBaseRevenue = analytics.monthlyBaseRevenue ?? analytics.baseWonRevenue;
  const grossBillingWon = analytics.grossBillingWon;
  const totalCogs = analytics.totalCogs;
  const wonGrossProfit = analytics.grossProfit;
  const monthlyGrossProfit = analytics.monthlyGrossProfit ?? (analytics.baseWonRevenue * 0.60);
  const annualGrossProfit = analytics.annualGrossProfit ?? (monthlyGrossProfit * 12);
  const avgGrossMarginPct = analytics.grossMarginPct;
  const winRate = analytics.winRatePct;
  const activePipelineBaseValue = analytics.activePipelineBaseValue;

  const activeProposals = filteredProposals.filter((p) =>
    ACTIVE_PIPELINE_STATUSES.includes((p.status || "").toUpperCase())
  );
  const activeCount = activeProposals.length;
  const pipelineValue = activePipelineBaseValue;

  const lostProposals = filteredProposals.filter((p) =>
    ["REJECTED", "EXPIRED"].includes(p.status)
  );
  const lostCount = lostProposals.length;
  const lostValue = lostProposals.reduce((sum, p) => sum + (Number(p.baseAmount) || (Number(p.employeeCount) || 0) * 400.00), 0);

  // Deal Loss Root-Cause Breakdown
  const lossReasonData = useMemo(() => {
    const lostProps = filteredProposals.filter(
      (p) => p.status === "REJECTED" || p.status === "EXPIRED" || !!p.lossReason
    );
    const counts: Record<string, { name: string; count: number; color: string }> = {
      COMPETITOR: { name: "Competitor System", count: 0, color: "#f43f5e" },
      BUDGET: { name: "Budget Frozen / Next FY", count: 0, color: "#f59e0b" },
      FEATURE_MISMATCH: { name: "Feature / Device Mismatch", count: 0, color: "#8b5cf6" },
      RESTRUCTURING: { name: "Client Restructuring", count: 0, color: "#06b6d4" },
      OTHER: { name: "Other / Objection", count: 0, color: "#64748b" },
    };

    lostProps.forEach((p) => {
      const reasonKey = (p.lossReason || "OTHER").toUpperCase();
      if (counts[reasonKey]) {
        counts[reasonKey].count += 1;
      } else {
        counts.OTHER.count += 1;
      }
    });

    return Object.values(counts).filter((c) => c.count > 0);
  }, [filteredProposals]);

  // ── 3. Chart 1: Revenue & Pipeline Trend Data Generation (Gatekeeps unapproved HOD pending) ────
  const trendData = useMemo(() => {
    return buildPipelineTrendData(filteredProposals as any, period, {
      singleDate,
      fromDate,
      toDate,
    });
  }, [filteredProposals, period, singleDate, fromDate, toDate]);

  // ── 4. Chart 2: Pipeline Conversion Donut Data (Gatekeeps unapproved HOD pending) ───────────────
  const conversionRatio = useMemo(() => {
    return computeConversionRatio(filteredProposals as any);
  }, [filteredProposals]);

  const conversionDonutData = conversionRatio.donutSegments;

  // ── 5. Chart 3: Client Workforce Scope Distribution (Base Volume Excl. VAT) ───
  const volumeDistribution = useMemo(() => {
    const buckets = [
      { name: "1 - 50 Staff", count: 0, totalValue: 0, color: "#6366f1" },
      { name: "51 - 200 Staff", count: 0, totalValue: 0, color: "#8b5cf6" },
      { name: "200+ Enterprise", count: 0, totalValue: 0, color: "#ec4899" },
    ];

    filteredProposals.forEach((p) => {
      const count = p.employeeCount || 0;
      const baseVal = Number(p.baseAmount) || count * 400.00;
      if (count <= 50) {
        buckets[0].count += 1;
        buckets[0].totalValue += baseVal;
      } else if (count <= 200) {
        buckets[1].count += 1;
        buckets[1].totalValue += baseVal;
      } else {
        buckets[2].count += 1;
        buckets[2].totalValue += baseVal;
      }
    });

    return buckets;
  }, [filteredProposals]);

  // ── 6. Chart 4: Team Performance Comparison (Comparing Won Base Revenue vs Realized Gross Profit) ───
  const teamComparisonData = useMemo(() => {
    return reps.map((r) => {
      // Filter proposals for this specific rep based on active date criteria
      const repFilteredProps = proposals.filter((p) => {
        if (String(p.salesUserId) !== String(r.repId)) return false;
        const pDate = new Date(p.proposalDate).toISOString().split("T")[0];
        if (singleDate && pDate !== singleDate) return false;
        if (fromDate && pDate < fromDate) return false;
        if (toDate && pDate > toDate) return false;
        return true;
      });

      const repAnalytics = calculateAnalytics(repFilteredProps as any);

      return {
        name: (r.repName || "Rep").split(" ")[0],
        fullName: r.repName || "Representative",
        wonBaseRevenue: repAnalytics.wonBaseRevenue,
        wonRevenue: repAnalytics.wonRevenue,
        grossProfit: repAnalytics.grossProfit,
        grossMargin: repAnalytics.grossMargin,
        grossMarginPct: repAnalytics.grossMarginPct,
        dealCount: repFilteredProps.length,
        wonCount: repAnalytics.wonCount,
      };
    });
  }, [reps, proposals, singleDate, fromDate, toDate]);

  const selectedRep = reps.find((r) => String(r.repId) === String(selectedRepId));
  const selectedRepName =
    selectedRepId === "ALL"
      ? "All Sales Representatives (Entire Department)"
      : selectedRep?.repName || "Selected Representative";
  const selectedRepFirstName = selectedRep?.repName ? selectedRep.repName.split(" ")[0] : "Rep";

  return (
    <div className="space-y-6">
      
      {/* ── A. Comprehensive Filter Toolbar ──────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* 1. Sales Representative Dropdown */}
          <div className="flex-1 max-w-md">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
              <UserCheck size={14} className="text-red-600" />
              Sales Representative Scope:
            </label>
            <div className="relative">
              <select
                value={selectedRepId}
                onChange={(e) => setSelectedRepId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-600 appearance-none cursor-pointer pr-10 shadow-2xs"
              >
                <option value="ALL">All Sales Representatives (Entire Department)</option>
                {reps.map((r) => (
                  <option key={r.repId} value={String(r.repId)}>
                    {r.repName} ({r.totalProposals} proposals)
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
            </div>
          </div>

          {/* 2. Period Shortcuts (Daily / Monthly / Yearly) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
              <Filter size={14} className="text-red-600" />
              Interval Granularity:
            </label>
            <div className="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
              <button
                type="button"
                onClick={() => setPeriod("daily")}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  period === "daily"
                    ? "bg-white text-slate-900 shadow-xs font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => setPeriod("monthly")}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  period === "monthly"
                    ? "bg-white text-slate-900 shadow-xs font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setPeriod("yearly")}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  period === "yearly"
                    ? "bg-white text-slate-900 shadow-xs font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Yearly
              </button>
            </div>
          </div>

        </div>

        {/* Date Pickers Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Single Exact Date */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-500 flex items-center gap-1">
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
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-600"
              />
            </div>

            <span className="text-slate-300 hidden sm:inline">|</span>

            {/* Date Range: From -> To */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-500">Range:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  if (e.target.value) setSingleDate("");
                }}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-600"
                title="From Date"
              />
              <span className="text-slate-400 font-bold">&ndash;</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  if (e.target.value) setSingleDate("");
                }}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-600"
                title="To Date"
              />
            </div>

          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Reset All Filters</span>
            </button>
          )}
        </div>

      </div>

      {/* Active Filter Scope Pill Banner & Prominent Rep Drill-Down Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 px-1">
        <div className="flex flex-wrap items-center gap-2">
          {selectedRepId !== "ALL" ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 border border-red-200 text-red-700 rounded-lg font-heading font-semibold shadow-2xs">
              <UserCheck size={14} className="text-red-600" />
              <span>Showing Profitability for <strong>{selectedRepName}</strong></span>
            </div>
          ) : (
            <div>
              Active Scope: <strong className="text-slate-900">{selectedRepName}</strong>
            </div>
          )}
          {singleDate && <span> &bull; Date: <strong className="text-slate-900">{singleDate}</strong></span>}
          {fromDate && <span> &bull; From: <strong className="text-slate-900">{fromDate}</strong></span>}
          {toDate && <span> &bull; To: <strong className="text-slate-900">{toDate}</strong></span>}
        </div>
        <div>
          Showing <strong>{filteredProposals.length}</strong> matching proposals
        </div>
      </div>

      {/* ── B. Dynamic Metric Cards (6 Executive Governance KPIs) ──────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* 1. Net Revenue Won (Excl. VAT) */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-heading font-semibold text-slate-500 uppercase tracking-wider">Revenue Won (Excl. VAT)</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
              <Trophy size={18} />
            </div>
          </div>
          <div className="font-heading font-semibold text-xl text-slate-900 tracking-tight tabular-nums">{formatLKR(monthlyBaseRevenue)} / mo</div>
          <div className="text-[11px] font-medium text-slate-500 mt-1 font-sans">
            {wonCount} of {totalCount} closed won &bull; Gross Billing: {formatLKR(grossBillingWon)}
          </div>
        </div>

        {/* 2. Department Gross Profit (Monthly) */}
        <div className="bg-white rounded-xl border border-emerald-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-heading font-semibold text-emerald-800 uppercase tracking-wider">
              {selectedRepId === "ALL" ? "Department Gross Profit (Monthly)" : `${selectedRepFirstName}'s Gross Profit (Monthly)`}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="font-heading font-semibold text-xl text-emerald-600 tracking-tight tabular-nums">{formatLKR(monthlyGrossProfit)}</div>
          <div className="text-[11px] font-medium text-emerald-700 mt-1 font-sans flex flex-col gap-0.5">
            <span>Annualized GP (12M): {formatLKR(annualGrossProfit)}</span>
            <span className="inline-block mt-0.5 w-max px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
              60% Corporate GP Rule
            </span>
          </div>
        </div>

        {/* 3. Average Gross Margin */}
        <div className="bg-white rounded-xl border border-blue-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-heading font-semibold text-blue-800 uppercase tracking-wider">
              {selectedRepId === "ALL" ? "Avg Gross Margin" : "Gross Margin"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="font-heading font-semibold text-xl text-blue-600 tracking-tight tabular-nums">60.0%</div>
          <div className="text-[11px] font-medium text-blue-600/90 mt-1 font-sans">
            Standard Zynolo HRM Profit Margin
          </div>
        </div>

        {/* 4. Active Pipeline */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-heading font-semibold text-slate-500 uppercase tracking-wider">Active Pipeline</span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center">
              <BarChart3 size={18} />
            </div>
          </div>
          <div className="font-heading font-semibold text-xl text-slate-900 tracking-tight tabular-nums">{formatLKR(pipelineValue)}</div>
          <div className="text-[11px] font-medium text-slate-500 mt-1 font-sans">
            Base volume currently in negotiation
          </div>
        </div>

        {/* 5. Total Proposals */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-heading font-semibold text-slate-500 uppercase tracking-wider">Total Proposals</span>
            <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 text-violet-600 flex items-center justify-center">
              <FileText size={18} />
            </div>
          </div>
          <div className="font-heading font-semibold text-xl text-slate-900 tracking-tight tabular-nums">{totalCount}</div>
          <div className="text-[11px] font-medium text-slate-500 mt-1 font-sans">
            Total commercial proposals
          </div>
        </div>

        {/* 6. Win / Close Rate (%) */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-heading font-semibold text-slate-500 uppercase tracking-wider">Win / Close Rate</span>
            <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center">
              <PieIcon size={18} />
            </div>
          </div>
          <div className="font-heading font-semibold text-xl text-red-600 tracking-tight tabular-nums">{winRate}%</div>
          <div className="text-[11px] font-medium text-slate-500 mt-1 font-sans">
            Won Deals / Total Proposals
          </div>
        </div>

      </div>

      {/* ── C. Analytics Charts (Recharts) ───────────────────────────────────── */}
      
      {/* Row 1: Revenue Trend & Conversion Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 1. Revenue & Pipeline Trend (Area Chart) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-heading font-semibold text-base text-slate-900 flex items-center gap-2">
                <TrendingUp size={18} className="text-red-600" />
                Revenue &amp; Pipeline Trend ({period.charAt(0).toUpperCase() + period.slice(1)})
              </h3>
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                Comparison of Proposed Volume vs. Won Revenue vs. Lost/Expired Volume over time.
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="adminTrendProposed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="adminTrendWon" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="adminTrendLost" x1="0" y1="0" x2="0" y2="1">
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
                            <span className="font-bold">{formatLKR(d.grossProfit)}</span>
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
                
                <Area
                  type="monotone"
                  dataKey="proposed"
                  name="Proposed Base Volume (Excl. VAT)"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#adminTrendProposed)"
                />
                <Area
                  type="monotone"
                  dataKey="won"
                  name="Net Won Revenue (Excl. VAT)"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#adminTrendWon)"
                />
                <Area
                  type="monotone"
                  dataKey="lost"
                  name="Lost / Expired Volume"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#adminTrendLost)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Pipeline Conversion Ratio (Donut Chart) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-heading font-semibold text-base text-slate-900 flex items-center gap-2 mb-1">
              <PieIcon size={18} className="text-red-600" />
              Pipeline Conversion Ratio
            </h3>
            <p className="text-xs text-slate-500 font-sans mb-4">
              Breakdown of won, active pipeline, and dropped proposals.
            </p>
          </div>

          <div className="h-56 w-full relative flex items-center justify-center">
            {conversionDonutData.length === 0 ? (
              <div className="text-xs text-slate-400">No deal data in selected scope</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={conversionDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {conversionDonutData.map((entry, index) => (
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
              <span className="text-2xl font-black text-slate-900">{conversionRatio.winRate}</span>
              <span className="text-[10px] uppercase font-bold text-slate-400">Win Rate</span>
            </div>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
            {conversionDonutData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="font-bold text-slate-900">{item.value} deals</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Row 2: Workforce Scope Distribution & Team Comparison (when All Reps) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 3. Workforce Scope Distribution (Bar Chart) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-heading font-semibold text-base text-slate-900 flex items-center gap-2">
              <Users size={18} className="text-red-600" />
              Workforce Scope Distribution
            </h3>
            <p className="text-xs text-slate-500 font-sans mt-0.5 mb-5">
              Client organization workforce scale segments (1-50, 51-200, 200+ staff).
            </p>
          </div>

          <div className="h-64 w-full">
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

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center">
            {volumeDistribution.map((tier, idx) => (
              <div key={idx} className="p-2 bg-slate-50 rounded-lg">
                <div className="text-[10px] text-slate-500">{tier.name}</div>
                <div className="text-xs font-bold text-slate-800 mt-0.5">{tier.count} deals</div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Team Performance Comparison (Side-by-Side Bar Chart) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-heading font-semibold text-base text-slate-900 flex items-center gap-2">
              <BarChart3 size={18} className="text-red-600" />
              Team Performance Comparison (Reps)
            </h3>
            <p className="text-xs text-slate-500 font-sans mt-0.5 mb-5">
              Won Base Revenue vs. Realized Gross Profit across corporate sales representatives.
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamComparisonData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                  formatter={(val: any, name: any, item: any) => [
                    formatLKR(Number(val)),
                    `${item.payload.fullName} (${name} — Margin: ${item.payload.grossMargin})`,
                  ]}
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "none",
                    borderRadius: "10px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                <Bar dataKey="wonBaseRevenue" name="Net Won Revenue (Excl. VAT)" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="grossProfit" name="Realized Gross Profit" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Corporate Sales Reps: <strong className="text-slate-900">{reps.length}</strong></span>
            <span className="text-[11px] text-slate-400">Values in LKR</span>
          </div>
        </div>

      </div>

      {/* Row 3: Deal Loss Root-Cause Breakdown */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="font-heading font-semibold text-base text-slate-900 flex items-center gap-2">
              <AlertOctagon size={18} className="text-rose-600" />
              Executive Deal Loss Root-Cause Breakdown
            </h3>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Empirical taxonomy analysis of lost or dropped HRM opportunities to pinpoint commercial objections.
            </p>
          </div>

          <div className="text-xs font-heading font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">
            {lostCount} Total Lost Opportunities
          </div>
        </div>

        {lossReasonData.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400 font-sans">
            No dropped or lost deals recorded in the selected filter period.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            {/* Donut Visualization */}
            <div className="h-60 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={lossReasonData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="count"
                  >
                    {lossReasonData.map((entry, index) => (
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
                <span className="text-2xl font-black text-rose-700">{lostCount}</span>
                <span className="text-[10px] uppercase font-bold text-slate-400">Lost Deals</span>
              </div>
            </div>

            {/* Structured Root-Cause Cards List */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {lossReasonData.map((item, idx) => {
                const pct = lostCount > 0 ? Math.round((item.count / lostCount) * 100) : 0;
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
