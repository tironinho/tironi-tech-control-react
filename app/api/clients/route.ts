import { z } from "zod";
import { apiFail, requireApiUser } from "@/lib/auth";
import { createClient, deleteClient, parseRecordId, updateClient } from "@/lib/dashboard";

const payloadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  initials: z.string().trim().min(1).max(4),
  mrr: z.number().min(0),
  ltv: z.number().min(0),
  startedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(request: Request) {
  try {
    await requireApiUser("admin");
    const payload = payloadSchema.parse(await request.json());
    const row = await createClient(payload);
    return Response.json({ ok: true, id: row.id });
  } catch (error) {
    return apiFail(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireApiUser("admin");
    const id = parseRecordId(new URL(request.url).searchParams.get("id"));
    const payload = payloadSchema.parse(await request.json());
    const row = await updateClient(id, payload);
    return Response.json({ ok: true, id: row.id });
  } catch (error) {
    return apiFail(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireApiUser("admin");
    const id = parseRecordId(new URL(request.url).searchParams.get("id"));
    await deleteClient(id);
    return Response.json({ ok: true });
  } catch (error) {
    return apiFail(error);
  }
}
