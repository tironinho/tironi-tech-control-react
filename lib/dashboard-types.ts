export type DashboardTransaction = {
  id: number;
  description: string;
  counterparty: string;
  clientId: number | null;
  category: string;
  type: "income" | "expense";
  amount: number;
  dueDate: string;
  status: string;
  seriesId: string | null;
  endsAt: string | null;
  seriesStart: string;
};

export type DashboardData = {
  clients: {
    id: number;
    name: string;
    initials: string;
    mrr: number;
    ltv: number;
    months: number;
    startedAt: string;
  }[];
  team: {
    id: number;
    initials: string;
    name: string;
    role: string;
    monthlyCost: number;
    sectorId: number | null;
    sectorName: string;
    username: string | null;
    hasLogin: boolean;
  }[];
  sectors: {
    id: number;
    name: string;
    slug: string;
  }[];
  projects: {
    id: number;
    name: string;
    clientId: number | null;
    clientName: string;
    progress: number;
    dueDate: string;
    status: string;
    contactName: string;
    phone: string;
    notes: string;
    ownerId: number | null;
    ownerName: string;
  }[];
  proposals: {
    id: number;
    stage: string;
    clientName: string;
    title: string;
    amount: number;
    probability: number;
    contactName: string;
    phone: string;
    notes: string;
    ownerId: number | null;
    ownerName: string;
  }[];
  transactions: DashboardTransaction[];
  chart: { month: string; revenue: number; expenses: number }[];
  healthScore: number;
  conversionRate: number;
  valuationMultiple: number;
};

export type PipelineData = Pick<DashboardData, "clients" | "team" | "sectors" | "projects" | "proposals">;

export type ActivityItem = {
  id: number;
  message: string;
  author: string;
  createdAt: string;
};

export function latestMonth(chart: DashboardData["chart"]) {
  return [...chart].sort((a, b) => a.month.localeCompare(b.month)).at(-1) ?? null;
}

export function previousMonth(chart: DashboardData["chart"]) {
  const ordered = [...chart].sort((a, b) => a.month.localeCompare(b.month));
  return ordered.at(-2) ?? null;
}
