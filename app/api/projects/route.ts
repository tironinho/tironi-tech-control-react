import { z } from "zod";
import { apiFail, assertBoardAccess, requireApiUser } from "@/lib/auth";
import {
  addActivity,
  createProject,
  deleteProject,
  parseRecordId,
  updateProject,
  updateProjectStage,
} from "@/lib/dashboard";
import { PROJECT_STAGES } from "@/lib/pipeline";

const payloadSchema = z.object({
  name: z.string().trim().min(2).max(160),
  clientId: z.number().nullable(),
  clientName: z.string().trim().min(2).max(120),
  progress: z.number().int().min(0).max(100),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(PROJECT_STAGES),
  contactName: z.string().trim().max(120).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
  ownerId: z.number().int().positive().nullable().optional().default(null),
  historyNote: z.string().trim().max(300).optional(),
});

const stageSchema = z.object({
  status: z.enum(PROJECT_STAGES),
});

export async function POST(request: Request) {
  try {
    const session = await requireApiUser("any");
    assertBoardAccess(session, "desenvolvimento");
    const payload = payloadSchema.parse(await request.json());
    const { historyNote, ...data } = payload;
    const row = await createProject({ ...data, author: session.name });
    if (historyNote) await addActivity("project", Number(row.id), historyNote, session.name);
    return Response.json({ ok: true, id: row.id });
  } catch (error) {
    return apiFail(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireApiUser("any");
    assertBoardAccess(session, "desenvolvimento");
    const id = parseRecordId(new URL(request.url).searchParams.get("id"));
    const body = await request.json();
    if (body && typeof body === "object" && "status" in body && !("name" in body)) {
      const payload = stageSchema.parse(body);
      const row = await updateProjectStage(id, payload.status, session.name);
      return Response.json({ ok: true, id: row.id });
    }
    const payload = payloadSchema.parse(body);
    const { historyNote, ...data } = payload;
    const row = await updateProject(id, data, session.name);
    if (historyNote) await addActivity("project", id, historyNote, session.name);
    return Response.json({ ok: true, id: row.id });
  } catch (error) {
    return apiFail(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireApiUser("any");
    assertBoardAccess(session, "desenvolvimento");
    const id = parseRecordId(new URL(request.url).searchParams.get("id"));
    await deleteProject(id);
    return Response.json({ ok: true });
  } catch (error) {
    return apiFail(error);
  }
}
