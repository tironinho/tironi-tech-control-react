import {
  bigint,
  date,
  index,
  integer,
  numeric,
  pgSchema,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const tironiTech = pgSchema("tironi_tech");

export const clients = tironiTech.table("clients", {
  id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
  name: text("name").notNull().unique(),
  initials: text("initials").notNull(),
  mrr: numeric("mrr", { precision: 12, scale: 2 }).notNull().default("0"),
  ltv: numeric("ltv", { precision: 12, scale: 2 }).notNull().default("0"),
  startedAt: date("started_at").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const teamMembers = tironiTech.table("team_members", {
  id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
  initials: text("initials").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  monthlyCost: numeric("monthly_cost", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projects = tironiTech.table(
  "projects",
  {
    id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    name: text("name").notNull(),
    clientId: bigint("client_id", { mode: "number" }).references(() => clients.id, {
      onDelete: "set null",
    }),
    clientName: text("client_name").notNull(),
    progress: integer("progress").notNull().default(0),
    dueDate: date("due_date").notNull(),
    status: text("status").notNull().default("on_track"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("projects_client_id_idx").on(table.clientId)],
);

export const proposals = tironiTech.table("proposals", {
  id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
  stage: text("stage").notNull(),
  clientName: text("client_name").notNull(),
  title: text("title").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  probability: integer("probability").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const transactions = tironiTech.table(
  "transactions",
  {
    id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    description: text("description").notNull(),
    counterparty: text("counterparty").notNull(),
    category: text("category").notNull(),
    type: text("type").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    dueDate: date("due_date").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("transactions_due_date_idx").on(table.dueDate),
    index("transactions_type_idx").on(table.type),
  ],
);

export const monthlyMetrics = tironiTech.table("monthly_metrics", {
  id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
  month: date("month").notNull().unique(),
  revenue: numeric("revenue", { precision: 12, scale: 2 }).notNull().default("0"),
  expenses: numeric("expenses", { precision: 12, scale: 2 }).notNull().default("0"),
});

export const settings = tironiTech.table("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
