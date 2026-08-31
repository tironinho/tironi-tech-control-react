import { z } from "zod";
import { createClient, deleteClient, parseRecordId, updateClient } from "@/lib/dashboard";

const payloadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  initials: z.string().trim().min(1).max(4),
  mrr: z.number().min(0),
  ltv: z.number().min(0),
  startedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : "Invalid payload";
  return Response.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    const payload = payloadSchema.parse(await request.json());
    const row = await createClient(payload);
    return Response.json({ ok: true, id: row.id });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const id = parseRecordId(new URL(request.url).searchParams.get("id"));
    const payload = payloadSchema.parse(await request.json());
    const row = await updateClient(id, payload);
    return Response.json({ ok: true, id: row.id });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const id = parseRecordId(new URL(request.url).searchParams.get("id"));
    await deleteClient(id);
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
