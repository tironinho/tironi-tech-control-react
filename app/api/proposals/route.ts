import { z } from "zod";
import { createProposal } from "@/lib/dashboard";

const payloadSchema = z.object({
  stage: z.enum(["Diagnóstico", "Proposta enviada", "Negociação", "Aprovada"]),
  clientName: z.string().trim().min(2).max(120),
  title: z.string().trim().min(2).max(160),
  amount: z.number().positive(),
  probability: z.number().int().min(0).max(100),
});

export async function POST(request: Request) {
  try {
    const payload = payloadSchema.parse(await request.json());
    const row = await createProposal(payload);
    return Response.json({ ok: true, id: row.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid payload";
    return Response.json({ error: message }, { status: 400 });
  }
}
