export type DashboardTransaction = {
  id: number;
  description: string;
  counterparty: string;
  category: string;
  type: "income" | "expense";
  amount: number;
  dueDate: string;
  status: string;
};

export type DashboardData = {
  clients: {
    id: number;
    name: string;
    initials: string;
    mrr: number;
    ltv: number;
    months: number;
  }[];
  team: {
    id: number;
    initials: string;
    name: string;
    role: string;
    monthlyCost: number;
  }[];
  projects: {
    id: number;
    name: string;
    clientName: string;
    progress: number;
    dueDate: string;
    status: string;
  }[];
  proposals: {
    id: number;
    stage: string;
    clientName: string;
    title: string;
    amount: number;
    probability: number;
  }[];
  transactions: DashboardTransaction[];
  chart: { month: string; revenue: number; expenses: number }[];
  healthScore: number;
  conversionRate: number;
  valuationMultiple: number;
};

export function latestMonth(chart: DashboardData["chart"]) {
  return [...chart].sort((a, b) => a.month.localeCompare(b.month)).at(-1) ?? null;
}

export function previousMonth(chart: DashboardData["chart"]) {
  const ordered = [...chart].sort((a, b) => a.month.localeCompare(b.month));
  return ordered.at(-2) ?? null;
}
