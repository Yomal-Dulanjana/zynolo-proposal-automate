// src/components/admin/types.ts — Shared Types for HOD Executive Admin Dashboard

export interface AdminProposalItem {
  id: number;
  proposalId: string;
  salesUserId: number;
  salesRepName: string;
  salesRepEmail: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string | null;
  employeeCount: number;
  baseAmount: number;
  vatAmount: number;
  totalAmount: number;
  status:
    | "DRAFT"
    | "HOD_PENDING"
    | "APPROVED"
    | "CHANGES_REQUESTED"
    | "CHANGED_PENDING"
    | "SENT"
    | "VIEWED"
    | "IN_NEGOTIATION"
    | "ACCEPTED"
    | "REJECTED"
    | "EXPIRED";
  stage?: string | null;
  isHodApproved?: boolean;
  proposalDate: string;
  expiryDate: string;
  pdfPath: string;
  hodComment?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  cogsEstimated?: number | null;
  cogsRateWithVat?: number | null;
  totalCogsAmount?: number | null;
  grossProfit?: number | null;
  grossMarginPct?: number | null;
  lossReason?: string | null;
  lossNotes?: string | null;
  lastContactedAt?: string | null;
}

export interface RepPerformanceMetric {
  repId: number;
  repName: string;
  email: string;
  phone: string;
  totalProposals: number;
  pipelineCount: number;
  pipelineValue: number;
  wonCount: number;
  wonValue: number;
  lostCount: number;
  lostValue: number;
  winRate: number; // percentage, e.g. 33.3
}

export interface DepartmentMetrics {
  totalRevenueWon: number;
  totalPipelineValue: number;
  totalProposalsDispatched: number;
  overallCloseRate: number; // percentage
  wonCount: number;
  activeCount: number;
  lostCount: number;
  totalGrossProfitWon?: number;
  averageGrossMargin?: number;
}

export interface MonthlyDepartmentTrend {
  month: string;
  proposed: number;
  won: number;
  lost: number;
  count: number;
}

export interface AdminDashboardData {
  metrics: DepartmentMetrics;
  leaderboard: RepPerformanceMetric[];
  proposals: AdminProposalItem[];
  monthlyTrend: MonthlyDepartmentTrend[];
  adminEmail: string;
}
