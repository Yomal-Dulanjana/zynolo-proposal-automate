// src/components/PipelineFilterBar.tsx — Advanced Commercial Filtering Toolbar for Pipeline & Deals
import React from "react";
import {
  Search,
  Filter,
  Calendar,
  DollarSign,
  AlertTriangle,
  RotateCcw,
  Building2,
  Users,
  ChevronDown,
  X,
  Clock,
  Sparkles,
} from "lucide-react";

export interface PipelineFilterState {
  search: string;
  period: "all" | "this_month" | "expiring_soon";
  fromDate: string;
  toDate: string;
  valueTier: "all" | "under_500" | "500_to_1000" | "over_1000";
  urgency: "all" | "critical" | "active" | "stalled";
  company: string;
  repId: string;
  stage: string;
}

export interface PipelineFilterBarProps {
  isAdmin: boolean;
  filters: PipelineFilterState;
  onChange: (updated: Partial<PipelineFilterState>) => void;
  onReset: () => void;
  reps: { id: number; fullName: string; email: string }[];
  companies: string[];
  totalCount: number;
  filteredCount: number;
  viewMode: "kanban" | "matrix";
}

export default function PipelineFilterBar({
  isAdmin,
  filters,
  onChange,
  onReset,
  reps,
  companies,
  totalCount,
  filteredCount,
  viewMode,
}: PipelineFilterBarProps) {
  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.period !== "all" ||
    filters.fromDate !== "" ||
    filters.toDate !== "" ||
    filters.valueTier !== "all" ||
    filters.urgency !== "all" ||
    filters.company !== "ALL" ||
    filters.repId !== "ALL" ||
    filters.stage !== "ALL";

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-xs space-y-3.5">
      {/* ── ROW 1: PRIMARY CONTROLS (SEARCH + ROLE SELECTOR + VIEW MODE STAGE) ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Real-Time Instant Search */}
        <div className="relative flex-1">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Search by Proposal ID (e.g. DTPZPV), Client Company, Contact Email, or Phone..."
            className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:bg-white transition-all"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onChange({ search: "" })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Role-Specific Filter: HOD Rep Selector OR Sales Rep Company Selector */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {isAdmin ? (
            /* HOD Executive: Master Sales Representative Selector */
            <div className="relative min-w-[220px]">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Users size={14} />
              </div>
              <select
                value={filters.repId}
                onChange={(e) => onChange({ repId: e.target.value })}
                className="w-full text-xs font-heading font-medium py-2 pl-9 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 hover:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 cursor-pointer appearance-none truncate transition-colors"
              >
                <option value="ALL">All Sales Representatives ({reps.length})</option>
                {reps.map((r) => (
                  <option key={r.id} value={String(r.id)}>
                    Rep: {r.fullName}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
              />
            </div>
          ) : (
            /* Sales Rep: Saved Client Company Filter */
            <div className="relative min-w-[200px]">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Building2 size={14} />
              </div>
              <select
                value={filters.company}
                onChange={(e) => onChange({ company: e.target.value })}
                className="w-full text-xs font-heading font-medium py-2 pl-9 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 hover:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 cursor-pointer appearance-none truncate transition-colors"
              >
                <option value="ALL">All Saved Clients ({companies.length})</option>
                {companies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
              />
            </div>
          )}

          {/* Matrix View: Stage Filter */}
          {viewMode === "matrix" && (
            <div className="relative min-w-[180px]">
              <select
                value={filters.stage}
                onChange={(e) => onChange({ stage: e.target.value })}
                className="w-full text-xs font-heading font-medium py-2 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 hover:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 cursor-pointer appearance-none truncate transition-colors"
              >
                <option value="ALL">All Pipeline Stages</option>
                <option value="HOD_REVIEW">Under HOD Review</option>
                <option value="DISPATCHED">Dispatched / Sent</option>
                <option value="NEGOTIATION">In Discussion / Negotiation</option>
                <option value="CLOSED_WON">Closed / Won</option>
                <option value="DROPPED_LOST">Dropped / Lost</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
              />
            </div>
          )}

          {/* Reset Filters CTA */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-heading font-medium rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Reset all filters to default"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* ── ROW 2: ADVANCED GRANULAR FILTERS (PERIOD, RANGE, VALUE TIER, URGENCY) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
        {/* 1. Date & Expiry Pre-set Periods */}
        <div>
          <label className="block text-[11px] font-heading font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Period / Validity
          </label>
          <div className="relative">
            <select
              value={filters.period}
              onChange={(e) =>
                onChange({
                  period: e.target.value as PipelineFilterState["period"],
                  // If preset selected, clear custom dates
                  ...(e.target.value !== "all" ? { fromDate: "", toDate: "" } : {}),
                })
              }
              className="w-full text-xs font-sans font-medium py-2 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 hover:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-red-500 appearance-none cursor-pointer"
            >
              <option value="all">All Time History</option>
              <option value="this_month">This Current Month</option>
              <option value="expiring_soon">Expiring Soon (≤ 5 Days)</option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
            />
          </div>
        </div>

        {/* 2. Custom Date Range Pickers (From → To) */}
        <div>
          <label className="block text-[11px] font-heading font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Custom Date Range
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) =>
                onChange({
                  fromDate: e.target.value,
                  period: "all",
                })
              }
              className="w-1/2 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500"
              title="From Issued Date"
            />
            <span className="text-slate-400 font-bold">&ndash;</span>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) =>
                onChange({
                  toDate: e.target.value,
                  period: "all",
                })
              }
              className="w-1/2 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500"
              title="To Issued Date"
            />
          </div>
        </div>

        {/* 3. Deal Value Tier Filter */}
        <div>
          <label className="block text-[11px] font-heading font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Commercial Value Tier
          </label>
          <div className="relative">
            <select
              value={filters.valueTier}
              onChange={(e) =>
                onChange({
                  valueTier: e.target.value as PipelineFilterState["valueTier"],
                })
              }
              className="w-full text-xs font-sans font-medium py-2 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 hover:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-red-500 appearance-none cursor-pointer"
            >
              <option value="all">All Deal Amounts</option>
              <option value="under_500">&lt; LKR 500.00 (Entry Scope)</option>
              <option value="500_to_1000">LKR 500.00 &ndash; LKR 1,000.00 (Mid-tier)</option>
              <option value="over_1000">&gt; LKR 1,000.00 (Enterprise)</option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
            />
          </div>
        </div>

        {/* 4. Deal Urgency & Velocity Filter */}
        <div>
          <label className="block text-[11px] font-heading font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Deal Urgency &amp; Health
          </label>
          <div className="relative">
            <select
              value={filters.urgency}
              onChange={(e) =>
                onChange({
                  urgency: e.target.value as PipelineFilterState["urgency"],
                })
              }
              className="w-full text-xs font-sans font-medium py-2 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 hover:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-red-500 appearance-none cursor-pointer"
            >
              <option value="all">All Deals</option>
              <option value="critical">Critical (Expiring &lt; 48 hrs)</option>
              <option value="active">Active Pipeline Deals Only</option>
              <option value="stalled">Stalled (&gt; 7 days without movement)</option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* ── ROW 3: ACTIVE FILTER PILLS & COUNT BAR ────────────────────────── */}
      <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs font-sans text-slate-500">
        <div className="flex items-center gap-2 flex-wrap">
          <span>
            Showing <strong className="text-slate-900 font-semibold">{filteredCount}</strong> of{" "}
            {totalCount} deal(s)
          </span>

          {filters.urgency === "stalled" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
              <AlertTriangle size={11} />
              <span>Stalled Filter Active</span>
              <button
                type="button"
                onClick={() => onChange({ urgency: "all" })}
                className="hover:text-amber-900 cursor-pointer ml-1"
              >
                &times;
              </button>
            </span>
          )}

          {filters.urgency === "critical" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
              <Clock size={11} />
              <span>Expiring &lt; 48h</span>
              <button
                type="button"
                onClick={() => onChange({ urgency: "all" })}
                className="hover:text-rose-900 cursor-pointer ml-1"
              >
                &times;
              </button>
            </span>
          )}

          {filters.period === "expiring_soon" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <span>Expiring ≤ 5 Days</span>
              <button
                type="button"
                onClick={() => onChange({ period: "all" })}
                className="hover:text-amber-900 cursor-pointer ml-1"
              >
                &times;
              </button>
            </span>
          )}

          {filters.valueTier !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              <span>Tier: {filters.valueTier.replace(/_/g, " ")}</span>
              <button
                type="button"
                onClick={() => onChange({ valueTier: "all" })}
                className="hover:text-slate-900 cursor-pointer ml-1"
              >
                &times;
              </button>
            </span>
          )}

          {isAdmin && filters.repId !== "ALL" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <span>Rep: {reps.find((r) => String(r.id) === filters.repId)?.fullName}</span>
              <button
                type="button"
                onClick={() => onChange({ repId: "ALL" })}
                className="hover:text-blue-900 cursor-pointer ml-1"
              >
                &times;
              </button>
            </span>
          )}

          {!isAdmin && filters.company !== "ALL" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
              <span>Client: {filters.company}</span>
              <button
                type="button"
                onClick={() => onChange({ company: "ALL" })}
                className="hover:text-slate-900 cursor-pointer ml-1"
              >
                &times;
              </button>
            </span>
          )}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="text-[11px] font-semibold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
          >
            Clear All Active Filters
          </button>
        )}
      </div>
    </div>
  );
}
