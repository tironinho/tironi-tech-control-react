import { z } from "zod";
import { createProject } from "@/lib/dashboard";

const payloadSchema = z.object({
  name: z.string().trim().min(2).max(160),
  clientId: z.number().nullable(),
  clientName: z.string().trim().min(2).max(120),
  progress: z.number().int().min(0).max(100),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["on_track", "at_risk"]),
});

export async function POST(request: Request) {
  try {
    const payload = payloadSchema.parse(await request.json());
    const row = await createProject(payload);
    return Response.json({ ok: true, id: row.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid payload";
    return Response.json({ error: message }, { status: 400 });
  }
}
