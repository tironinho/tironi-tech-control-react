"use client";

import { useMemo, useState } from "react";
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
  Menu,
  MoreHorizontal,
  ReceiptText,
  Search,
  Settings,
  Target,
  TrendingUp,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import type { DashboardData } from "@/lib/dashboard-types";
import { latestMonth, previousMonth } from "@/lib/dashboard-types";
import { formatDueDate, money, monthLabel } from "@/lib/money";
import { CreateButton, CreateRecordModal, type CreateKind } from "@/components/create-record-modal";

type Screen =
  | "Visão geral"
  | "Financeiro"
  | "Contas"
  | "Propostas"
  | "Projetos"
  | "Equipe"
  | "Clientes"
  | "Valuation";

const nav = [
  ["Visão geral", LayoutDashboard],
  ["Financeiro", BarChart3],
  ["Contas", ReceiptText],
  ["Propostas", FileText],
  ["Projetos", FolderKanban],
  ["Equipe", Users],
  ["Clientes", Building2],
  ["Valuation", TrendingUp],
] as const;

const stages = ["Diagnóstico", "Proposta enviada", "Negociação", "Aprovada"] as const;

function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function statusLabel(status: string) {
  if (status === "receivable") return "A receber";
  if (status === "expected") return "Previsto";
  if (status === "payable") return "A pagar";
  if (status === "paid") return "Pago";
  if (status === "at_risk") return "Atenção";
  return "No prazo";
}

function statusTone(status: string) {
  if (status === "expected") return "blue";
  if (status === "payable" || status === "at_risk") return "amber";
  return "";
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

function Graph({ chart }: { chart: DashboardData["chart"] }) {
  const data = chart.map((row) => ({
    m: monthLabel(row.month),
    r: row.revenue,
    d: row.expenses,
  }));

  return (
    <div className="graph">
      <ResponsiveContainer>
        <AreaChart data={data}>
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
          />
          <Area dataKey="r" stroke="#3ce4a3" fill="url(#g)" strokeWidth={2.5} />
          <Area dataKey="d" stroke="#7088a6" fill="none" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DashboardApp({ initialData }: { initialData: DashboardData }) {
  const [screen, setScreen] = useState<Screen>("Visão geral");
  const [menu, setMenu] = useState(false);
  const [modal, setModal] = useState<CreateKind | null>(null);

  const current = latestMonth(initialData.chart);
  const previous = previousMonth(initialData.chart);
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
  const upcomingIncome = initialData.transactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);
  const avgLtv = initialData.clients.length
    ? initialData.clients.reduce((sum, client) => sum + client.ltv, 0) / initialData.clients.length
    : 0;
  const annualized = revenue * 12;
  const recurringAnnual = mrr * 12;

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
        n="Saldo projetado"
        v={money(net + upcomingIncome)}
        s="Próximos 30 dias"
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
          s="Aqui está o panorama da empresa em agosto."
          action={<CreateButton kind="transaction" onOpen={setModal} />}
        />
        {metrics}
        <div className="grid wide">
          <section className="panel">
            <Head n="Evolução financeira" s="Receitas e despesas nos últimos 6 meses" />
            <Graph chart={initialData.chart} />
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
          </section>
        </div>
        <div className="grid">
          <section className="panel">
            <Head n="Próximos recebimentos" s="Valores previstos para entrar" />
            {initialData.transactions
              .filter((item) => item.type === "income")
              .slice(0, 3)
              .map((item) => (
                <div className="item" key={item.id}>
                  <i>
                    {formatDueDate(item.dueDate).slice(0, 2)}
                    <small>SET</small>
                  </i>
                  <span>
                    <b>{item.counterparty}</b>
                    <small>{item.description}</small>
                  </span>
                  <strong>{money(item.amount)}</strong>
                </div>
              ))}
          </section>
          <section className="panel">
            <Head n="Projetos ativos" s="Progresso das principais entregas" />
            {initialData.projects.slice(0, 3).map((project) => (
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
          s="Fluxo de caixa, resultado e projeções."
          action={<CreateButton kind="transaction" onOpen={setModal} />}
        />
        {metrics}
        <section className="panel biggraph">
          <Head n="Fluxo de caixa realizado" s="Visão mensal de entradas e saídas" />
          <Graph chart={initialData.chart} />
        </section>
      </>
    ),
    Contas: (
      <>
        <Title
          n="Contas e lançamentos"
          s="Controle do que entra, sai e vence ao longo do tempo."
          action={<CreateButton kind="transaction" onOpen={setModal} />}
        />
        <section className="panel">
          <Head n="Agenda financeira" s="Setembro de 2026" />
          <div className="table">
            <div className="row th">
              <span>Descrição</span>
              <span>Vencimento</span>
              <span>Categoria</span>
              <span>Status</span>
              <span>Valor</span>
            </div>
            {initialData.transactions.map((item) => (
              <div className="row" key={item.id}>
                <span>
                  <b>{item.counterparty}</b>
                  <small>{item.description}</small>
                </span>
                <span>{formatDueDate(item.dueDate)}</span>
                <span>{item.category}</span>
                <span>
                  <Status t={statusTone(item.status)}>{statusLabel(item.status)}</Status>
                </span>
                <b className={item.type === "income" ? "green" : "red"}>
                  {item.type === "income" ? "+ " : "− "}
                  {money(item.amount)}
                </b>
              </div>
            ))}
          </div>
        </section>
      </>
    ),
    Propostas: (
      <>
        <Title
          n="Propostas comerciais"
          s="Pipeline completo, probabilidades e valores negociados."
          action={<CreateButton kind="proposal" onOpen={setModal} />}
        />
        <div className="metrics three">
          <Metric n="Pipeline total" v={money(pipeline)} s={`${initialData.proposals.length} oportunidades`} I={FileText} />
          <Metric n="Pipeline ponderado" v={money(weighted)} s="Por probabilidade" I={TrendingUp} t="blue" />
          <Metric n="Conversão" v={`${initialData.conversionRate}%`} s="Últimos 90 dias" I={Target} t="violet" />
        </div>
        <div className="kanban">
          {stages.map((stage) => (
            <section key={stage}>
              <header>
                {stage}
                <b>{initialData.proposals.filter((item) => item.stage === stage).length}</b>
              </header>
              {initialData.proposals
                .filter((item) => item.stage === stage)
                .map((item) => (
                  <article key={item.id}>
                    <small>{item.clientName}</small>
                    <MoreHorizontal />
                    <h3>{item.title}</h3>
                    <strong>{money(item.amount)}</strong>
                    <footer>
                      {item.probability}% de chance
                      <div>
                        <i style={{ width: item.probability + "%" }} />
                      </div>
                    </footer>
                  </article>
                ))}
            </section>
          ))}
        </div>
      </>
    ),
    Projetos: (
      <>
        <Title
          n="Projetos em andamento"
          s="Entregas, prazos, clientes e saúde operacional."
          action={<CreateButton kind="project" onOpen={setModal} />}
        />
        <div className="projectgrid">
          {initialData.projects.map((project) => (
            <article key={project.id}>
              <header>
                <i>
                  <FolderKanban />
                </i>
                <Status t={statusTone(project.status)}>{statusLabel(project.status)}</Status>
              </header>
              <small>{project.clientName}</small>
              <h3>{project.name}</h3>
              <span>
                Prazo: {formatDueDate(project.dueDate)}
                <b>{project.progress}%</b>
              </span>
              <div className="progress">
                <i style={{ width: project.progress + "%" }} />
              </div>
              <footer>
                Equipe <b>{initialData.team.map((member) => member.initials).join("  ")}</b>
              </footer>
            </article>
          ))}
        </div>
      </>
    ),
    Equipe: (
      <>
        <Title
          n="Equipe e salários"
          s="Custos, funções e situação dos colaboradores."
          action={<CreateButton kind="team" onOpen={setModal} />}
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
        <section className="panel">
          <Head n="Colaboradores" s="Folha e informações principais" />
          <div className="table">
            <div className="row th">
              <span>Colaborador</span>
              <span>Função</span>
              <span>Status</span>
              <span>Custo mensal</span>
              <span />
            </div>
            {initialData.team.map((member) => (
              <div className="row" key={member.id}>
                <span className="person">
                  <i>{member.initials}</i>
                  <b>{member.name}</b>
                </span>
                <span>{member.role}</span>
                <span>
                  <Status>Ativo</Status>
                </span>
                <b>{money(member.monthlyCost)}</b>
                <MoreHorizontal />
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
          action={<CreateButton kind="client" onOpen={setModal} />}
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
              <MoreHorizontal />
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
              {name === "Contas" && <b>{initialData.transactions.length}</b>}
            </button>
          ))}
        </nav>
        <div className="bottom">
          <button>
            <Settings />
            Configurações
          </button>
          <div>
            <i>PT</i>
            <span>
              <b>Paulo Tironi</b>
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
          {currentAction ? <CreateButton kind={currentAction} onOpen={setModal} /> : null}
        </header>
        <div className="content">{view[screen]}</div>
      </main>
      {modal ? (
        <CreateRecordModal
          kind={modal}
          clients={initialData.clients}
          onClose={() => setModal(null)}
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
