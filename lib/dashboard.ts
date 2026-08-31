import "server-only";
import type { DashboardData } from "@/lib/dashboard-types";
import { monthsSince, toNumber } from "@/lib/money";
import { getSupabase } from "@/lib/supabase";

export type { DashboardData, DashboardTransaction } from "@/lib/dashboard-types";

function throwIfError(error: { message: string } | null, label: string) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = getSupabase();
  const [
    clients,
    team,
    projectRows,
    proposalRows,
    transactionRows,
    metrics,
    settingRows,
  ] = await Promise.all([
    supabase.from("clients").select("*").order("name"),
    supabase.from("team_members").select("*").order("id"),
    supabase.from("projects").select("*").order("id"),
    supabase.from("proposals").select("*").order("id"),
    supabase.from("transactions").select("*").order("due_date"),
    supabase.from("monthly_metrics").select("*").order("month"),
    supabase.from("settings").select("*"),
  ]);

  throwIfError(clients.error, "clients");
  throwIfError(team.error, "team_members");
  throwIfError(projectRows.error, "projects");
  throwIfError(proposalRows.error, "proposals");
  throwIfError(transactionRows.error, "transactions");
  throwIfError(metrics.error, "monthly_metrics");
  throwIfError(settingRows.error, "settings");

  const settingMap = Object.fromEntries(
    (settingRows.data ?? []).map((row) => [row.key, row.value]),
  );

  return {
    clients: (clients.data ?? []).map((row) => ({
      id: Number(row.id),
      name: row.name,
      initials: row.initials,
      mrr: toNumber(row.mrr),
      ltv: toNumber(row.ltv),
      months: monthsSince(row.started_at),
    })),
    team: (team.data ?? []).map((row) => ({
      id: Number(row.id),
      initials: row.initials,
      name: row.name,
      role: row.role,
      monthlyCost: toNumber(row.monthly_cost),
    })),
    projects: (projectRows.data ?? []).map((row) => ({
      id: Number(row.id),
      name: row.name,
      clientName: row.client_name,
      progress: Number(row.progress),
      dueDate: row.due_date,
      status: row.status,
    })),
    proposals: (proposalRows.data ?? []).map((row) => ({
      id: Number(row.id),
      stage: row.stage,
      clientName: row.client_name,
      title: row.title,
      amount: toNumber(row.amount),
      probability: Number(row.probability),
    })),
    transactions: (transactionRows.data ?? []).map((row) => ({
      id: Number(row.id),
      description: row.description,
      counterparty: row.counterparty,
      category: row.category,
      type: row.type as "income" | "expense",
      amount: toNumber(row.amount),
      dueDate: row.due_date,
      status: row.status,
    })),
    chart: (metrics.data ?? []).map((row) => ({
      month: row.month,
      revenue: toNumber(row.revenue),
      expenses: toNumber(row.expenses),
    })),
    healthScore: Number(settingMap.health_score ?? 0),
    conversionRate: Number(settingMap.conversion_rate ?? 0),
    valuationMultiple: Number(settingMap.valuation_multiple ?? 4.2),
  };
}

export async function createTransaction(input: {
  description: string;
  counterparty: string;
  category: string;
  type: "income" | "expense";
  amount: number;
  dueDate: string;
}) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      description: input.description,
      counterparty: input.counterparty,
      category: input.category,
      type: input.type,
      amount: input.amount.toFixed(2),
      due_date: input.dueDate,
      status: input.type === "income" ? "receivable" : "payable",
    })
    .select("id")
    .single();

  throwIfError(error, "transactions");
  if (!data) throw new Error("Could not create transaction");
  return data;
}
