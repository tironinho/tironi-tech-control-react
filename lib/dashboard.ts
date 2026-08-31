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
      clientId: row.client_id == null ? null : Number(row.client_id),
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
  clientId: number | null;
  category: string;
  type: "income" | "expense";
  amount: number;
  dueDate: string;
}) {
  if (input.type === "income" && !input.clientId) {
    throw new Error("Selecione o cliente da receita.");
  }

  const supabase = getSupabase();
  let counterparty = input.description;

  if (input.clientId) {
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, name")
      .eq("id", input.clientId)
      .single();
    throwIfError(clientError, "clients");
    if (!client) throw new Error("Cliente não encontrado.");
    counterparty = client.name;
  }

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      description: input.description,
      counterparty,
      client_id: input.clientId,
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

export async function createClient(input: {
  name: string;
  initials: string;
  mrr: number;
  ltv: number;
  startedAt: string;
}) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("clients")
    .insert({
      name: input.name,
      initials: input.initials,
      mrr: input.mrr.toFixed(2),
      ltv: input.ltv.toFixed(2),
      started_at: input.startedAt,
      status: "active",
    })
    .select("id")
    .single();

  throwIfError(error, "clients");
  if (!data) throw new Error("Could not create client");
  return data;
}

export async function createTeamMember(input: {
  name: string;
  initials: string;
  role: string;
  monthlyCost: number;
}) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("team_members")
    .insert({
      name: input.name,
      initials: input.initials,
      role: input.role,
      monthly_cost: input.monthlyCost.toFixed(2),
      status: "active",
    })
    .select("id")
    .single();

  throwIfError(error, "team_members");
  if (!data) throw new Error("Could not create team member");
  return data;
}

export async function createProject(input: {
  name: string;
  clientId: number | null;
  clientName: string;
  progress: number;
  dueDate: string;
  status: "on_track" | "at_risk";
}) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: input.name,
      client_id: input.clientId,
      client_name: input.clientName,
      progress: input.progress,
      due_date: input.dueDate,
      status: input.status,
    })
    .select("id")
    .single();

  throwIfError(error, "projects");
  if (!data) throw new Error("Could not create project");
  return data;
}

export async function createProposal(input: {
  stage: string;
  clientName: string;
  title: string;
  amount: number;
  probability: number;
}) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("proposals")
    .insert({
      stage: input.stage,
      client_name: input.clientName,
      title: input.title,
      amount: input.amount.toFixed(2),
      probability: input.probability,
    })
    .select("id")
    .single();

  throwIfError(error, "proposals");
  if (!data) throw new Error("Could not create proposal");
  return data;
}
