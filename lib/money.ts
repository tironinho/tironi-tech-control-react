export function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function toNumber(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

export function monthLabel(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00`);
  return new Intl.DateTimeFormat("pt-BR", { month: "short" })
    .format(date)
    .replace(".", "")
    .replace(/^\w/, (letter) => letter.toUpperCase())
    .slice(0, 3);
}

export function monthLongLabel(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00`);
  const month = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(date);
  const year = new Intl.DateTimeFormat("pt-BR", { year: "numeric" }).format(date);
  return `${month.replace(/^\w/, (letter) => letter.toUpperCase())} de ${year}`;
}

export function formatDueDate(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00`);
  const day = new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(date);
  const month = new Intl.DateTimeFormat("pt-BR", { month: "short" })
    .format(date)
    .replace(".", "");
  const year = new Intl.DateTimeFormat("pt-BR", { year: "numeric" }).format(date);
  return `${day} ${month} ${year}`;
}

export function monthsSince(isoDate: string, now = new Date("2026-08-30")) {
  const start = new Date(`${isoDate}T00:00:00`);
  return Math.max(
    1,
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()),
  );
}
