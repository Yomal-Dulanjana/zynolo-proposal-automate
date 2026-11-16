// src/components/admin/RepLeaderboard.tsx — Sales Team Performance Leaderboard
import React from "react";
import { Users, Trophy, Award, Phone, Mail, CheckCircle2, Filter, X } from "lucide-react";
import type { RepPerformanceMetric } from "./types";

interface RepLeaderboardProps {
  leaderboard: RepPerformanceMetric[];
  selectedRepId: number | null;
  onSelectRep: (repId: number | null) => void;
}

export default function RepLeaderboard({
  leaderboard,
  selectedRepId,
  onSelectRep,
}: RepLeaderboardProps) {
  const formatLKR = (num: number) =>
    `Rs. ${(num || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const selectedRep = leaderboard.find((r) => r.repId === selectedRepId);

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-heading font-semibold text-base text-slate-900 flex items-center gap-2">
            <Trophy size={18} className="text-amber-500" />
            Sales Team Performance Leaderboard
          </h3>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Aggregated commercial productivity metrics per authorized corporate sales representative.
          </p>
        </div>

        {selectedRep && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 shadow-2xs font-sans">
            <Filter size={12} className="text-red-600 flex-shrink-0" />
            <span>Filtering Table by: <strong className="font-heading font-semibold text-red-800">{selectedRep.repName}</strong></span>
            <button
              type="button"
              onClick={() => onSelectRep(null)}
              className="p-0.5 hover:bg-red-200/60 rounded text-red-700 transition-colors ml-1 cursor-pointer"
              title="Clear representative filter"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Leaderboard Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-slate-200 text-xs font-semibold tracking-wider uppercase border-b border-slate-800">
              <th className="py-3.5 px-4 text-left">Rank &amp; Representative</th>
              <th className="py-3.5 px-4 text-left">Contact</th>
              <th className="py-3.5 px-3 text-center">Total Proposals</th>
              <th className="py-3.5 px-3 text-center">In Pipeline</th>
              <th className="py-3.5 px-3 text-center">Won Deals</th>
              <th className="py-3.5 px-3 text-center">Lost / Expired</th>
              <th className="py-3.5 px-4 text-right">Closed Revenue</th>
              <th className="py-3.5 px-4 text-center">Win Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {leaderboard.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                  No sales representatives registered.
                </td>
              </tr>
            ) : (
              leaderboard.map((rep, idx) => {
                const isSelected = selectedRepId === rep.repId;
                const isTop1 = idx === 0 && rep.wonValue > 0;

                return (
                  <tr
                    key={rep.repId}
                    onClick={() => onSelectRep(isSelected ? null : rep.repId)}
                    className={`transition-colors cursor-pointer group ${
                      isSelected
                        ? "bg-red-50/70 border-l-4 border-l-red-600"
                        : "hover:bg-slate-50/80"
                    }`}
                    title="Click to filter proposals by this sales representative"
                  >
                    {/* Rank & Representative Name */}
                    <td className="py-3.5 px-4 align-middle">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                            isTop1
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : idx === 1
                              ? "bg-slate-200 text-slate-700"
                              : idx === 2
                              ? "bg-amber-50 text-amber-900 border border-amber-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {isTop1 ? <Award size={14} className="text-amber-600" /> : `#${idx + 1}`}
                        </div>

                        <div>
                          <div className="font-semibold text-slate-900 text-sm group-hover:text-red-600 transition-colors flex items-center gap-1.5">
                            <span>{rep.repName}</span>
                            {isSelected && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-600 text-white font-sans">
                                Active Filter
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-sans">Sales Representative</div>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="py-3.5 px-4 text-slate-700 font-sans align-middle">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium text-xs">
                          <Mail size={12} className="text-slate-400 flex-shrink-0" />
                          <span className="truncate max-w-[170px]">{rep.email}</span>
                        </div>
                        {rep.phone && (
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium text-xs">
                            <Phone size={12} className="text-slate-400 flex-shrink-0" />
                            <span>{rep.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Total Proposals */}
                    <td className="py-3.5 px-3 text-center align-middle">
                      <span className="inline-block px-2.5 py-0.5 bg-slate-100 rounded-md font-sans font-medium text-slate-700 tabular-nums">
                        {rep.totalProposals}
                      </span>
                    </td>

                    {/* In Pipeline */}
                    <td className="py-3.5 px-3 text-center align-middle">
                      <span className="inline-block px-2.5 py-0.5 bg-blue-50 border border-blue-200 rounded-md font-sans font-medium text-blue-700 tabular-nums">
                        {rep.pipelineCount}
                      </span>
                    </td>

                    {/* Won Deals */}
                    <td className="py-3.5 px-3 text-center align-middle">
                      <span className="inline-block px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 rounded-md font-sans font-medium text-emerald-700 tabular-nums">
                        {rep.wonCount}
                      </span>
                    </td>

                    {/* Lost / Expired */}
                    <td className="py-3.5 px-3 text-center align-middle">
                      <span className="inline-block px-2.5 py-0.5 bg-rose-50 border border-rose-200 rounded-md font-sans font-medium text-rose-700 tabular-nums">
                        {rep.lostCount}
                      </span>
                    </td>

                    {/* Closed Revenue (Excl. VAT Base Subscription & 60% GP Tooltip) */}
                    <td className="py-3.5 px-4 text-right align-middle">
                      <div
                        className="font-heading font-semibold text-slate-900 text-sm tabular-nums cursor-help"
                        title={`Net Monthly Base Revenue: ${formatLKR(rep.wonBaseRevenue || rep.wonValue)} (Excl. VAT) | Monthly GP (60%): ${formatLKR(rep.monthlyGrossProfit || rep.wonValue * 0.60)}`}
                      >
                        {formatLKR(rep.wonBaseRevenue || rep.wonValue)}
                      </div>
                      <div
                        className="text-[10px] text-emerald-600 font-sans font-medium cursor-help flex items-center justify-end gap-1 mt-0.5"
                        title={`Annualized GP (12M): ${formatLKR((rep.monthlyGrossProfit || rep.wonValue * 0.60) * 12)}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                        <span>60% GP: {formatLKR(rep.monthlyGrossProfit || rep.wonValue * 0.60)}</span>
                      </div>
                    </td>

                    {/* Win Rate */}
                    <td className="py-3.5 px-4 text-center align-middle">
                      <div className="inline-flex items-center justify-center font-heading font-semibold px-2.5 py-1 rounded-full text-xs bg-slate-100 text-slate-800 border border-slate-200">
                        {rep.winRate}%
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="text-right">
        <span className="text-[11px] text-slate-400 italic">
          Tip: Click on any sales representative above to focus the master proposal feed below.
        </span>
      </div>
    </div>
  );
}
