import { z } from "zod";
import { apiFail, requireApiUser } from "@/lib/auth";
import { createSector } from "@/lib/dashboard";

const payloadSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export async function POST(request: Request) {
  try {
    await requireApiUser("admin");
    const payload = payloadSchema.parse(await request.json());
    const row = await createSector(payload.name);
    return Response.json({ ok: true, id: row.id });
  } catch (error) {
    return apiFail(error);
  }
}
