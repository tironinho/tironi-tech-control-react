"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, Check, Plus, X } from "lucide-react";
import type { DashboardData } from "@/lib/dashboard-types";

export type CreateKind = "transaction" | "client" | "team" | "project" | "proposal";

const labels: Record<CreateKind, { title: string; subtitle: string; save: string; header: string }> = {
  transaction: {
    title: "Novo lançamento",
    subtitle: "Registre uma entrada ou saída financeira.",
    save: "Salvar lançamento",
    header: "Novo lançamento",
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
  onClose,
}: {
  kind: CreateKind;
  clients: DashboardData["clients"];
  onClose: () => void;
}) {
  const router = useRouter();
  const copy = labels[kind];
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  const [type, setType] = useState<"income" | "expense">("income");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(today);
  const [category, setCategory] = useState("Receita recorrente");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [mrr, setMrr] = useState("");
  const [ltv, setLtv] = useState("");
  const [startedAt, setStartedAt] = useState(today);
  const [clientKey, setClientKey] = useState(clients[0]?.name ?? "Interno");
  const [progress, setProgress] = useState("0");
  const [status, setStatus] = useState<"on_track" | "at_risk">("on_track");
  const [stage, setStage] = useState("Diagnóstico");
  const [title, setTitle] = useState("");
  const [probability, setProbability] = useState("30");

  async function post(url: string, body: unknown) {
    const response = await fetch(url, {
      method: "POST",
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
      if (kind === "transaction") {
        const parsed = parseMoney(amount);
        if (!description.trim() || !parsed) throw new Error("Preencha descrição e valor.");
        await post("/api/transactions", {
          description: description.trim(),
          counterparty: description.trim(),
          category,
          type,
          amount: parsed,
          dueDate,
        });
      } else if (kind === "client") {
        const parsedMrr = parseMoney(mrr) || 0;
        const parsedLtv = parseMoney(ltv) || 0;
        if (!name.trim()) throw new Error("Informe o nome do cliente.");
        await post("/api/clients", {
          name: name.trim(),
          initials: initialsFrom(name) || "CL",
          mrr: parsedMrr,
          ltv: parsedLtv,
          startedAt,
        });
      } else if (kind === "team") {
        const parsedCost = parseMoney(amount) || 0;
        if (!name.trim() || !role.trim()) throw new Error("Informe nome e função.");
        await post("/api/team", {
          name: name.trim(),
          initials: initialsFrom(name) || "EQ",
          role: role.trim(),
          monthlyCost: parsedCost,
        });
      } else if (kind === "project") {
        if (!name.trim()) throw new Error("Informe o nome do projeto.");
        const selected = clients.find((client) => client.name === clientKey);
        await post("/api/projects", {
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
        await post("/api/proposals", {
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
              <button className={type === "income" ? "active" : ""} onClick={() => setType("income")}>
                <ArrowUpRight />
                Entrada
              </button>
              <button className={type === "expense" ? "active" : ""} onClick={() => setType("expense")}>
                <ArrowDownRight />
                Saída
              </button>
            </div>
            <label>
              Descrição
              <input
                placeholder="Ex.: Mensalidade Chatbô"
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
              Categoria
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option>Receita recorrente</option>
                <option>Projeto</option>
                <option>Equipe</option>
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
