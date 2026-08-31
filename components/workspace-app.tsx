"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, FolderKanban, LogOut, Plus, Target, TrendingUp } from "lucide-react";
import type { PipelineData } from "@/lib/dashboard-types";
import { formatDueDate, money } from "@/lib/money";
import { PROJECT_STAGES, PROPOSAL_STAGES } from "@/lib/pipeline";
import { CreateRecordModal, type CreateKind, type ModalEdit } from "@/components/create-record-modal";
import { KanbanBoard } from "@/components/kanban-board";
import { ConfirmDelete, RecordTools } from "@/components/record-tools";

export function WorkspaceApp({
  area,
  userName,
  data,
}: {
  area: "comercial" | "desenvolvimento";
  userName: string;
  data: PipelineData;
}) {
  const router = useRouter();
  const isComercial = area === "comercial";
  const kind: CreateKind = isComercial ? "proposal" : "project";
  const [modal, setModal] = useState<{ kind: CreateKind; edit?: ModalEdit } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: number; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [moves, setMoves] = useState<Record<number, string>>({});

  const pipeline = data.proposals.reduce((sum, item) => sum + item.amount, 0);
  const weighted = data.proposals.reduce((sum, item) => sum + (item.amount * item.probability) / 100, 0);

  const proposals = useMemo(
    () => data.proposals.map((item) => ({ ...item, stage: moves[item.id] ?? item.stage })),
    [data.proposals, moves],
  );
  const projects = useMemo(
    () => data.projects.map((item) => ({ ...item, status: moves[item.id] ?? item.status })),
    [data.projects, moves],
  );

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  async function moveProposal(id: number, stage: string) {
    setMoves((current) => ({ ...current, [id]: stage }));
    const response = await fetch(`/api/proposals?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    if (!response.ok) {
      setMoves((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    }
    router.refresh();
  }

  async function moveProject(id: number, status: string) {
    setMoves((current) => ({ ...current, [id]: status }));
    const response = await fetch(`/api/projects?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      setMoves((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    }
    router.refresh();
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const path = isComercial ? "/api/proposals" : "/api/projects";
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

  return (
    <div className="staff-app">
      <header className="staff-top">
        <div className="brand">
          <i>T</i>
          <span>
            <b>TIRONI</b>
            <small>{isComercial ? "COMERCIAL" : "DESENVOLVIMENTO"}</small>
          </span>
        </div>
        <div>
          <small>{userName}</small>
          <button type="button" onClick={logout}>
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </header>
      <main className="content">
        <div className="title">
          <div>
            <h2>{isComercial ? "Propostas comerciais" : "Projetos em andamento"}</h2>
            <p>
              {isComercial
                ? "Arraste os cards para atualizar o estágio. Histórico, contato e responsável ficam na edição."
                : "Arraste os cards para atualizar o status da entrega e acompanhe o histórico de cada projeto."}
            </p>
          </div>
          <button className="primary" type="button" onClick={() => setModal({ kind })}>
            <Plus />
            {isComercial ? "Nova proposta" : "Novo projeto"}
          </button>
        </div>

        {isComercial ? (
          <>
            <div className="metrics three">
              <article className="metric">
                <i>
                  <FileText size={18} />
                </i>
                <div>
                  <small>Pipeline total</small>
                  <strong>{money(pipeline)}</strong>
                  <span>{data.proposals.length} oportunidades</span>
                </div>
              </article>
              <article className="metric">
                <i className="blue">
                  <TrendingUp size={18} />
                </i>
                <div>
                  <small>Pipeline ponderado</small>
                  <strong>{money(weighted)}</strong>
                  <span>Por probabilidade</span>
                </div>
              </article>
              <article className="metric">
                <i className="violet">
                  <Target size={18} />
                </i>
                <div>
                  <small>Em aberto</small>
                  <strong>{proposals.filter((item) => item.stage !== "Aprovada" && item.stage !== "Perdida").length}</strong>
                  <span>Fora de aprovada/perdida</span>
                </div>
              </article>
            </div>
            <KanbanBoard
              columns={PROPOSAL_STAGES}
              items={proposals}
              columnOf={(item) => item.stage}
              onMove={moveProposal}
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
                    onDelete={() => setPendingDelete({ id: item.id, label: item.title })}
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
        ) : (
          <>
            <div className="metrics three">
              <article className="metric">
                <i>
                  <FolderKanban size={18} />
                </i>
                <div>
                  <small>Projetos</small>
                  <strong>{String(data.projects.length)}</strong>
                  <span>No quadro</span>
                </div>
              </article>
              <article className="metric">
                <i className="blue">
                  <Target size={18} />
                </i>
                <div>
                  <small>Em andamento</small>
                  <strong>{String(projects.filter((item) => item.status === "Em andamento").length)}</strong>
                  <span>Ativos agora</span>
                </div>
              </article>
              <article className="metric">
                <i className="amber">
                  <TrendingUp size={18} />
                </i>
                <div>
                  <small>Atenção</small>
                  <strong>{String(projects.filter((item) => item.status === "Atenção").length)}</strong>
                  <span>Precisam de acompanhamento</span>
                </div>
              </article>
            </div>
            <KanbanBoard
              columns={PROJECT_STAGES}
              items={projects}
              columnOf={(item) => item.status}
              onMove={moveProject}
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
                    onDelete={() => setPendingDelete({ id: item.id, label: item.name })}
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
        )}
      </main>
      {modal ? (
        <CreateRecordModal
          kind={modal.kind}
          clients={data.clients}
          team={data.team}
          sectors={data.sectors}
          edit={modal.edit}
          onClose={() => setModal(null)}
        />
      ) : null}
      {pendingDelete ? (
        <ConfirmDelete
          title="Excluir registro"
          message={`Excluir “${pendingDelete.label}”? Essa ação não pode ser desfeita.`}
          error={deleteError}
          busy={deleting}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
        />
      ) : null}
    </div>
  );
}
