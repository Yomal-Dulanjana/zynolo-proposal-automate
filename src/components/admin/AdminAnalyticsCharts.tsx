// src/components/admin/AdminAnalyticsCharts.tsx — Visual Department Analytics (Powered by Recharts)
import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  Tooltip,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { TrendingUp, BarChart3, Trophy } from "lucide-react";
import type { MonthlyDepartmentTrend, RepPerformanceMetric } from "./types";

interface AdminAnalyticsChartsProps {
  monthlyTrend: MonthlyDepartmentTrend[];
  leaderboard: RepPerformanceMetric[];
}

const REP_BAR_COLORS = ["#dc2626", "#2563eb", "#10b981", "#d97706", "#8b5cf6", "#ec4899"];

export default function AdminAnalyticsCharts({
  monthlyTrend,
  leaderboard,
}: AdminAnalyticsChartsProps) {
  const formatLKR = (num: number) =>
    `Rs. ${(num || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatShortLKR = (num: number) => {
    if (num >= 1_000_000) return `Rs. ${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `Rs. ${(num / 1_000).toFixed(0)}k`;
    return `Rs. ${num}`;
  };

  // Prepare rep comparison data
  const repChartData = leaderboard.map((r) => ({
    name: r.repName.split(" ")[0], // First name for clean axis label
    fullName: r.repName,
    wonRevenue: r.wonValue,
    pipelineValue: r.pipelineValue,
    wonCount: r.wonCount,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Team Revenue Comparison (Bar Chart) */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm flex flex-col justify-between">
        <div>
          <h3 className="font-heading font-semibold text-base text-slate-800 flex items-center gap-2">
            <BarChart3 size={18} className="text-red-600" />
            Team Revenue Comparison by Representative
          </h3>
          <p className="text-xs text-slate-500 font-sans mt-0.5 mb-5">
            Side-by-side comparison of closed won revenue generated per sales representative.
          </p>
        </div>

        <div className="h-68 w-full">
          {repChartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No representative data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={repChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                    `${item.payload.fullName} (Won Revenue)`,
                  ]}
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "none",
                    borderRadius: "10px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="wonRevenue" name="Won Revenue" radius={[8, 8, 0, 0]}>
                  {repChartData.map((_, index) => (
                    <Cell key={`bar-${index}`} fill={REP_BAR_COLORS[index % REP_BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Active Sales Reps: <strong className="text-slate-900">{leaderboard.length}</strong></span>
          <span className="text-[11px] text-slate-400">Values in Sri Lankan Rupees (LKR)</span>
        </div>
      </div>

      {/* 2. Department Revenue & Pipeline Trend (Line / Area Chart) */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm flex flex-col justify-between">
        <div>
          <h3 className="font-heading font-semibold text-base text-slate-800 flex items-center gap-2">
            <TrendingUp size={18} className="text-red-600" />
            Department Revenue &amp; Pipeline Trend (6-Month Run-Rate)
          </h3>
          <p className="text-xs text-slate-500 font-sans mt-0.5 mb-5">
            Cumulative volume comparison: Proposed Volume vs. Won Revenue vs. Lost/Expired Value.
          </p>
        </div>

        <div className="h-68 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="adminColorProposed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="adminColorWon" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="adminColorLost" x1="0" y1="0" x2="0" y2="1">
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
                formatter={(val: any, name: any) => [formatLKR(Number(val)), name]}
                contentStyle={{
                  backgroundColor: "#0f172a",
                  border: "none",
                  borderRadius: "10px",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
              
              <Area
                type="monotone"
                dataKey="proposed"
                name="Proposed Volume"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#adminColorProposed)"
              />
              <Area
                type="monotone"
                dataKey="won"
                name="Won Revenue"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#adminColorWon)"
              />
              <Area
                type="monotone"
                dataKey="lost"
                name="Lost / Expired"
                stroke="#ef4444"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#adminColorLost)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Reporting Window: <strong className="text-slate-900">Last 6 Months</strong></span>
          <span className="text-[11px] text-slate-400">Department Aggregate</span>
        </div>
      </div>
    </div>
  );
}
