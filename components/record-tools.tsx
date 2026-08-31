"use client";

import { Pencil, Trash2, X } from "lucide-react";

export function RecordTools({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="record-tools">
      <button type="button" title="Editar" onClick={(event) => { event.stopPropagation(); onEdit(); }}>
        <Pencil />
      </button>
      <button type="button" className="danger" title="Excluir" onClick={(event) => { event.stopPropagation(); onDelete(); }}>
        <Trash2 />
      </button>
    </div>
  );
}

export function ConfirmDelete({
  title,
  message,
  error,
  busy,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  error?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="backdrop" onMouseDown={onCancel}>
      <section className="modal" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <h2>{title}</h2>
            <p>{message}</p>
          </div>
          <button type="button" onClick={onCancel}>
            <X />
          </button>
        </header>
        {error ? <p className="note">{error}</p> : null}
        <footer>
          <button type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button className="danger-btn" type="button" onClick={onConfirm} disabled={busy}>
            {busy ? "Excluindo..." : "Excluir"}
          </button>
        </footer>
      </section>
    </div>
  );
}
