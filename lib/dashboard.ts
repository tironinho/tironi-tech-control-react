import { getDb } from "@/db";
import {
  clients,
  monthlyMetrics,
  projects,
  proposals,
  settings,
  teamMembers,
  transactions,
} from "@/db/schema";
import type { DashboardData } from "@/lib/dashboard-types";
import { monthsSince, toNumber } from "@/lib/money";

export type { DashboardData, DashboardTransaction } from "@/lib/dashboard-types";

export async function getDashboardData(): Promise<DashboardData> {
  const db = getDb();
  const [
    clientRows,
    teamRows,
    projectRows,
    proposalRows,
    transactionRows,
    metricRows,
    settingRows,
  ] = await Promise.all([
    db.select().from(clients).orderBy(clients.name),
    db.select().from(teamMembers).orderBy(teamMembers.id),
    db.select().from(projects).orderBy(projects.id),
    db.select().from(proposals).orderBy(proposals.id),
    db.select().from(transactions).orderBy(transactions.dueDate),
    db.select().from(monthlyMetrics).orderBy(monthlyMetrics.month),
    db.select().from(settings),
  ]);

  const settingMap = Object.fromEntries(settingRows.map((row) => [row.key, row.value]));

  return {
    clients: clientRows.map((row) => ({
      id: row.id,
      name: row.name,
      initials: row.initials,
      mrr: toNumber(row.mrr),
      ltv: toNumber(row.ltv),
      months: monthsSince(row.startedAt),
    })),
    team: teamRows.map((row) => ({
      id: row.id,
      initials: row.initials,
      name: row.name,
      role: row.role,
      monthlyCost: toNumber(row.monthlyCost),
    })),
    projects: projectRows.map((row) => ({
      id: row.id,
      name: row.name,
      clientName: row.clientName,
      progress: row.progress,
      dueDate: row.dueDate,
      status: row.status,
    })),
    proposals: proposalRows.map((row) => ({
      id: row.id,
      stage: row.stage,
      clientName: row.clientName,
      title: row.title,
      amount: toNumber(row.amount),
      probability: row.probability,
    })),
    transactions: transactionRows.map((row) => ({
      id: row.id,
      description: row.description,
      counterparty: row.counterparty,
      category: row.category,
      type: row.type as "income" | "expense",
      amount: toNumber(row.amount),
      dueDate: row.dueDate,
      status: row.status,
    })),
    chart: metricRows.map((row) => ({
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
  const db = getDb();
  const [row] = await db
    .insert(transactions)
    .values({
      description: input.description,
      counterparty: input.counterparty,
      category: input.category,
      type: input.type,
      amount: input.amount.toFixed(2),
      dueDate: input.dueDate,
      status: input.type === "income" ? "receivable" : "payable",
    })
    .returning();

  if (!row) {
    throw new Error("Could not create transaction");
  }

  return row;
}
