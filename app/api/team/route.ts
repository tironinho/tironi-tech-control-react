import { z } from "zod";
import { apiFail, requireApiUser } from "@/lib/auth";
import {
  createTeamMember,
  deleteTeamMember,
  parseRecordId,
  updateTeamMember,
} from "@/lib/dashboard";

const payloadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  initials: z.string().trim().min(1).max(4),
  role: z.string().trim().min(2).max(120),
  monthlyCost: z.number().min(0),
  sectorId: z.number().int().positive().nullable(),
  username: z.string().trim().max(80).optional(),
  password: z.string().max(120).optional(),
});

export async function POST(request: Request) {
  try {
    await requireApiUser("admin");
    const payload = payloadSchema.parse(await request.json());
    const row = await createTeamMember(payload);
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
    const row = await updateTeamMember(id, payload);
    return Response.json({ ok: true, id: row.id });
  } catch (error) {
    return apiFail(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireApiUser("admin");
    const id = parseRecordId(new URL(request.url).searchParams.get("id"));
    await deleteTeamMember(id);
    return Response.json({ ok: true });
  } catch (error) {
    return apiFail(error);
  }
}
