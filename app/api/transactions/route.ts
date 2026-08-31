import { z } from "zod";
import { apiFail, requireApiUser } from "@/lib/auth";
import {
  createTransaction,
  deleteTransaction,
  parseRecordId,
  updateTransaction,
} from "@/lib/dashboard";

const payloadSchema = z
  .object({
    description: z.string().trim().min(2).max(200),
    clientId: z.number().int().positive().nullable(),
    category: z.enum([
      "Receita recorrente",
      "Projeto",
      "Equipe",
      "Custo recorrente",
      "Investimento",
    ]),
    type: z.enum(["income", "expense"]),
    amount: z.number().positive(),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    status: z.enum(["receivable", "expected", "payable", "paid"]).optional(),
    endsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  })
  .refine((payload) => payload.type !== "income" || payload.clientId != null, {
    message: "Selecione o cliente da receita.",
    path: ["clientId"],
  })
  .refine(
    (payload) =>
      payload.category !== "Receita recorrente" ||
      payload.type !== "income" ||
      Boolean(payload.endsAt),
    {
      message: "Informe a data de fim do contrato.",
      path: ["endsAt"],
    },
  );

function fail(error: unknown) {
  return apiFail(error);
}

export async function POST(request: Request) {
  try {
    await requireApiUser("admin");
    const payload = payloadSchema.parse(await request.json());
    const row = await createTransaction(payload);
    return Response.json({ ok: true, id: row.id });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireApiUser("admin");
    const id = parseRecordId(new URL(request.url).searchParams.get("id"));
    const payload = payloadSchema.parse(await request.json());
    const row = await updateTransaction(id, payload);
    return Response.json({ ok: true, id: row.id });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireApiUser("admin");
    const id = parseRecordId(new URL(request.url).searchParams.get("id"));
    await deleteTransaction(id);
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
