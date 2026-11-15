// src/components/admin/AdminClientsView.tsx — Company-Wide Corporate Accounts Oversight
import React, { useState, useMemo } from "react";
import { Building2, Search, User, Mail, Phone, MapPin, FileText, ChevronDown, X } from "lucide-react";

export interface AdminClientItem {
  id: number;
  companyName: string;
  address: string;
  contactPerson?: string | null;
  contactEmail: string;
  contactPhone?: string | null;
  logoUrl?: string | null;
  salesRepName: string;
  salesRepEmail: string;
  salesUserId: number;
  proposalCount: number;
  totalValue: number;
  wonValue: number;
}

interface AdminClientsViewProps {
  clients: AdminClientItem[];
  reps: Array<{ repId: number; repName: string }>;
}

export default function AdminClientsView({ clients, reps }: AdminClientsViewProps) {
  const [search, setSearch] = useState("");
  const [selectedRepId, setSelectedRepId] = useState<string>("ALL");

  const formatLKR = (num: number) =>
    `Rs. ${(num || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      if (selectedRepId !== "ALL" && c.salesUserId !== Number(selectedRepId)) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          c.companyName.toLowerCase().includes(q) ||
          c.contactEmail.toLowerCase().includes(q) ||
          (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
          c.salesRepName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [clients, selectedRepId, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-heading font-semibold text-2xl text-slate-900 tracking-tight flex items-center gap-2.5">
            <Building2 className="text-red-600" size={26} />
            Corporate Accounts &amp; Organizations
          </h2>
          <p className="text-xs text-slate-500 font-sans mt-1">
            Department-wide directory of client organizations, primary stakeholders, and assigned representatives.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, contact person, or email..."
            className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-600"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="relative sm:w-64">
          <select
            value={selectedRepId}
            onChange={(e) => setSelectedRepId(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-600 appearance-none cursor-pointer pr-10"
          >
            <option value="ALL">All Representatives ({reps.length})</option>
            {reps.map((r) => (
              <option key={r.repId} value={String(r.repId)}>
                Rep: {r.repName}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-xs font-bold tracking-wider border-b border-slate-800">
                <th className="py-3.5 px-5 text-left">ORGANIZATION &amp; LOGO</th>
                <th className="py-3.5 px-5 text-left">ASSIGNED SALES REP</th>
                <th className="py-3.5 px-5 text-left">PRIMARY CONTACT</th>
                <th className="py-3.5 px-5 text-center">PROPOSALS</th>
                <th className="py-3.5 px-5 text-right">TOTAL DEAL VOLUME</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Building2 size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No corporate client accounts match your search</p>
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Organization & Logo */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-2xs">
                          {client.logoUrl ? (
                            <img
                              src={client.logoUrl}
                              alt={client.companyName}
                              className="max-w-full max-h-full object-contain"
                            />
                          ) : (
                            <span className="text-sm font-black text-slate-400">
                              {client.companyName.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-900">{client.companyName}</div>
                          <div className="text-slate-400 text-xs flex items-center gap-1 mt-0.5 max-w-xs truncate">
                            <MapPin size={11} className="text-slate-400 flex-shrink-0" />
                            <span className="truncate">{client.address}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Assigned Sales Rep */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px]">
                          {client.salesRepName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{client.salesRepName}</div>
                          <div className="text-[10px] text-slate-400">{client.salesRepEmail}</div>
                        </div>
                      </div>
                    </td>

                    {/* Primary Contact */}
                    <td className="py-4 px-5">
                      <div className="space-y-1">
                        {client.contactPerson && (
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <User size={12} className="text-slate-400" />
                            <span>{client.contactPerson}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Mail size={12} className="text-slate-400" />
                          <span>{client.contactEmail}</span>
                        </div>
                        {client.contactPhone && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Phone size={12} className="text-slate-400" />
                            <span>{client.contactPhone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Proposals */}
                    <td className="py-4 px-5 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
                        <FileText size={12} className="text-red-600" />
                        <span>{client.proposalCount}</span>
                      </span>
                    </td>

                    {/* Total Deal Volume */}
                    <td className="py-4 px-5 text-right">
                      <div className="font-black text-slate-900 text-sm">
                        {formatLKR(client.totalValue)}
                      </div>
                      {client.wonValue > 0 && (
                        <div className="text-[11px] font-semibold text-emerald-600 mt-0.5">
                          Won: {formatLKR(client.wonValue)}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
