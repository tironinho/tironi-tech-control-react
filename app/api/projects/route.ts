import { z } from "zod";
import { createProject, deleteProject, parseRecordId, updateProject } from "@/lib/dashboard";

const payloadSchema = z.object({
  name: z.string().trim().min(2).max(160),
  clientId: z.number().nullable(),
  clientName: z.string().trim().min(2).max(120),
  progress: z.number().int().min(0).max(100),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["on_track", "at_risk"]),
});

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : "Invalid payload";
  return Response.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    const payload = payloadSchema.parse(await request.json());
    const row = await createProject(payload);
    return Response.json({ ok: true, id: row.id });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const id = parseRecordId(new URL(request.url).searchParams.get("id"));
    const payload = payloadSchema.parse(await request.json());
    const row = await updateProject(id, payload);
    return Response.json({ ok: true, id: row.id });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const id = parseRecordId(new URL(request.url).searchParams.get("id"));
    await deleteProject(id);
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
