export function addMonths(isoDate: string, count: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const cursor = new Date(Date.UTC(year, month - 1 + count, 1));
  const lastDay = new Date(
    Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0),
  ).getUTCDate();
  cursor.setUTCDate(Math.min(day, lastDay));
  return cursor.toISOString().slice(0, 10);
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

  const dates: string[] = [];
  let current = start;
  for (let i = 0; i < 120; i += 1) {
    if (current > end) break;
    dates.push(current);
    current = addMonths(current, 1);
  }

  if (!dates.length) throw new Error("Informe um período de contrato válido.");
  return dates;
}

export function isRecurringIncome(category: string, type: "income" | "expense") {
  return type === "income" && category === "Receita recorrente";
}
