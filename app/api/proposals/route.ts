import { z } from "zod";
import { createProposal, deleteProposal, parseRecordId, updateProposal } from "@/lib/dashboard";

const payloadSchema = z.object({
  stage: z.enum(["Diagnóstico", "Proposta enviada", "Negociação", "Aprovada"]),
  clientName: z.string().trim().min(2).max(120),
  title: z.string().trim().min(2).max(160),
  amount: z.number().positive(),
  probability: z.number().int().min(0).max(100),
});

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : "Invalid payload";
  return Response.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    const payload = payloadSchema.parse(await request.json());
    const row = await createProposal(payload);
    return Response.json({ ok: true, id: row.id });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const id = parseRecordId(new URL(request.url).searchParams.get("id"));
    const payload = payloadSchema.parse(await request.json());
    const row = await updateProposal(id, payload);
    return Response.json({ ok: true, id: row.id });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const id = parseRecordId(new URL(request.url).searchParams.get("id"));
    await deleteProposal(id);
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
