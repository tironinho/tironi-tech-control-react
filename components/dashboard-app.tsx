"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  Search,
  Target,
  TrendingUp,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import type { DashboardData } from "@/lib/dashboard-types";
import { formatDueDate, money, monthLabel } from "@/lib/money";
import { addMonths, monthKey, monthStart } from "@/lib/recurrence";
import { CreateButton, CreateRecordModal, type CreateKind, type ModalEdit } from "@/components/create-record-modal";
import { KanbanBoard } from "@/components/kanban-board";
import { ConfirmDelete, RecordTools } from "@/components/record-tools";
import { PROJECT_STAGES, PROPOSAL_STAGES } from "@/lib/pipeline";

type Screen =
  | "Visão geral"
  | "Financeiro"
  | "Contas"
  | "Despesas"
  | "Propostas"
  | "Projetos"
  | "Equipe"
  | "Clientes"
  | "Valuation";

const nav = [
  ["Visão geral", LayoutDashboard],
  ["Financeiro", BarChart3],
  ["Contas", ReceiptText],
  ["Despesas", Banknote],
  ["Propostas", FileText],
  ["Projetos", FolderKanban],
  ["Equipe", Users],
  ["Clientes", Building2],
  ["Valuation", TrendingUp],
] as const;

function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function statusLabel(status: string) {
  if (status === "receivable") return "A receber";
  if (status === "expected") return "Previsto";
  if (status === "payable") return "A pagar";
  if (status === "paid") return "Pago";
  if (status === "at_risk" || status === "Atenção") return "Atenção";
  if (status === "on_track") return "No prazo";
  return status;
}

function statusTone(status: string) {
  if (status === "expected") return "blue";
  if (status === "payable" || status === "at_risk" || status === "Atenção") return "amber";
  return "";
}

function transactionEdit(item: DashboardData["transactions"][number]): ModalEdit {
  return {
    id: item.id,
    description: item.description,
    amount: item.amount,
    dueDate: item.seriesStart,
    category: item.category,
    type: item.type,
    clientId: item.clientId,
    status: item.status,
    endsAt: item.endsAt,
    seriesId: item.seriesId,
  };
}

function Metric({
  n,
  v,
  s,
  I,
  t = "",
}: {
  n: string;
  v: string;
  s: string;
  I: React.ComponentType<{ size?: number }>;
  t?: string;
}) {
  return (
    <article className="metric">
      <i className={t}>
        <I size={18} />
      </i>
      <div>
        <small>{n}</small>
        <strong>{v}</strong>
        <span>{s}</span>
      </div>
    </article>
  );
}

function Title({ n, s, action }: { n: string; s: string; action?: React.ReactNode }) {
  return (
    <div className="title">
      <div>
        <h2>{n}</h2>
        <p>{s}</p>
      </div>
      <div className="title-actions">
        {action}
        <button type="button">
          <CalendarDays size={16} />
          Agosto de 2026
          <ChevronDown size={15} />
        </button>
      </div>
    </div>
  );
}

function Head({ n, s }: { n: string; s: string }) {
  return (
    <header className="head">
      <h3>{n}</h3>
      <p>{s}</p>
    </header>
  );
}

function Status({ children, t = "" }: { children: React.ReactNode; t?: string }) {
  return (
    <span className={"status " + t}>
      <i />
      {children}
    </span>
  );
}

function Graph({
  chart,
  selected,
  onSelect,
}: {
  chart: DashboardData["chart"];
  selected?: string | null;
  onSelect?: (monthKey: string) => void;
}) {
  const data = chart.map((row) => {
    const key = monthKey(row.month);
    return {
      key,
      m: `${monthLabel(row.month)}/${row.month.slice(2, 4)}`,
      r: row.revenue,
      d: row.expenses,
      selected: selected === key,
    };
  });

  return (
    <div className="graph">
      <ResponsiveContainer>
        <AreaChart
          data={data}
          style={{ cursor: onSelect ? "pointer" : undefined }}
          onClick={(state) => {
            const index =
              typeof state?.activeTooltipIndex === "number"
                ? state.activeTooltipIndex
                : typeof state?.activeIndex === "number"
                  ? state.activeIndex
                  : Number(state?.activeTooltipIndex);
            const key = Number.isInteger(index) ? data[index]?.key : undefined;
            if (key && onSelect) onSelect(key);
          }}
        >
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#3ce4a3" stopOpacity=".35" />
              <stop offset="1" stopColor="#3ce4a3" stopOpacity="0" />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#233247" strokeDasharray="3 3" />
          <XAxis dataKey="m" stroke="#728198" axisLine={false} tickLine={false} />
          <YAxis
            stroke="#728198"
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => v / 1000 + "k"}
          />
          <Tooltip
            contentStyle={{ background: "#132134", border: "1px solid #29394e", borderRadius: 10 }}
            formatter={(value, name) => [
              money(Number(value ?? 0)),
              name === "r" ? "Receita" : "Despesas",
            ]}
            labelFormatter={(label) => `${label} · clique para detalhar`}
          />
          <Area dataKey="r" stroke="#3ce4a3" fill="url(#g)" strokeWidth={2.5} name="r" />
          <Area dataKey="d" stroke="#7088a6" fill="none" strokeWidth={2} name="d" />
        </AreaChart>
      </ResponsiveContainer>
      {onSelect ? <p className="chart-hint">Clique em um mês do gráfico para ver receitas e despesas.</p> : null}
    </div>
  );
}

function MonthLedger({
  month,
  transactions,
}: {
  month: string;
  transactions: DashboardData["transactions"];
}) {
  const rows = transactions
    .filter((item) => monthKey(item.dueDate) === month)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id - b.id);
  const income = rows.filter((item) => item.type === "income");
  const expenses = rows.filter((item) => item.type === "expense");
  const incomeTotal = income.reduce((sum, item) => sum + item.amount, 0);
  const expenseTotal = expenses.reduce((sum, item) => sum + item.amount, 0);
  const label = `${monthLabel(`${month}-01`)} ${month.slice(0, 4)}`;

  return (
    <section className="panel month-ledger">
      <Head
        n={`Detalhe de ${label}`}
        s={`Receitas ${money(incomeTotal)} · Despesas ${money(expenseTotal)} · Líquido ${money(incomeTotal - expenseTotal)}`}
      />
      <div className="grid">
        <div>
          <h4 className="ledger-title green">Receitas ({income.length})</h4>
          {income.length ? (
            income.map((item) => (
              <div className="item" key={item.id}>
                <i>
                  {formatDueDate(item.dueDate).slice(0, 2)}
                  <small>{monthLabel(item.dueDate)}</small>
                </i>
                <span>
                  <b>{item.counterparty}</b>
                  <small>
                    {item.description} · {item.category} · {statusLabel(item.status)}
                  </small>
                </span>
                <strong className="green">+ {money(item.amount)}</strong>
              </div>
            ))
          ) : (
            <p className="empty">Nenhuma receita neste mês.</p>
          )}
        </div>
        <div>
          <h4 className="ledger-title red">Despesas ({expenses.length})</h4>
          {expenses.length ? (
            expenses.map((item) => (
              <div className="item" key={item.id}>
                <i>
                  {formatDueDate(item.dueDate).slice(0, 2)}
                  <small>{monthLabel(item.dueDate)}</small>
                </i>
                <span>
                  <b>{item.description}</b>
                  <small>
                    {item.category} · {statusLabel(item.status)}
                  </small>
                </span>
                <strong className="red">− {money(item.amount)}</strong>
              </div>
            ))
          ) : (
            <p className="empty">Nenhuma despesa neste mês.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function sliceChart(chart: DashboardData["chart"], fromKey: string, toKey: string) {
  return chart.filter((row) => {
    const key = monthKey(row.month);
    return key >= fromKey && key <= toKey;
  });
}

export function DashboardApp({
  initialData,
  userName,
}: {
  initialData: DashboardData;
  userName: string;
}) {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("Visão geral");
  const [menu, setMenu] = useState(false);
  const [modal, setModal] = useState<{ kind: CreateKind; edit?: ModalEdit } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    kind: CreateKind;
    id: number;
    label: string;
    series?: boolean;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [moves, setMoves] = useState<Record<string, string>>({});
  const [sectorName, setSectorName] = useState("");
  const [sectorError, setSectorError] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(monthKey(new Date().toISOString().slice(0, 10)));

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  function openCreate(kind: CreateKind) {
    setModal({ kind });
  }

  async function moveCard(kind: "proposal" | "project", id: number, column: string) {
    const key = `${kind}-${id}`;
    setMoves((current) => ({ ...current, [key]: column }));
    const path = kind === "proposal" ? "/api/proposals" : "/api/projects";
    const body = kind === "proposal" ? { stage: column } : { status: column };
    const response = await fetch(`${path}?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      setMoves((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
    router.refresh();
  }

  async function saveSector() {
    setSectorError("");
    const response = await fetch("/api/sectors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: sectorName }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setSectorError(payload.error ?? "Não foi possível criar o setor.");
      return;
    }
    setSectorName("");
    router.refresh();
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleteError("");
    setDeleting(true);
    try {
      const path =
        pendingDelete.kind === "expense" || pendingDelete.kind === "transaction"
          ? "/api/transactions"
          : pendingDelete.kind === "client"
            ? "/api/clients"
            : pendingDelete.kind === "team"
              ? "/api/team"
              : pendingDelete.kind === "project"
                ? "/api/projects"
                : "/api/proposals";
      const response = await fetch(`${path}?id=${pendingDelete.id}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Falha ao excluir");
      setPendingDelete(null);
      router.refresh();
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : "Falha ao excluir");
    } finally {
      setDeleting(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = monthKey(today);
  const orderedChart = [...initialData.chart].sort((a, b) => a.month.localeCompare(b.month));
  const current =
    orderedChart.find((row) => monthKey(row.month) === thisMonth) ??
    orderedChart.filter((row) => monthKey(row.month) <= thisMonth).at(-1) ??
    null;
  const previous = orderedChart.filter((row) => monthKey(row.month) < thisMonth).at(-1) ?? null;
  const revenue = current?.revenue ?? 0;
  const expenses = current?.expenses ?? 0;
  const net = revenue - expenses;
  const revenueChange = previous?.revenue
    ? ((revenue - previous.revenue) / previous.revenue) * 100
    : 0;
  const mrr = initialData.clients.reduce((sum, client) => sum + client.mrr, 0);
  const teamCost = initialData.team.reduce((sum, member) => sum + member.monthlyCost, 0);
  const pipeline = initialData.proposals.reduce((sum, item) => sum + item.amount, 0);
  const weighted = initialData.proposals.reduce(
    (sum, item) => sum + (item.amount * item.probability) / 100,
    0,
  );
  const proposals = initialData.proposals.map((item) => ({
    ...item,
    stage: moves[`proposal-${item.id}`] ?? item.stage,
  }));
  const projects = initialData.projects.map((item) => ({
    ...item,
    status: moves[`project-${item.id}`] ?? item.status,
  }));
  const nextMonth = addMonths(today, 1);
  const incomeRows = initialData.transactions.filter((item) => item.type === "income");
  const expenseRows = initialData.transactions.filter((item) => item.type === "expense");
  const guaranteed = incomeRows
    .filter((item) => item.dueDate >= monthStart(today))
    .reduce((sum, item) => sum + item.amount, 0);
  const projectedMonths = [...new Set(incomeRows.map((item) => monthKey(item.dueDate)))]
    .filter((key) => key >= monthKey(today))
    .sort()
    .map((key) => ({
      month: `${key}-01`,
      amount: incomeRows
        .filter((item) => monthKey(item.dueDate) === key)
        .reduce((sum, item) => sum + item.amount, 0),
    }));
  const recurringRows = expenseRows.filter((item) => item.category !== "Investimento");
  const investmentRows = expenseRows.filter((item) => item.category === "Investimento");
  const recurringTotal = recurringRows.reduce((sum, item) => sum + item.amount, 0);
  const investmentTotal = investmentRows.reduce((sum, item) => sum + item.amount, 0);
  const unpaidExpenses = expenseRows
    .filter((item) => item.status !== "paid")
    .reduce((sum, item) => sum + item.amount, 0);
  const openReceivables = incomeRows
    .filter((item) => item.status !== "paid")
    .reduce((sum, item) => sum + item.amount, 0);
  const openReceivablesCount = incomeRows.filter((item) => item.status !== "paid").length;
  const paidThisMonth = incomeRows
    .filter((item) => monthKey(item.dueDate) === thisMonth && item.status === "paid")
    .reduce((sum, item) => sum + item.amount, 0);
  const nextMonthKey = monthKey(nextMonth);
  const nextMonthRevenue =
    orderedChart.find((row) => monthKey(row.month) === nextMonthKey)?.revenue ??
    incomeRows
      .filter((item) => monthKey(item.dueDate) === nextMonthKey)
      .reduce((sum, item) => sum + item.amount, 0);
  const nextMonthExpenses =
    orderedChart.find((row) => monthKey(row.month) === nextMonthKey)?.expenses ??
    expenseRows
      .filter((item) => monthKey(item.dueDate) === nextMonthKey)
      .reduce((sum, item) => sum + item.amount, 0);
  const recurringIncomeMonthly = incomeRows
    .filter((item) => item.category === "Receita recorrente" && monthKey(item.dueDate) === thisMonth)
    .reduce((sum, item) => sum + item.amount, 0);
  const overdueIncome = incomeRows
    .filter((item) => item.status !== "paid" && item.dueDate < today)
    .reduce((sum, item) => sum + item.amount, 0);
  const clientRevenue = [...incomeRows.reduce((map, item) => {
    const key = item.counterparty || "Sem cliente";
    map.set(key, (map.get(key) ?? 0) + item.amount);
    return map;
  }, new Map<string, number>())]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
  const categoryBreakdown = [...incomeRows
    .filter((item) => monthKey(item.dueDate) === selectedMonth)
    .reduce((map, item) => {
      map.set(item.category, (map.get(item.category) ?? 0) + item.amount);
      return map;
    }, new Map<string, number>())]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
  const overviewChart = sliceChart(
    orderedChart,
    monthKey(addMonths(today, -2)),
    monthKey(addMonths(today, 5)),
  );
  const financeChart = sliceChart(
    orderedChart,
    monthKey(addMonths(today, -3)),
    monthKey(addMonths(today, 11)),
  );
  const avgLtv = initialData.clients.length
    ? initialData.clients.reduce((sum, client) => sum + client.ltv, 0) / initialData.clients.length
    : 0;
  const annualized = revenue * 12;
  const recurringAnnual = mrr * 12;
  const monthTitle = `${monthLabel(`${thisMonth}-01`)} ${thisMonth.slice(0, 4)}`;

  const metrics = (
    <div className="metrics">
      <Metric
        n="Receita no mês"
        v={money(revenue)}
        s={`${revenueChange >= 0 ? "↑" : "↓"} ${Math.abs(revenueChange).toFixed(1)}% vs. mês anterior`}
        I={ArrowUpRight}
      />
      <Metric
        n="Despesas no mês"
        v={money(expenses)}
        s={`${percent(expenses, revenue)}% da receita`}
        I={ArrowDownRight}
        t="amber"
      />
      <Metric
        n="Resultado líquido"
        v={money(net)}
        s={`Margem de ${percent(net, revenue)}%`}
        I={CircleDollarSign}
        t="blue"
      />
      <Metric
        n="Receita do próximo mês"
        v={money(nextMonthRevenue)}
        s={`Despesas previstas ${money(nextMonthExpenses)}`}
        I={WalletCards}
        t="violet"
      />
    </div>
  );

  const pulse = useMemo(
    () => [
      ["MRR atual", money(mrr), Math.min(100, percent(mrr, 8000))],
      ["Margem líquida", `${percent(net, revenue)}%`, percent(net, revenue)],
      ["Pipeline ponderado", money(weighted), Math.min(100, percent(weighted, 60000))],
    ],
    [mrr, net, revenue, weighted],
  );

  const headerAction: Record<Screen, CreateKind | null> = {
    "Visão geral": "transaction",
    Financeiro: "transaction",
    Contas: "transaction",
    Despesas: "expense",
    Propostas: "proposal",
    Projetos: "project",
    Equipe: "team",
    Clientes: "client",
    Valuation: null,
  };
  const currentAction = headerAction[screen];

  const view: Record<Screen, React.ReactNode> = {
    "Visão geral": (
      <>
        <Title
          n="Boa noite, Tironi."
          s={`Panorama financeiro de ${monthTitle}. Clique no gráfico para detalhar qualquer mês.`}
          action={<CreateButton kind="transaction" onOpen={openCreate} />}
        />
        {metrics}
        <div className="metrics">
          <Metric n="A receber" v={money(openReceivables)} s={`${openReceivablesCount} lançamentos abertos`} I={ReceiptText} />
          <Metric n="Em atraso" v={money(overdueIncome)} s="Receitas vencidas sem pagamento" I={Target} t="amber" />
          <Metric n="MRR / recorrente no mês" v={money(Math.max(mrr, recurringIncomeMonthly))} s="Receita contratada mensal" I={TrendingUp} t="blue" />
          <Metric n="A pagar" v={money(unpaidExpenses)} s="Despesas ainda em aberto" I={Banknote} t="violet" />
        </div>
        <div className="grid wide">
          <section className="panel">
            <Head n="Evolução financeira" s="Receitas e despesas · clique no mês para abrir o detalhe" />
            <Graph chart={overviewChart} selected={selectedMonth} onSelect={setSelectedMonth} />
          </section>
          <section className="panel">
            <Head n="Pulso da empresa" s="Indicadores estratégicos" />
            <div className="score">
              <b>{initialData.healthScore}</b>
              <span>/100</span>
              <small>Saúde excelente</small>
            </div>
            {pulse.map((item) => (
              <div className="bar" key={item[0]}>
                <span>
                  {item[0]}
                  <b>{item[1]}</b>
                </span>
                <div>
                  <i style={{ width: item[2] + "%" }} />
                </div>
              </div>
            ))}
            <div className="bar">
              <span>
                Recebido neste mês
                <b>{money(paidThisMonth)}</b>
              </span>
              <div>
                <i style={{ width: `${Math.min(100, percent(paidThisMonth, Math.max(revenue, 1)))}%` }} />
              </div>
            </div>
          </section>
        </div>
        <MonthLedger month={selectedMonth} transactions={initialData.transactions} />
        <div className="grid">
          <section className="panel">
            <Head n="Próximos recebimentos" s="Valores previstos para entrar" />
            {incomeRows.filter((item) => item.dueDate >= today).slice(0, 5).length ? (
              incomeRows
                .filter((item) => item.dueDate >= today)
                .slice(0, 5)
                .map((item) => (
                  <div className="item" key={item.id}>
                    <i>
                      {formatDueDate(item.dueDate).slice(0, 2)}
                      <small>{monthLabel(item.dueDate)}</small>
                    </i>
                    <span>
                      <b>{item.counterparty}</b>
                      <small>
                        {item.description} · {statusLabel(item.status)}
                      </small>
                    </span>
                    <strong>{money(item.amount)}</strong>
                  </div>
                ))
            ) : (
              <p className="empty">Nenhum recebimento futuro cadastrado.</p>
            )}
          </section>
          <section className="panel">
            <Head n="Projetos ativos" s="Progresso das principais entregas" />
            {initialData.projects.slice(0, 4).map((project) => (
              <div className="projectline" key={project.id}>
                <span>
                  <b>{project.name}</b>
                  <small>{project.clientName}</small>
                  <strong>{project.progress}%</strong>
                </span>
                <div>
                  <i style={{ width: project.progress + "%" }} />
                </div>
              </div>
            ))}
          </section>
        </div>
      </>
    ),
    Financeiro: (
      <>
        <Title
          n="Financeiro"
          s="Fluxo de caixa, recebíveis, despesas e a receita já contratada. Clique no mês para ver o detalhe."
          action={<CreateButton kind="transaction" onOpen={openCreate} />}
        />
        {metrics}
        <div className="metrics">
          <Metric n="Receita garantida" v={money(guaranteed)} s={`${projectedMonths.length} meses projetados`} I={FileText} />
          <Metric n="A receber em aberto" v={money(openReceivables)} s={`${openReceivablesCount} títulos`} I={ReceiptText} t="blue" />
          <Metric n="Despesas em aberto" v={money(unpaidExpenses)} s={`${recurringRows.filter((item) => item.status !== "paid").length + investmentRows.filter((item) => item.status !== "paid").length} itens`} I={Banknote} t="amber" />
          <Metric n="Resultado do próximo mês" v={money(nextMonthRevenue - nextMonthExpenses)} s={`${money(nextMonthRevenue)} − ${money(nextMonthExpenses)}`} I={TrendingUp} t="violet" />
        </div>
        <section className="panel biggraph">
          <Head n="Fluxo de caixa" s="Realizado e projetado a partir dos contratos · clique no mês" />
          <Graph chart={financeChart} selected={selectedMonth} onSelect={setSelectedMonth} />
        </section>
        <MonthLedger month={selectedMonth} transactions={initialData.transactions} />
        <div className="grid">
          <section className="panel">
            <Head
              n="Receita garantida"
              s={`${projectedMonths.length} meses com contrato · ${money(guaranteed)} no período`}
            />
            {projectedMonths.length ? (
              projectedMonths.slice(0, 8).map((row) => (
                <button
                  className={"bar clickable" + (monthKey(row.month) === selectedMonth ? " active" : "")}
                  key={row.month}
                  type="button"
                  onClick={() => setSelectedMonth(monthKey(row.month))}
                >
                  <span>
                    {monthLabel(row.month)} {row.month.slice(0, 4)}
                    <b>{money(row.amount)}</b>
                  </span>
                  <div>
                    <i
                      style={{
                        width: `${Math.min(
                          100,
                          percent(row.amount, Math.max(...projectedMonths.map((item) => item.amount), 1)),
                        )}%`,
                      }}
                    />
                  </div>
                </button>
              ))
            ) : (
              <p className="empty">Cadastre um contrato com fim definido para ver a projeção mês a mês.</p>
            )}
          </section>
          <section className="panel">
            <Head n="Maiores clientes" s="Soma de todas as receitas lançadas" />
            {clientRevenue.length ? (
              clientRevenue.map((item) => (
                <div className="bar" key={item.name}>
                  <span>
                    {item.name}
                    <b>{money(item.amount)}</b>
                  </span>
                  <div>
                    <i
                      style={{
                        width: `${Math.min(
                          100,
                          percent(item.amount, Math.max(...clientRevenue.map((row) => row.amount), 1)),
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="empty">Nenhuma receita cadastrada.</p>
            )}
            {categoryBreakdown.length ? (
              <>
                <Head n={`Categorias em ${monthLabel(`${selectedMonth}-01`)}`} s="Composição da receita do mês selecionado" />
                {categoryBreakdown.map((item) => (
                  <div className="bar" key={item.name}>
                    <span>
                      {item.name}
                      <b>{money(item.amount)}</b>
                    </span>
                    <div>
                      <i
                        style={{
                          width: `${Math.min(
                            100,
                            percent(item.amount, Math.max(...categoryBreakdown.map((row) => row.amount), 1)),
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </>
            ) : null}
          </section>
        </div>
      </>
    ),
    Contas: (
      <>
        <Title
          n="Contas e lançamentos"
          s="Receitas, vencimentos e o cliente de cada entrada."
          action={<CreateButton kind="transaction" onOpen={openCreate} />}
        />
        <section className="panel">
          <Head n="Agenda de receitas" s={`${incomeRows.length} lançamentos · receita replicada até o fim de cada contrato`} />
          <div className="table">
            <div className="row accounts th">
              <span>Cliente</span>
              <span>Descrição</span>
              <span>Vencimento</span>
              <span>Categoria</span>
              <span>Status</span>
              <span>Valor</span>
              <span />
            </div>
            {incomeRows.length ? (
              incomeRows.map((item) => (
                <div className="row accounts" key={item.id}>
                  <span>
                    <b>{item.clientId ? item.counterparty : "—"}</b>
                  </span>
                  <span>{item.description}</span>
                  <span>{formatDueDate(item.dueDate)}</span>
                  <span>{item.category}</span>
                  <span>
                    <Status t={statusTone(item.status)}>{statusLabel(item.status)}</Status>
                  </span>
                  <b className="green">+ {money(item.amount)}</b>
                  <RecordTools
                    onEdit={() => setModal({ kind: "transaction", edit: transactionEdit(item) })}
                    onDelete={() => {
                      setDeleteError("");
                      setPendingDelete({
                        kind: "transaction",
                        id: item.id,
                        label: item.seriesId
                          ? `${item.description} (contrato inteiro)`
                          : item.description,
                        series: Boolean(item.seriesId),
                      });
                    }}
                  />
                </div>
              ))
            ) : (
              <p className="empty">Nenhuma receita lançada ainda.</p>
            )}
          </div>
        </section>
      </>
    ),
    Despesas: (
      <>
        <Title
          n="Despesas e investimentos"
          s="Custos recorrentes como luz e água, e compras de equipamento."
          action={<CreateButton kind="expense" onOpen={openCreate} />}
        />
        <div className="metrics three">
          <Metric n="Custos recorrentes" v={money(recurringTotal)} s={`${recurringRows.length} lançamentos`} I={ArrowDownRight} t="amber" />
          <Metric n="Investimentos" v={money(investmentTotal)} s={`${investmentRows.length} itens`} I={Banknote} t="blue" />
          <Metric n="A pagar" v={money(unpaidExpenses)} s="Ainda em aberto" I={WalletCards} t="violet" />
        </div>
        <div className="grid">
          <section className="panel">
            <Head n="Custos recorrentes" s="Luz, água, internet e outros mensais" />
            <div className="table">
              <div className="row expenses th">
                <span>Descrição</span>
                <span>Vencimento</span>
                <span>Status</span>
                <span>Valor</span>
                <span />
              </div>
              {recurringRows.length ? (
                recurringRows.map((item) => (
                  <div className="row expenses" key={item.id}>
                    <span>
                      <b>{item.description}</b>
                      <small>{item.category}</small>
                    </span>
                    <span>{formatDueDate(item.dueDate)}</span>
                    <span>
                      <Status t={statusTone(item.status)}>{statusLabel(item.status)}</Status>
                    </span>
                    <b className="red">− {money(item.amount)}</b>
                    <RecordTools
                      onEdit={() => setModal({ kind: "expense", edit: transactionEdit(item) })}
                      onDelete={() => {
                        setDeleteError("");
                        setPendingDelete({ kind: "expense", id: item.id, label: item.description });
                      }}
                    />
                  </div>
                ))
              ) : (
                <p className="empty">Nenhum custo recorrente cadastrado.</p>
              )}
            </div>
          </section>
          <section className="panel">
            <Head n="Investimentos" s="Monitor, cadeiras e outros ativos" />
            <div className="table">
              <div className="row expenses th">
                <span>Descrição</span>
                <span>Vencimento</span>
                <span>Status</span>
                <span>Valor</span>
                <span />
              </div>
              {investmentRows.length ? (
                investmentRows.map((item) => (
                  <div className="row expenses" key={item.id}>
                    <span>
                      <b>{item.description}</b>
                      <small>Investimento</small>
                    </span>
                    <span>{formatDueDate(item.dueDate)}</span>
                    <span>
                      <Status t={statusTone(item.status)}>{statusLabel(item.status)}</Status>
                    </span>
                    <b className="red">− {money(item.amount)}</b>
                    <RecordTools
                      onEdit={() => setModal({ kind: "expense", edit: transactionEdit(item) })}
                      onDelete={() => {
                        setDeleteError("");
                        setPendingDelete({ kind: "expense", id: item.id, label: item.description });
                      }}
                    />
                  </div>
                ))
              ) : (
                <p className="empty">Nenhum investimento cadastrado.</p>
              )}
            </div>
          </section>
        </div>
      </>
    ),
    Propostas: (
      <>
        <Title
          n="Propostas comerciais"
          s="Arraste os cards entre estágios. Histórico, contato e responsável ficam na edição."
          action={<CreateButton kind="proposal" onOpen={openCreate} />}
        />
        <div className="metrics three">
          <Metric n="Pipeline total" v={money(pipeline)} s={`${initialData.proposals.length} oportunidades`} I={FileText} />
          <Metric n="Pipeline ponderado" v={money(weighted)} s="Por probabilidade" I={TrendingUp} t="blue" />
          <Metric n="Conversão" v={`${initialData.conversionRate}%`} s="Últimos 90 dias" I={Target} t="violet" />
        </div>
        <KanbanBoard
          columns={PROPOSAL_STAGES}
          items={proposals}
          columnOf={(item) => item.stage}
          onMove={(id, column) => moveCard("proposal", id, column)}
          renderCard={(item) => (
            <>
              <small>{item.clientName}</small>
              <RecordTools
                onEdit={() =>
                  setModal({
                    kind: "proposal",
                    edit: {
                      id: item.id,
                      clientName: item.clientName,
                      title: item.title,
                      amount: item.amount,
                      probability: item.probability,
                      stage: item.stage,
                      contactName: item.contactName,
                      phone: item.phone,
                      notes: item.notes,
                      ownerId: item.ownerId,
                    },
                  })
                }
                onDelete={() => {
                  setDeleteError("");
                  setPendingDelete({ kind: "proposal", id: item.id, label: item.title });
                }}
              />
              <h3>{item.title}</h3>
              <strong>{money(item.amount)}</strong>
              <footer>
                {item.ownerName ? `Resp.: ${item.ownerName}` : `${item.probability}% de chance`}
                <div>
                  <i style={{ width: item.probability + "%" }} />
                </div>
              </footer>
            </>
          )}
        />
      </>
    ),
    Projetos: (
      <>
        <Title
          n="Projetos em andamento"
          s="Arraste os cards entre status. Atribua o responsável e acompanhe o histórico."
          action={<CreateButton kind="project" onOpen={openCreate} />}
        />
        <KanbanBoard
          columns={PROJECT_STAGES}
          items={projects}
          columnOf={(item) => item.status}
          onMove={(id, column) => moveCard("project", id, column)}
          renderCard={(item) => (
            <>
              <small>{item.clientName}</small>
              <RecordTools
                onEdit={() =>
                  setModal({
                    kind: "project",
                    edit: {
                      id: item.id,
                      name: item.name,
                      clientName: item.clientName,
                      progress: item.progress,
                      dueDate: item.dueDate,
                      projectStatus: item.status,
                      contactName: item.contactName,
                      phone: item.phone,
                      notes: item.notes,
                      ownerId: item.ownerId,
                    },
                  })
                }
                onDelete={() => {
                  setDeleteError("");
                  setPendingDelete({ kind: "project", id: item.id, label: item.name });
                }}
              />
              <h3>{item.name}</h3>
              <strong>{item.progress}%</strong>
              <footer>
                {item.ownerName ? `Resp.: ${item.ownerName}` : `Prazo: ${formatDueDate(item.dueDate)}`}
                <div>
                  <i style={{ width: item.progress + "%" }} />
                </div>
              </footer>
            </>
          )}
        />
      </>
    ),
    Equipe: (
      <>
        <Title
          n="Equipe e salários"
          s="Cadastre setores, atribua cada colaborador e crie o login de acesso."
          action={<CreateButton kind="team" onOpen={openCreate} />}
        />
        <div className="metrics three">
          <Metric n="Custo mensal" v={money(teamCost)} s={`${percent(teamCost, revenue)}% da receita`} I={Users} />
          <Metric n="Colaboradores" v={String(initialData.team.length)} s="Todos ativos" I={Check} t="blue" />
          <Metric
            n="Receita por pessoa"
            v={money(initialData.team.length ? revenue / initialData.team.length : 0)}
            s="Média no mês"
            I={TrendingUp}
            t="violet"
          />
        </div>
        <div className="grid">
          <section className="panel">
            <Head n="Setores" s="Cadastro usado para atribuir o time e o acesso" />
            {initialData.sectors.map((sector) => (
              <div className="item" key={sector.id}>
                <i>{sector.name.slice(0, 2).toUpperCase()}</i>
                <span>
                  <b>{sector.name}</b>
                  <small>{sector.slug === "comercial" ? "/comercial" : sector.slug === "desenvolvimento" ? "/desenvolvimento" : sector.slug}</small>
                </span>
              </div>
            ))}
            <label className="inline-field">
              Novo setor
              <input
                placeholder="Ex.: Design"
                value={sectorName}
                onChange={(event) => setSectorName(event.target.value)}
              />
            </label>
            {sectorError ? <p className="note">{sectorError}</p> : null}
            <button className="primary" type="button" onClick={saveSector}>
              Cadastrar setor
            </button>
          </section>
          <section className="panel">
            <Head n="Acessos" s="Login criado no cadastro do colaborador" />
            {initialData.team.map((member) => (
              <div className="item" key={member.id}>
                <i>{member.initials}</i>
                <span>
                  <b>{member.name}</b>
                  <small>
                    {member.hasLogin ? member.username : "Sem login"} · {member.sectorName}
                  </small>
                </span>
              </div>
            ))}
          </section>
        </div>
        <section className="panel">
          <Head n="Colaboradores" s="Folha, setor e acesso" />
          <div className="table">
            <div className="row team th">
              <span>Colaborador</span>
              <span>Função</span>
              <span>Setor</span>
              <span>Custo mensal</span>
              <span />
            </div>
            {initialData.team.map((member) => (
              <div className="row team" key={member.id}>
                <span className="person">
                  <i>{member.initials}</i>
                  <b>{member.name}</b>
                </span>
                <span>{member.role}</span>
                <span>{member.sectorName}</span>
                <b>{money(member.monthlyCost)}</b>
                <RecordTools
                  onEdit={() =>
                    setModal({
                      kind: "team",
                      edit: {
                        id: member.id,
                        name: member.name,
                        role: member.role,
                        monthlyCost: member.monthlyCost,
                        sectorId: member.sectorId,
                        username: member.username ?? "",
                      },
                    })
                  }
                  onDelete={() => {
                    setDeleteError("");
                    setPendingDelete({ kind: "team", id: member.id, label: member.name });
                  }}
                />
              </div>
            ))}
          </div>
        </section>
      </>
    ),
    Clientes: (
      <>
        <Title
          n="Clientes e LTV"
          s="Valor gerado, recorrência e tempo de relacionamento."
          action={<CreateButton kind="client" onOpen={openCreate} />}
        />
        <div className="metrics three">
          <Metric n="LTV médio" v={money(avgLtv)} s="Base atual" I={CircleDollarSign} />
          <Metric n="MRR contratado" v={money(mrr)} s={`${initialData.clients.length} contratos`} I={TrendingUp} t="blue" />
          <Metric n="Churn" v="0%" s="Últimos 12 meses" I={Users} t="violet" />
        </div>
        <div className="clients">
          {initialData.clients.map((client) => (
            <article key={client.id}>
              <i>{client.initials}</i>
              <RecordTools
                onEdit={() =>
                  setModal({
                    kind: "client",
                    edit: {
                      id: client.id,
                      name: client.name,
                      mrr: client.mrr,
                      ltv: client.ltv,
                      startedAt: client.startedAt,
                    },
                  })
                }
                onDelete={() => {
                  setDeleteError("");
                  setPendingDelete({ kind: "client", id: client.id, label: client.name });
                }}
              />
              <h3>{client.name}</h3>
              <p>
                Cliente há {client.months} {client.months === 1 ? "mês" : "meses"}
              </p>
              <footer>
                <span>
                  MRR<b>{money(client.mrr)}</b>
                </span>
                <span>
                  LTV<b>{money(client.ltv)}</b>
                </span>
              </footer>
            </article>
          ))}
        </div>
      </>
    ),
    Valuation: (
      <Valuation
        annualized={annualized}
        recurringAnnual={recurringAnnual}
        multiple={initialData.valuationMultiple}
      />
    ),
  };

  return (
    <div className="app">
      <aside className={menu ? "open" : ""}>
        <div className="brand">
          <i>T</i>
          <span>
            <b>TIRONI</b>
            <small>TECH CONTROL</small>
          </span>
          <button onClick={() => setMenu(false)}>
            <X />
          </button>
        </div>
        <nav>
          {nav.map(([name, Icon]) => (
            <button
              className={screen === name ? "active" : ""}
              onClick={() => {
                setScreen(name);
                setMenu(false);
              }}
              key={name}
            >
              <Icon />
              {name}
              {name === "Contas" && <b>{incomeRows.length}</b>}
              {name === "Despesas" && <b>{expenseRows.length}</b>}
            </button>
          ))}
        </nav>
        <div className="bottom">
          <button type="button" onClick={logout}>
            <LogOut />
            Sair
          </button>
          <div>
            <i>PT</i>
            <span>
              <b>{userName}</b>
              <small>Administrador</small>
            </span>
          </div>
        </div>
      </aside>
      {menu && <button className="overlay" onClick={() => setMenu(false)} />}
      <main>
        <header className="top">
          <button className="menub" onClick={() => setMenu(true)}>
            <Menu />
          </button>
          <div>
            <small>GESTÃO EMPRESARIAL</small>
            <h1>{screen}</h1>
          </div>
          <label>
            <Search />
            <input placeholder="Buscar no sistema..." />
          </label>
          <button className="bell">
            <Bell />
          </button>
          {currentAction ? <CreateButton kind={currentAction} onOpen={openCreate} /> : null}
        </header>
        <div className="content">{view[screen]}</div>
      </main>
      {modal ? (
        <CreateRecordModal
          kind={modal.kind}
          clients={initialData.clients}
          team={initialData.team}
          sectors={initialData.sectors}
          edit={modal.edit}
          onClose={() => setModal(null)}
        />
      ) : null}
      {pendingDelete ? (
        <ConfirmDelete
          title={pendingDelete.series ? "Excluir contrato" : "Excluir registro"}
          message={
            pendingDelete.series
              ? `Excluir “${pendingDelete.label}” e todas as mensalidades projetadas? Essa ação não pode ser desfeita.`
              : `Excluir “${pendingDelete.label}”? Essa ação não pode ser desfeita.`
          }
          error={deleteError}
          busy={deleting}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
        />
      ) : null}
    </div>
  );
}

function Valuation({
  annualized,
  recurringAnnual,
  multiple,
}: {
  annualized: number;
  recurringAnnual: number;
  multiple: number;
}) {
  const [m, setM] = useState(multiple);
  const value = annualized * m + recurringAnnual * 2;

  return (
    <>
      <Title n="Valuation" s="Estimativa indicativa baseada em receita, recorrência e múltiplo." />
      <section className="value">
        <div>
          <span>Valuation estimado</span>
          <strong>{money(value)}</strong>
          <p>
            Faixa sugerida: {money(value * 0.8)} — {money(value * 1.2)}
          </p>
        </div>
        <TrendingUp />
      </section>
      <div className="grid">
        <section className="panel">
          <Head n="Premissas do cálculo" s="Ajuste o múltiplo para simular cenários" />
          <p className="assume">
            Receita anualizada <b>{money(annualized)}</b>
          </p>
          <p className="assume">
            Receita recorrente anual <b>{money(recurringAnnual)}</b>
          </p>
          <div className="slider">
            Múltiplo da receita <b>{m.toFixed(1)}x</b>
            <input
              type="range"
              min="1"
              max="8"
              step=".1"
              value={m}
              onChange={(event) => setM(+event.target.value)}
            />
          </div>
        </section>
        <section className="panel">
          <Head n="Direcionadores de valor" s="O que mais impacta a estimativa" />
          {[
            ["Receita recorrente", "MRR previsível melhora o múltiplo."],
            ["Margem elevada", "Resultado líquido elevado no mês."],
            ["Concentração de clientes", "Diversificar reduz o risco."],
          ].map((item) => (
            <div className="driver" key={item[0]}>
              <ArrowUpRight />
              <span>
                <b>{item[0]}</b>
                <small>{item[1]}</small>
              </span>
            </div>
          ))}
        </section>
      </div>
      <p className="note">
        Estimativa gerencial. Uma avaliação formal exige análise contábil, jurídica e de mercado.
      </p>
    </>
  );
}
