"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, Check, Plus, X } from "lucide-react";
import type { DashboardData } from "@/lib/dashboard-types";
import { addMonths, isRecurringIncome, monthlyDates } from "@/lib/recurrence";

export type CreateKind = "transaction" | "expense" | "client" | "team" | "project" | "proposal";

export type ModalEdit = {
  id: number;
  description?: string;
  amount?: number;
  dueDate?: string;
  category?: string;
  type?: "income" | "expense";
  clientId?: number | null;
  status?: string;
  name?: string;
  role?: string;
  mrr?: number;
  ltv?: number;
  startedAt?: string;
  clientName?: string;
  progress?: number;
  projectStatus?: "on_track" | "at_risk";
  stage?: string;
  title?: string;
  probability?: number;
  monthlyCost?: number;
  endsAt?: string | null;
  seriesId?: string | null;
};

const labels: Record<CreateKind, { title: string; subtitle: string; save: string; header: string }> = {
  transaction: {
    title: "Novo lançamento",
    subtitle: "Informe o valor, o cliente e até quando o contrato vale.",
    save: "Salvar lançamento",
    header: "Novo lançamento",
  },
  expense: {
    title: "Nova despesa",
    subtitle: "Cadastre um custo recorrente ou um investimento.",
    save: "Salvar despesa",
    header: "Nova despesa",
  },
  client: {
    title: "Novo cliente",
    subtitle: "Cadastre um cliente e o contrato recorrente.",
    save: "Salvar cliente",
    header: "Novo cliente",
  },
  team: {
    title: "Novo colaborador",
    subtitle: "Cadastre alguém da equipe e o custo mensal.",
    save: "Salvar colaborador",
    header: "Novo colaborador",
  },
  project: {
    title: "Novo projeto",
    subtitle: "Cadastre uma entrega em andamento.",
    save: "Salvar projeto",
    header: "Novo projeto",
  },
  proposal: {
    title: "Nova proposta",
    subtitle: "Cadastre uma oportunidade no pipeline.",
    save: "Salvar proposta",
    header: "Nova proposta",
  },
};

const editTitles: Record<CreateKind, { title: string; subtitle: string; save: string }> = {
  transaction: {
    title: "Editar lançamento",
    subtitle: "Atualize o contrato e os meses projetados da receita.",
    save: "Salvar alterações",
  },
  expense: {
    title: "Editar despesa",
    subtitle: "Atualize o custo recorrente ou o investimento.",
    save: "Salvar alterações",
  },
  client: {
    title: "Editar cliente",
    subtitle: "Atualize os dados do contrato.",
    save: "Salvar alterações",
  },
  team: {
    title: "Editar colaborador",
    subtitle: "Atualize função e custo mensal.",
    save: "Salvar alterações",
  },
  project: {
    title: "Editar projeto",
    subtitle: "Atualize prazo, progresso e cliente.",
    save: "Salvar alterações",
  },
  proposal: {
    title: "Editar proposta",
    subtitle: "Atualize valor, estágio e probabilidade.",
    save: "Salvar alterações",
  },
};

const endpoints: Record<CreateKind, string> = {
  transaction: "/api/transactions",
  expense: "/api/transactions",
  client: "/api/clients",
  team: "/api/team",
  project: "/api/projects",
  proposal: "/api/proposals",
};

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

function parseMoney(value: string) {
  return Number(value.replace(/\./g, "").replace(",", "."));
}

function moneyInput(value?: number) {
  if (value == null || Number.isNaN(value)) return "";
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function contractPreview(start: string, end: string, amountValue: string) {
  try {
    const dates = monthlyDates(start, end);
    const parsed = parseMoney(amountValue);
    const total = parsed ? parsed * dates.length : 0;
    const totalLabel = total
      ? total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : "";
    return `${dates.length} mensalidades até o fim do contrato${totalLabel ? ` · ${totalLabel} garantidos` : ""}.`;
  } catch {
    return "Informe o primeiro vencimento e a data de fim do contrato.";
  }
}

export function CreateButton({
  kind,
  onOpen,
}: {
  kind: CreateKind;
  onOpen: (kind: CreateKind) => void;
}) {
  return (
    <button className="primary" type="button" onClick={() => onOpen(kind)}>
      <Plus />
      {labels[kind].header}
    </button>
  );
}

export function CreateRecordModal({
  kind,
  clients,
  edit,
  onClose,
}: {
  kind: CreateKind;
  clients: DashboardData["clients"];
  edit?: ModalEdit;
  onClose: () => void;
}) {
  const router = useRouter();
  const copy = edit ? { ...labels[kind], ...editTitles[kind] } : labels[kind];
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  const [type, setType] = useState<"income" | "expense">(
    kind === "expense" ? "expense" : (edit?.type ?? "income"),
  );
  const [description, setDescription] = useState(edit?.description ?? "");
  const [amount, setAmount] = useState(moneyInput(edit?.amount ?? edit?.monthlyCost));
  const [dueDate, setDueDate] = useState(edit?.dueDate ?? today);
  const [endsAt, setEndsAt] = useState(edit?.endsAt ?? addMonths(edit?.dueDate ?? today, 11));
  const [category, setCategory] = useState(
    edit?.category ?? (kind === "expense" ? "Custo recorrente" : "Receita recorrente"),
  );
  const [transactionClientId, setTransactionClientId] = useState(
    String(edit?.clientId ?? (kind === "expense" ? "" : clients[0]?.id ?? "")),
  );
  const [payStatus, setPayStatus] = useState(
    edit?.status ?? (kind === "expense" ? "payable" : "receivable"),
  );
  const [name, setName] = useState(edit?.name ?? "");
  const [role, setRole] = useState(edit?.role ?? "");
  const [mrr, setMrr] = useState(moneyInput(edit?.mrr));
  const [ltv, setLtv] = useState(moneyInput(edit?.ltv));
  const [startedAt, setStartedAt] = useState(edit?.startedAt ?? today);
  const [clientKey, setClientKey] = useState(edit?.clientName ?? clients[0]?.name ?? "Interno");
  const [progress, setProgress] = useState(String(edit?.progress ?? 0));
  const [status, setStatus] = useState<"on_track" | "at_risk">(edit?.projectStatus ?? "on_track");
  const [stage, setStage] = useState(edit?.stage ?? "Diagnóstico");
  const [title, setTitle] = useState(edit?.title ?? "");
  const [probability, setProbability] = useState(String(edit?.probability ?? 30));

  async function send(method: "POST" | "PATCH", url: string, body: unknown) {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Falha ao salvar");
  }

  async function save() {
    setError("");
    setSaving(true);
    try {
      const url = edit ? `${endpoints[kind]}?id=${edit.id}` : endpoints[kind];
      const method = edit ? "PATCH" : "POST";

      if (kind === "transaction" || kind === "expense") {
        const parsed = parseMoney(amount);
        const selectedClientId = Number(transactionClientId) || null;
        const recordType = kind === "expense" ? "expense" : type;
        if (!description.trim() || !parsed) throw new Error("Preencha descrição e valor.");
        if (recordType === "income" && !selectedClientId) {
          throw new Error("Selecione o cliente da receita.");
        }
        if (recordType === "income" && isRecurringIncome(category, recordType) && !endsAt) {
          throw new Error("Informe a data de fim do contrato.");
        }
        await send(method, url, {
          description: description.trim(),
          clientId: selectedClientId,
          category,
          type: recordType,
          amount: parsed,
          dueDate,
          status: payStatus,
          endsAt:
            recordType === "income" && isRecurringIncome(category, recordType) ? endsAt : null,
        });
      } else if (kind === "client") {
        const parsedMrr = parseMoney(mrr) || 0;
        const parsedLtv = parseMoney(ltv) || 0;
        if (!name.trim()) throw new Error("Informe o nome do cliente.");
        await send(method, url, {
          name: name.trim(),
          initials: initialsFrom(name) || "CL",
          mrr: parsedMrr,
          ltv: parsedLtv,
          startedAt,
        });
      } else if (kind === "team") {
        const parsedCost = parseMoney(amount) || 0;
        if (!name.trim() || !role.trim()) throw new Error("Informe nome e função.");
        await send(method, url, {
          name: name.trim(),
          initials: initialsFrom(name) || "EQ",
          role: role.trim(),
          monthlyCost: parsedCost,
        });
      } else if (kind === "project") {
        if (!name.trim()) throw new Error("Informe o nome do projeto.");
        const selected = clients.find((client) => client.name === clientKey);
        await send(method, url, {
          name: name.trim(),
          clientId: selected?.id ?? null,
          clientName: clientKey,
          progress: Number(progress) || 0,
          dueDate,
          status,
        });
      } else {
        const parsed = parseMoney(amount);
        if (!title.trim() || !clientKey.trim() || !parsed) {
          throw new Error("Informe cliente, título e valor.");
        }
        await send(method, url, {
          stage,
          clientName: clientKey.trim(),
          title: title.trim(),
          amount: parsed,
          probability: Number(probability) || 0,
        });
      }

      setSaved(true);
      router.refresh();
      setTimeout(onClose, 700);
    } catch (caught) {
      setSaving(false);
      setError(caught instanceof Error ? caught.message : "Falha ao salvar");
    }
  }

  return (
    <div className="backdrop" onMouseDown={onClose}>
      <section className="modal" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <h2>{copy.title}</h2>
            <p>{copy.subtitle}</p>
          </div>
          <button type="button" onClick={onClose}>
            <X />
          </button>
        </header>

        {kind === "transaction" && (
          <>
            <div className="toggle">
              <button
                className={type === "income" ? "active" : ""}
                type="button"
                onClick={() => {
                  setType("income");
                  if (!transactionClientId && clients[0]) setTransactionClientId(String(clients[0].id));
                  if (category === "Equipe" || category === "Custo recorrente" || category === "Investimento") {
                    setCategory("Receita recorrente");
                  }
                  setPayStatus("receivable");
                }}
              >
                <ArrowUpRight />
                Entrada
              </button>
              <button
                className={type === "expense" ? "active" : ""}
                type="button"
                onClick={() => {
                  setType("expense");
                  if (category === "Receita recorrente") setCategory("Custo recorrente");
                  setPayStatus("payable");
                }}
              >
                <ArrowDownRight />
                Saída
              </button>
            </div>
            <label>
              {type === "income" ? "Cliente da receita" : "Cliente (opcional)"}
              <select
                value={transactionClientId}
                onChange={(event) => setTransactionClientId(event.target.value)}
              >
                {type === "expense" ? <option value="">Sem cliente</option> : null}
                {type === "income" && !clients.length ? (
                  <option value="">Cadastre um cliente primeiro</option>
                ) : null}
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Descrição
              <input
                placeholder={type === "income" ? "Ex.: Mensalidade Chatbô" : "Ex.: Folha de pagamento"}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <div className="formgrid">
              <label>
                Valor
                <input placeholder="R$ 0,00" value={amount} onChange={(event) => setAmount(event.target.value)} />
              </label>
              <label>
                {type === "income" && category === "Receita recorrente" ? "Primeiro vencimento" : "Vencimento"}
                <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
              </label>
            </div>
            {type === "income" && category === "Receita recorrente" ? (
              <>
                <label>
                  Fim do contrato
                  <input type="date" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
                </label>
                <p className="hint">{contractPreview(dueDate, endsAt, amount)}</p>
              </>
            ) : null}
            <div className="formgrid">
              <label>
                Categoria
                <select value={category} onChange={(event) => setCategory(event.target.value)}>
                  {type === "income" ? (
                    <>
                      <option>Receita recorrente</option>
                      <option>Projeto</option>
                    </>
                  ) : (
                    <>
                      <option>Custo recorrente</option>
                      <option>Investimento</option>
                      <option>Equipe</option>
                      <option>Projeto</option>
                    </>
                  )}
                </select>
              </label>
              <label>
                Status
                <select value={payStatus} onChange={(event) => setPayStatus(event.target.value)}>
                  {type === "income" ? (
                    <>
                      <option value="receivable">A receber</option>
                      <option value="expected">Previsto</option>
                      <option value="paid">Recebido</option>
                    </>
                  ) : (
                    <>
                      <option value="payable">A pagar</option>
                      <option value="paid">Pago</option>
                    </>
                  )}
                </select>
              </label>
            </div>
          </>
        )}

        {kind === "expense" && (
          <>
            <div className="toggle">
              <button
                className={category !== "Investimento" ? "active" : ""}
                type="button"
                onClick={() => setCategory("Custo recorrente")}
              >
                <ArrowDownRight />
                Recorrente
              </button>
              <button
                className={category === "Investimento" ? "active" : ""}
                type="button"
                onClick={() => setCategory("Investimento")}
              >
                <ArrowUpRight />
                Investimento
              </button>
            </div>
            <label>
              Descrição
              <input
                placeholder={
                  category === "Investimento" ? "Ex.: Monitor, cadeira, notebook" : "Ex.: Luz, água, internet"
                }
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <div className="formgrid">
              <label>
                Valor
                <input placeholder="R$ 0,00" value={amount} onChange={(event) => setAmount(event.target.value)} />
              </label>
              <label>
                Vencimento
                <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
              </label>
            </div>
            <label>
              Status
              <select value={payStatus} onChange={(event) => setPayStatus(event.target.value)}>
                <option value="payable">A pagar</option>
                <option value="paid">Pago</option>
              </select>
            </label>
          </>
        )}

        {kind === "client" && (
          <>
            <label>
              Nome
              <input placeholder="Ex.: New Store" value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <div className="formgrid">
              <label>
                MRR
                <input placeholder="R$ 0,00" value={mrr} onChange={(event) => setMrr(event.target.value)} />
              </label>
              <label>
                LTV
                <input placeholder="R$ 0,00" value={ltv} onChange={(event) => setLtv(event.target.value)} />
              </label>
            </div>
            <label>
              Cliente desde
              <input type="date" value={startedAt} onChange={(event) => setStartedAt(event.target.value)} />
            </label>
          </>
        )}

        {kind === "team" && (
          <>
            <label>
              Nome
              <input placeholder="Ex.: Lucas Ferreira" value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label>
              Função
              <input placeholder="Ex.: Desenvolvedor Full Stack" value={role} onChange={(event) => setRole(event.target.value)} />
            </label>
            <label>
              Custo mensal
              <input placeholder="R$ 0,00" value={amount} onChange={(event) => setAmount(event.target.value)} />
            </label>
          </>
        )}

        {kind === "project" && (
          <>
            <label>
              Projeto
              <input placeholder="Ex.: Chatbô — New Store" value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label>
              Cliente
              <select value={clientKey} onChange={(event) => setClientKey(event.target.value)}>
                <option>Interno</option>
                {clients.map((client) => (
                  <option key={client.id}>{client.name}</option>
                ))}
              </select>
            </label>
            <div className="formgrid">
              <label>
                Progresso (%)
                <input type="number" min="0" max="100" value={progress} onChange={(event) => setProgress(event.target.value)} />
              </label>
              <label>
                Prazo
                <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
              </label>
            </div>
            <label>
              Status
              <select value={status} onChange={(event) => setStatus(event.target.value as "on_track" | "at_risk")}>
                <option value="on_track">No prazo</option>
                <option value="at_risk">Atenção</option>
              </select>
            </label>
          </>
        )}

        {kind === "proposal" && (
          <>
            <label>
              Cliente
              <input
                placeholder="Ex.: Instituto Potala"
                value={clientKey}
                onChange={(event) => setClientKey(event.target.value)}
              />
            </label>
            <label>
              Título
              <input placeholder="Ex.: Plataforma imersiva" value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <div className="formgrid">
              <label>
                Valor
                <input placeholder="R$ 0,00" value={amount} onChange={(event) => setAmount(event.target.value)} />
              </label>
              <label>
                Probabilidade (%)
                <input type="number" min="0" max="100" value={probability} onChange={(event) => setProbability(event.target.value)} />
              </label>
            </div>
            <label>
              Estágio
              <select value={stage} onChange={(event) => setStage(event.target.value)}>
                <option>Diagnóstico</option>
                <option>Proposta enviada</option>
                <option>Negociação</option>
                <option>Aprovada</option>
              </select>
            </label>
          </>
        )}

        {error ? <p className="note">{error}</p> : null}

        <footer>
          <button type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary" type="button" onClick={save} disabled={saving}>
            {saved ? (
              <>
                <Check />
                Salvo!
              </>
            ) : (
              copy.save
            )}
          </button>
        </footer>
      </section>
    </div>
  );
}
