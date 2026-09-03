export const WRITE_OFF_STATUSES = ["defaulted", "loss"] as const;
export const TRANSACTION_STATUSES = [
  "receivable",
  "expected",
  "payable",
  "paid",
  "defaulted",
  "loss",
] as const;

export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];
export type WriteOffKind = "calote" | "prejuizo";

export function writeOffKind(status: string): WriteOffKind | null {
  if (status === "defaulted") return "calote";
  if (status === "loss") return "prejuizo";
  return null;
}

export function isWriteOffStatus(status: string) {
  return status === "defaulted" || status === "loss";
}

export function isSettledStatus(status: string) {
  return status === "paid" || isWriteOffStatus(status);
}

export function isOpenIncome(status: string) {
  return status === "receivable" || status === "expected";
}

export function isOpenExpense(status: string) {
  return status === "payable";
}

export function countsInCashflow(status: string) {
  return !isWriteOffStatus(status);
}

export function writeOffKindLabel(kind: string) {
  if (kind === "calote") return "Calote";
  if (kind === "prejuizo") return "Prejuízo";
  return kind;
}
