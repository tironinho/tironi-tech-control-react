"use client";

import { useState } from "react";

export function KanbanBoard<T extends { id: number }>({
  columns,
  items,
  columnOf,
  onMove,
  renderCard,
}: {
  columns: readonly string[];
  items: T[];
  columnOf: (item: T) => string;
  onMove: (id: number, column: string) => void;
  renderCard: (item: T) => React.ReactNode;
}) {
  const [over, setOver] = useState<string | null>(null);

  return (
    <div className="kanban">
      {columns.map((column) => (
        <section
          key={column}
          className={over === column ? "drop" : ""}
          onDragOver={(event) => {
            event.preventDefault();
            setOver(column);
          }}
          onDragLeave={() => setOver((current) => (current === column ? null : current))}
          onDrop={(event) => {
            event.preventDefault();
            const id = Number(event.dataTransfer.getData("text/plain"));
            const dropped = items.find((entry) => entry.id === id);
            setOver(null);
            if (id && dropped && columnOf(dropped) !== column) {
              onMove(id, column);
            }
          }}
        >
          <header>
            {column}
            <b>{items.filter((item) => columnOf(item) === column).length}</b>
          </header>
          {items
            .filter((item) => columnOf(item) === column)
            .map((item) => (
              <article
                key={item.id}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/plain", String(item.id));
                  event.dataTransfer.effectAllowed = "move";
                }}
              >
                {renderCard(item)}
              </article>
            ))}
        </section>
      ))}
    </div>
  );
}
