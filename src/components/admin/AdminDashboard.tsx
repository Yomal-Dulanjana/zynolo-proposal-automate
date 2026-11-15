// src/components/admin/AdminDashboard.tsx — Executive HOD Proposal Oversight Dashboard (Content Shell)
import React, { useState } from "react";
import {
  Trophy,
  DollarSign,
  TrendingUp,
  FileText,
  PieChart as PieIcon,
  ShieldCheck,
  Building2,
  Users,
  CheckCircle2,
  BarChart3,
  ExternalLink,
} from "lucide-react";
import type { AdminDashboardData } from "./types";
import RepLeaderboard from "./RepLeaderboard";
import MasterProposalTable from "./MasterProposalTable";
import AdminAnalyticsCharts from "./AdminAnalyticsCharts";

export default function AdminDashboard({ data }: { data: AdminDashboardData }) {
  const { metrics, leaderboard, proposals, monthlyTrend, adminEmail } = data;
  const [selectedRepId, setSelectedRepId] = useState<number | null>(null);

  const formatLKR = (num: number) =>
    `Rs. ${(num || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-8">
      
      {/* 1. Welcome & Status Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading font-semibold text-2xl text-slate-900 tracking-tight flex items-center gap-2.5">
            <Building2 className="text-red-600 flex-shrink-0" size={26} />
            Departmental Commercial Governance &amp; Proposal Oversight
          </h2>
          <p className="text-xs text-slate-500 font-sans mt-1">
            Consolidated enterprise insights across all registered corporate sales representatives.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200/90 text-xs font-semibold text-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex items-center gap-1.5 font-sans">
            <span className="relative flex h-2 w-2 mr-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Live Database Synchronized</span>
          </div>
        </div>
      </div>

      {/* 2. Top Executive KPI Bar (6 Cards with Gross Profit Governance) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* 1. Department Revenue Won */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-heading font-semibold text-slate-500 uppercase tracking-wider">Revenue Won</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
              <Trophy size={18} />
            </div>
          </div>
          <div className="font-heading font-semibold text-xl text-slate-900 tracking-tight tabular-nums">
            {formatLKR(metrics.totalRevenueWon)}
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-1 font-sans">
            {metrics.wonCount} contracts closed won
          </div>
        </div>

        {/* 2. Total Department Gross Profit (Won) */}
        <div className="bg-white rounded-xl border border-emerald-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-heading font-semibold text-emerald-800 uppercase tracking-wider">Dept Gross Profit</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="font-heading font-semibold text-xl text-emerald-600 tracking-tight tabular-nums">
            {formatLKR(metrics.totalGrossProfitWon || 0)}
          </div>
          <div className="text-[11px] font-medium text-emerald-600/90 mt-1 font-sans">
            Won base minus LKR 80.00 COGS
          </div>
        </div>

        {/* 3. Average Gross Margin */}
        <div className="bg-white rounded-xl border border-blue-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-heading font-semibold text-blue-800 uppercase tracking-wider">Avg Gross Margin</span>
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="font-heading font-semibold text-xl text-blue-600 tracking-tight tabular-nums">
            {metrics.averageGrossMargin || 80.0}%
          </div>
          <div className="text-[11px] font-medium text-blue-600/90 mt-1 font-sans">
            Department profit margin
          </div>
        </div>

        {/* 4. Active Pipeline in Motion */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-heading font-semibold text-slate-500 uppercase tracking-wider">Active Pipeline</span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center">
              <BarChart3 size={18} />
            </div>
          </div>
          <div className="font-heading font-semibold text-xl text-slate-900 tracking-tight tabular-nums">
            {formatLKR(metrics.totalPipelineValue)}
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-1 font-sans">
            {metrics.activeCount} live deals in negotiation
          </div>
        </div>

        {/* 5. Total Proposals Dispatched */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-heading font-semibold text-slate-500 uppercase tracking-wider">Proposals</span>
            <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 text-violet-600 flex items-center justify-center">
              <FileText size={18} />
            </div>
          </div>
          <div className="font-heading font-semibold text-xl text-slate-900 tracking-tight tabular-nums">
            {metrics.totalProposalsDispatched}
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-1 font-sans">
            Across {leaderboard.length} sales reps
          </div>
        </div>

        {/* 6. Overall Close / Win Rate */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-heading font-semibold text-slate-500 uppercase tracking-wider">Close Rate</span>
            <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center">
              <PieIcon size={18} />
            </div>
          </div>
          <div className="font-heading font-semibold text-xl text-slate-900 tracking-tight tabular-nums">
            {metrics.overallCloseRate}%
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-1 font-sans">
            Won Deals / Total
          </div>
        </div>

      </div>

      {/* 3. Visual Department Analytics (Recharts) */}
      <AdminAnalyticsCharts
        monthlyTrend={monthlyTrend}
        leaderboard={leaderboard}
      />

      {/* 4. Sales Team Performance Leaderboard */}
      <RepLeaderboard
        leaderboard={leaderboard}
        selectedRepId={selectedRepId}
        onSelectRep={setSelectedRepId}
      />

      {/* 5. Master Proposals & Contracts Feed */}
      <MasterProposalTable
        proposals={proposals}
        reps={leaderboard}
        selectedRepId={selectedRepId}
        onSelectRep={setSelectedRepId}
      />

    </div>
  );
}
