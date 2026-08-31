export function addMonths(isoDate: string, count: number, anchorDay?: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const preferred = anchorDay ?? day;
  const cursor = new Date(Date.UTC(year, month - 1 + count, 1));
  const lastDay = new Date(
    Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0),
  ).getUTCDate();
  cursor.setUTCDate(Math.min(preferred, lastDay));
  return cursor.toISOString().slice(0, 10);
}

export function normalizeDate(value: string | null | undefined) {
  if (!value) return "";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "";
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return "";
  }
  return `${match[1]}-${match[2]}-${match[3]}`;
}

export function isValidDate(value: string) {
  return Boolean(normalizeDate(value));
}

export function monthKey(isoDate: string) {
  return isoDate.slice(0, 7);
}

export function monthStart(isoDate: string) {
  return `${isoDate.slice(0, 7)}-01`;
}

export function monthlyDates(start: string, end: string) {
  if (end < start) {
    throw new Error("O fim do contrato precisa ser depois do primeiro vencimento.");
  }

  const anchorDay = Number(start.split("-")[2]);
  const dates: string[] = [];
  let current = start;
  for (let i = 0; i < 120; i += 1) {
    if (current > end) break;
    dates.push(current);
    current = addMonths(current, 1, anchorDay);
  }

  if (!dates.length) throw new Error("Informe um período de contrato válido.");
  return dates;
}

export function isRecurringIncome(category: string, type: "income" | "expense") {
  return type === "income" && category === "Receita recorrente";
}
