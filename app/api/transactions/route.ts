import { z } from "zod";
import { createTransaction } from "@/lib/dashboard";

const payloadSchema = z.object({
  description: z.string().trim().min(2).max(200),
  counterparty: z.string().trim().min(2).max(200),
  category: z.enum(["Receita recorrente", "Projeto", "Equipe"]),
  type: z.enum(["income", "expense"]),
  amount: z.number().positive(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(request: Request) {
  try {
    const payload = payloadSchema.parse(await request.json());
    const row = await createTransaction(payload);
    return Response.json({ ok: true, id: row.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid payload";
    return Response.json({ error: message }, { status: 400 });
  }
}
