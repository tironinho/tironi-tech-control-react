import "server-only";
import type { DashboardData, PipelineData } from "@/lib/dashboard-types";
import { monthsSince, toNumber } from "@/lib/money";
import { isRecurringIncome, monthKey, monthlyDates, normalizeDate } from "@/lib/recurrence";
import { mapLegacyProjectStage } from "@/lib/pipeline";
import { hashPassword } from "@/lib/password";
import { getSupabase } from "@/lib/supabase";

export type { DashboardData, DashboardTransaction, PipelineData, ActivityItem } from "@/lib/dashboard-types";

function throwIfError(error: { message: string } | null, label: string) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

function buildFinanceChart(
  metrics: { month: string; revenue: number; expenses: number }[],
  transactions: { dueDate: string; type: "income" | "expense"; amount: number }[],
) {
  const metricMap = new Map(
    metrics.map((row) => [monthKey(row.month), { revenue: row.revenue, expenses: row.expenses }]),
  );
  const txnRevenue = new Map<string, number>();
  const txnExpenses = new Map<string, number>();

  for (const row of transactions) {
    const key = monthKey(row.dueDate);
    if (row.type === "income") {
      txnRevenue.set(key, (txnRevenue.get(key) ?? 0) + row.amount);
    } else {
      txnExpenses.set(key, (txnExpenses.get(key) ?? 0) + row.amount);
    }
  }

  const keys = new Set([...metricMap.keys(), ...txnRevenue.keys(), ...txnExpenses.keys()]);
  return [...keys]
    .sort()
    .map((key) => ({
      month: `${key}-01`,
      revenue: txnRevenue.has(key) ? (txnRevenue.get(key) ?? 0) : (metricMap.get(key)?.revenue ?? 0),
      expenses: txnExpenses.has(key) ? (txnExpenses.get(key) ?? 0) : (metricMap.get(key)?.expenses ?? 0),
    }));
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
    sectorRows,
    userRows,
  ] = await Promise.all([
    supabase.from("clients").select("*").order("name"),
    supabase.from("team_members").select("*").order("id"),
    supabase.from("projects").select("*").order("id"),
    supabase.from("proposals").select("*").order("id"),
    supabase.from("transactions").select("*").order("due_date"),
    supabase.from("monthly_metrics").select("*").order("month"),
    supabase.from("settings").select("*"),
    supabase.from("sectors").select("*").order("name"),
    supabase.from("app_users").select("username, team_member_id"),
  ]);

  throwIfError(clients.error, "clients");
  throwIfError(team.error, "team_members");
  throwIfError(projectRows.error, "projects");
  throwIfError(proposalRows.error, "proposals");
  throwIfError(transactionRows.error, "transactions");
  throwIfError(metrics.error, "monthly_metrics");
  throwIfError(settingRows.error, "settings");
  throwIfError(sectorRows.error, "sectors");
  throwIfError(userRows.error, "app_users");

  const settingMap = Object.fromEntries(
    (settingRows.data ?? []).map((row) => [row.key, row.value]),
  );

  const sectorMap = new Map(
    (sectorRows.data ?? []).map((row) => [Number(row.id), { name: row.name as string, slug: row.slug as string }]),
  );
  const loginMap = new Map(
    (userRows.data ?? [])
      .filter((row) => row.team_member_id != null)
      .map((row) => [Number(row.team_member_id), row.username as string]),
  );
  const teamName = new Map(
    (team.data ?? []).map((row) => [Number(row.id), row.name as string]),
  );
  const seriesStart = new Map<string, string>();
  for (const row of transactionRows.data ?? []) {
    if (!row.series_id) continue;
    const due = normalizeDate(row.due_date);
    if (!due) continue;
    const current = seriesStart.get(row.series_id);
    if (!current || due < current) seriesStart.set(row.series_id, due);
  }

  const transactions = (transactionRows.data ?? []).map((row) => ({
    id: Number(row.id),
    description: row.description,
    counterparty: row.counterparty,
    clientId: row.client_id == null ? null : Number(row.client_id),
    category: row.category,
    type: row.type as "income" | "expense",
    amount: toNumber(row.amount),
    dueDate: normalizeDate(row.due_date),
    status: row.status,
    seriesId: row.series_id ?? null,
    endsAt: row.ends_at ? normalizeDate(row.ends_at) : null,
    seriesStart: normalizeDate(
      row.series_id ? (seriesStart.get(row.series_id) ?? row.due_date) : row.due_date,
    ),
  }));

  return {
    clients: (clients.data ?? []).map((row) => ({
      id: Number(row.id),
      name: row.name,
      initials: row.initials,
      mrr: toNumber(row.mrr),
      ltv: toNumber(row.ltv),
      months: monthsSince(row.started_at),
      startedAt: row.started_at,
    })),
    team: (team.data ?? []).map((row) => ({
      id: Number(row.id),
      initials: row.initials,
      name: row.name,
      role: row.role,
      monthlyCost: toNumber(row.monthly_cost),
      sectorId: row.sector_id == null ? null : Number(row.sector_id),
      sectorName: row.sector_id == null ? "—" : (sectorMap.get(Number(row.sector_id))?.name ?? "—"),
      username: loginMap.get(Number(row.id)) ?? null,
      hasLogin: loginMap.has(Number(row.id)),
    })),
    sectors: (sectorRows.data ?? []).map((row) => ({
      id: Number(row.id),
      name: row.name,
      slug: row.slug,
    })),
    projects: (projectRows.data ?? []).map((row) => ({
      id: Number(row.id),
      name: row.name,
      clientId: row.client_id == null ? null : Number(row.client_id),
      clientName: row.client_name,
      progress: Number(row.progress),
      dueDate: row.due_date,
      status: mapLegacyProjectStage(row.status),
      contactName: row.contact_name ?? "",
      phone: row.phone ?? "",
      notes: row.notes ?? "",
      ownerId: row.owner_id == null ? null : Number(row.owner_id),
      ownerName: row.owner_id == null ? "" : (teamName.get(Number(row.owner_id)) ?? ""),
    })),
    proposals: (proposalRows.data ?? []).map((row) => ({
      id: Number(row.id),
      stage: row.stage,
      clientName: row.client_name,
      title: row.title,
      amount: toNumber(row.amount),
      probability: Number(row.probability),
      contactName: row.contact_name ?? "",
      phone: row.phone ?? "",
      notes: row.notes ?? "",
      ownerId: row.owner_id == null ? null : Number(row.owner_id),
      ownerName: row.owner_id == null ? "" : (teamName.get(Number(row.owner_id)) ?? ""),
    })),
    transactions,
    chart: buildFinanceChart(
      (metrics.data ?? []).map((row) => ({
        month: row.month,
        revenue: toNumber(row.revenue),
        expenses: toNumber(row.expenses),
      })),
      transactions,
    ),
    healthScore: Number(settingMap.health_score ?? 0),
    conversionRate: Number(settingMap.conversion_rate ?? 0),
    valuationMultiple: Number(settingMap.valuation_multiple ?? 4.2),
  };
}

export async function getPipelineData(): Promise<PipelineData> {
  const supabase = getSupabase();
  const [clients, team, projectRows, proposalRows, sectorRows] = await Promise.all([
    supabase.from("clients").select("id, name, initials").order("name"),
    supabase.from("team_members").select("id, initials, name, role, sector_id").order("id"),
    supabase.from("projects").select("*").order("id"),
    supabase.from("proposals").select("*").order("id"),
    supabase.from("sectors").select("*").order("name"),
  ]);

  throwIfError(clients.error, "clients");
  throwIfError(team.error, "team_members");
  throwIfError(projectRows.error, "projects");
  throwIfError(proposalRows.error, "proposals");
  throwIfError(sectorRows.error, "sectors");

  const teamName = new Map(
    (team.data ?? []).map((row) => [Number(row.id), row.name as string]),
  );

  return {
    clients: (clients.data ?? []).map((row) => ({
      id: Number(row.id),
      name: row.name,
      initials: row.initials,
      mrr: 0,
      ltv: 0,
      months: 0,
      startedAt: "",
    })),
    team: (team.data ?? []).map((row) => ({
      id: Number(row.id),
      initials: row.initials,
      name: row.name,
      role: row.role,
      monthlyCost: 0,
      sectorId: row.sector_id == null ? null : Number(row.sector_id),
      sectorName: row.sector_id == null ? "—" : "—",
      username: null,
      hasLogin: false,
    })),
    sectors: (sectorRows.data ?? []).map((row) => ({
      id: Number(row.id),
      name: row.name,
      slug: row.slug,
    })),
    projects: (projectRows.data ?? []).map((row) => ({
      id: Number(row.id),
      name: row.name,
      clientId: row.client_id == null ? null : Number(row.client_id),
      clientName: row.client_name,
      progress: Number(row.progress),
      dueDate: row.due_date,
      status: mapLegacyProjectStage(row.status),
      contactName: row.contact_name ?? "",
      phone: row.phone ?? "",
      notes: row.notes ?? "",
      ownerId: row.owner_id == null ? null : Number(row.owner_id),
      ownerName: row.owner_id == null ? "" : (teamName.get(Number(row.owner_id)) ?? ""),
    })),
    proposals: (proposalRows.data ?? []).map((row) => ({
      id: Number(row.id),
      stage: row.stage,
      clientName: row.client_name,
      title: row.title,
      amount: toNumber(row.amount),
      probability: Number(row.probability),
      contactName: row.contact_name ?? "",
      phone: row.phone ?? "",
      notes: row.notes ?? "",
      ownerId: row.owner_id == null ? null : Number(row.owner_id),
      ownerName: row.owner_id == null ? "" : (teamName.get(Number(row.owner_id)) ?? ""),
    })),
  };
}

type TransactionInput = {
  description: string;
  clientId: number | null;
  category: string;
  type: "income" | "expense";
  amount: number;
  dueDate: string;
  status?: string;
  endsAt?: string | null;
};

async function resolveCounterparty(clientId: number | null, fallback: string) {
  if (!clientId) return { clientId: null, counterparty: fallback };
  const supabase = getSupabase();
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, name")
    .eq("id", clientId)
    .single();
  throwIfError(clientError, "clients");
  if (!client) throw new Error("Cliente não encontrado.");
  return { clientId: Number(client.id), counterparty: client.name as string };
}

function defaultStatus(type: "income" | "expense", status?: string) {
  if (status) return status;
  return type === "income" ? "receivable" : "payable";
}

function recurringWindow(input: TransactionInput) {
  if (!isRecurringIncome(input.category, input.type)) return null;
  if (!input.endsAt) throw new Error("Informe a data de fim do contrato.");
  return monthlyDates(input.dueDate, input.endsAt);
}

function occurrenceStatus(index: number, type: "income" | "expense", status?: string) {
  if (index === 0) return defaultStatus(type, status);
  return type === "income" ? "expected" : "payable";
}

export async function createTransaction(input: TransactionInput) {
  if (input.type === "income" && !input.clientId) {
    throw new Error("Selecione o cliente da receita.");
  }

  const { clientId, counterparty } = await resolveCounterparty(
    input.clientId,
    input.description,
  );
  const dates = recurringWindow(input);
  const supabase = getSupabase();

  if (!dates) {
    const { data, error } = await supabase
      .from("transactions")
      .insert({
        description: input.description,
        counterparty,
        client_id: clientId,
        category: input.category,
        type: input.type,
        amount: input.amount.toFixed(2),
        due_date: input.dueDate,
        status: defaultStatus(input.type, input.status),
        series_id: null,
        ends_at: null,
        recurrence: "none",
      })
      .select("id")
      .single();

    throwIfError(error, "transactions");
    if (!data) throw new Error("Could not create transaction");
    return data;
  }

  const seriesId = crypto.randomUUID();
  const rows = dates.map((dueDate, index) => ({
    description: input.description,
    counterparty,
    client_id: clientId,
    category: input.category,
    type: input.type,
    amount: input.amount.toFixed(2),
    due_date: dueDate,
    status: occurrenceStatus(index, input.type, input.status),
    series_id: seriesId,
    ends_at: input.endsAt,
    recurrence: "monthly",
  }));

  const { data, error } = await supabase.from("transactions").insert(rows).select("id");
  throwIfError(error, "transactions");
  if (!data?.[0]) throw new Error("Could not create transaction");
  return data[0];
}

export async function updateTransaction(id: number, input: TransactionInput) {
  if (input.type === "income" && !input.clientId) {
    throw new Error("Selecione o cliente da receita.");
  }

  const { clientId, counterparty } = await resolveCounterparty(
    input.clientId,
    input.description,
  );
  const supabase = getSupabase();
  const { data: current, error: currentError } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .single();
  throwIfError(currentError, "transactions");
  if (!current) throw new Error("Lançamento não encontrado.");

  const dates = recurringWindow(input);

  if (!dates) {
    if (current.series_id) {
      const { error: extraError } = await supabase
        .from("transactions")
        .delete()
        .eq("series_id", current.series_id)
        .neq("id", id);
      throwIfError(extraError, "transactions");
    }
    const { data, error } = await supabase
      .from("transactions")
      .update({
        description: input.description,
        counterparty,
        client_id: clientId,
        category: input.category,
        type: input.type,
        amount: input.amount.toFixed(2),
        due_date: input.dueDate,
        status: defaultStatus(input.type, input.status),
        series_id: null,
        ends_at: null,
        recurrence: "none",
      })
      .eq("id", id)
      .select("id")
      .single();

    throwIfError(error, "transactions");
    if (!data) throw new Error("Lançamento não encontrado.");
    return data;
  }

  const seriesId = current.series_id || crypto.randomUUID();
  const { data: seriesRows, error: seriesError } = current.series_id
    ? await supabase.from("transactions").select("*").eq("series_id", current.series_id)
    : { data: [current], error: null };
  throwIfError(seriesError, "transactions");

  const paidByMonth = new Map(
    (seriesRows ?? [])
      .filter((row) => row.status === "paid")
      .map((row) => [monthKey(row.due_date), row]),
  );

  if (current.series_id) {
    const { error: deleteError } = await supabase
      .from("transactions")
      .delete()
      .eq("series_id", seriesId)
      .neq("status", "paid");
    throwIfError(deleteError, "transactions");
  } else if (current.status !== "paid") {
    const { error: deleteError } = await supabase.from("transactions").delete().eq("id", id);
    throwIfError(deleteError, "transactions");
  }

  const shared = {
    description: input.description,
    counterparty,
    client_id: clientId,
    category: input.category,
    type: input.type,
    amount: input.amount.toFixed(2),
    ends_at: input.endsAt,
    series_id: seriesId,
    recurrence: "monthly",
  };

  for (const paid of paidByMonth.values()) {
    const { error: paidError } = await supabase
      .from("transactions")
      .update(shared)
      .eq("id", paid.id);
    throwIfError(paidError, "transactions");
  }

  const toInsert = dates
    .filter((dueDate) => !paidByMonth.has(monthKey(dueDate)))
    .map((dueDate, index) => ({
      ...shared,
      due_date: dueDate,
      status:
        dueDate === current.due_date
          ? defaultStatus(input.type, input.status)
          : occurrenceStatus(index, input.type, input.status),
    }));

  if (toInsert.length) {
    const { error: insertError } = await supabase.from("transactions").insert(toInsert);
    throwIfError(insertError, "transactions");
  }

  return { id };
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
  sectorId: number | null;
  username?: string;
  password?: string;
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
      sector_id: input.sectorId,
    })
    .select("id")
    .single();

  throwIfError(error, "team_members");
  if (!data) throw new Error("Could not create team member");
  if (input.username && input.password) {
    await upsertStaffLogin(Number(data.id), input.username, input.password);
  }
  return data;
}

export async function createProject(input: {
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
  author?: string;
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
      contact_name: input.contactName,
      phone: input.phone,
      notes: input.notes,
      owner_id: input.ownerId,
    })
    .select("id")
    .single();

  throwIfError(error, "projects");
  if (!data) throw new Error("Could not create project");
  if (input.author) {
    await addActivity("project", Number(data.id), "Projeto criado", input.author);
  }
  return data;
}

export async function createProposal(input: {
  stage: string;
  clientName: string;
  title: string;
  amount: number;
  probability: number;
  contactName: string;
  phone: string;
  notes: string;
  ownerId: number | null;
  author?: string;
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
      contact_name: input.contactName,
      phone: input.phone,
      notes: input.notes,
      owner_id: input.ownerId,
    })
    .select("id")
    .single();

  throwIfError(error, "proposals");
  if (!data) throw new Error("Could not create proposal");
  if (input.author) {
    await addActivity("proposal", Number(data.id), "Proposta criada", input.author);
  }
  return data;
}

export function parseRecordId(id: unknown) {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) throw new Error("Registro inválido.");
  return n;
}

async function updateRow(
  table: string,
  id: number,
  values: Record<string, unknown>,
  missing: string,
) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from(table).update(values).eq("id", id).select("id").single();
  throwIfError(error, table);
  if (!data) throw new Error(missing);
  return data;
}

async function deleteRow(table: string, id: number) {
  const supabase = getSupabase();
  const { error } = await supabase.from(table).delete().eq("id", id);
  throwIfError(error, table);
}

export async function updateClient(
  id: number,
  input: { name: string; initials: string; mrr: number; ltv: number; startedAt: string },
) {
  return updateRow(
    "clients",
    id,
    {
      name: input.name,
      initials: input.initials,
      mrr: input.mrr.toFixed(2),
      ltv: input.ltv.toFixed(2),
      started_at: input.startedAt,
    },
    "Cliente não encontrado.",
  );
}

export async function updateTeamMember(
  id: number,
  input: {
    name: string;
    initials: string;
    role: string;
    monthlyCost: number;
    sectorId: number | null;
    username?: string;
    password?: string;
  },
) {
  const row = await updateRow(
    "team_members",
    id,
    {
      name: input.name,
      initials: input.initials,
      role: input.role,
      monthly_cost: input.monthlyCost.toFixed(2),
      sector_id: input.sectorId,
    },
    "Colaborador não encontrado.",
  );
  if (input.username) {
    await upsertStaffLogin(id, input.username, input.password);
  }
  return row;
}

export async function updateProject(
  id: number,
  input: {
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
  },
  author?: string,
) {
  const previous = await currentValue("projects", id, "status");
  const row = await updateRow(
    "projects",
    id,
    {
      name: input.name,
      client_id: input.clientId,
      client_name: input.clientName,
      progress: input.progress,
      due_date: input.dueDate,
      status: input.status,
      contact_name: input.contactName,
      phone: input.phone,
      notes: input.notes,
      owner_id: input.ownerId,
    },
    "Projeto não encontrado.",
  );
  if (author && previous && previous !== input.status) {
    await addActivity("project", id, `Moveu de ${previous} para ${input.status}`, author);
  }
  return row;
}

export async function updateProposal(
  id: number,
  input: {
    stage: string;
    clientName: string;
    title: string;
    amount: number;
    probability: number;
    contactName: string;
    phone: string;
    notes: string;
    ownerId: number | null;
  },
  author?: string,
) {
  const previous = await currentValue("proposals", id, "stage");
  const row = await updateRow(
    "proposals",
    id,
    {
      stage: input.stage,
      client_name: input.clientName,
      title: input.title,
      amount: input.amount.toFixed(2),
      probability: input.probability,
      contact_name: input.contactName,
      phone: input.phone,
      notes: input.notes,
      owner_id: input.ownerId,
    },
    "Proposta não encontrada.",
  );
  if (author && previous && previous !== input.stage) {
    await addActivity("proposal", id, `Moveu de ${previous} para ${input.stage}`, author);
  }
  return row;
}

export async function deleteTransaction(id: number) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("transactions")
    .select("series_id")
    .eq("id", id)
    .single();
  throwIfError(error, "transactions");
  if (data?.series_id) {
    const { error: seriesError } = await supabase
      .from("transactions")
      .delete()
      .eq("series_id", data.series_id);
    throwIfError(seriesError, "transactions");
    return;
  }
  return deleteRow("transactions", id);
}

export async function deleteClient(id: number) {
  return deleteRow("clients", id);
}

export async function deleteTeamMember(id: number) {
  const supabase = getSupabase();
  const { error: usersError } = await supabase.from("app_users").delete().eq("team_member_id", id);
  throwIfError(usersError, "app_users");
  return deleteRow("team_members", id);
}

export async function deleteProject(id: number) {
  return deleteRow("projects", id);
}

export async function deleteProposal(id: number) {
  return deleteRow("proposals", id);
}

async function currentValue(table: string, id: number, column: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
  throwIfError(error, table);
  if (!data) return null;
  const value = (data as Record<string, unknown>)[column];
  return typeof value === "string" ? value : null;
}

function slugify(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "setor";
}

function throwDuplicate(error: { message: string; code?: string } | null, fallback: string) {
  if (error?.code === "23505" || error?.message.toLowerCase().includes("duplicate")) {
    throw new Error(fallback);
  }
  throwIfError(error, "app_users");
}

export async function upsertStaffLogin(teamMemberId: number, username: string, password?: string) {
  const supabase = getSupabase();
  const normalized = username.trim().toLowerCase();
  if (!normalized) throw new Error("Informe o login do colaborador.");

  const { data: existing, error: existingError } = await supabase
    .from("app_users")
    .select("id")
    .eq("team_member_id", teamMemberId)
    .maybeSingle();
  throwIfError(existingError, "app_users");

  if (existing) {
    const values: Record<string, unknown> = { username: normalized, role: "staff" };
    if (password) values.password_hash = hashPassword(password);
    const { error } = await supabase.from("app_users").update(values).eq("id", existing.id);
    throwDuplicate(error, "Este login já está em uso.");
    return;
  }

  if (!password) throw new Error("Informe a senha do colaborador.");
  const { error } = await supabase.from("app_users").insert({
    username: normalized,
    password_hash: hashPassword(password),
    role: "staff",
    team_member_id: teamMemberId,
  });
  throwDuplicate(error, "Este login já está em uso.");
}

export async function createSector(name: string) {
  const supabase = getSupabase();
  const trimmed = name.trim();
  if (trimmed.length < 2) throw new Error("Informe o nome do setor.");
  const { data, error } = await supabase
    .from("sectors")
    .insert({ name: trimmed, slug: slugify(trimmed) })
    .select("id, name, slug")
    .single();
  if (error?.code === "23505" || error?.message.toLowerCase().includes("duplicate")) {
    throw new Error("Já existe um setor com esse nome.");
  }
  throwIfError(error, "sectors");
  if (!data) throw new Error("Não foi possível criar o setor.");
  return data;
}

export async function addActivity(
  entityType: "proposal" | "project",
  entityId: number,
  message: string,
  author: string,
) {
  const supabase = getSupabase();
  const { error } = await supabase.from("activity_log").insert({
    entity_type: entityType,
    entity_id: entityId,
    message,
    author,
  });
  throwIfError(error, "activity_log");
}

export async function listActivity(entityType: "proposal" | "project", entityId: number) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("activity_log")
    .select("id, message, author, created_at")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  throwIfError(error, "activity_log");
  return (data ?? []).map((row) => ({
    id: Number(row.id),
    message: row.message as string,
    author: row.author as string,
    createdAt: row.created_at as string,
  }));
}

export async function updateProposalStage(id: number, stage: string, author: string) {
  const previous = await currentValue("proposals", id, "stage");
  const row = await updateRow("proposals", id, { stage }, "Proposta não encontrada.");
  if (previous !== stage) {
    await addActivity("proposal", id, `Moveu de ${previous ?? "—"} para ${stage}`, author);
  }
  return row;
}

export async function updateProjectStage(id: number, status: string, author: string) {
  const previous = await currentValue("projects", id, "status");
  const row = await updateRow("projects", id, { status }, "Projeto não encontrado.");
  if (previous !== status) {
    await addActivity("project", id, `Moveu de ${previous ?? "—"} para ${status}`, author);
  }
  return row;
}

