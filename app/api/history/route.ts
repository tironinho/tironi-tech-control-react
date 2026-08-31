import { z } from "zod";
import { apiFail, requireApiUser } from "@/lib/auth";
import { addActivity, listActivity, parseRecordId } from "@/lib/dashboard";

const payloadSchema = z.object({
  type: z.enum(["proposal", "project"]),
  id: z.number().int().positive(),
  message: z.string().trim().min(2).max(300),
});

export async function GET(request: Request) {
  try {
    await requireApiUser("any");
    const params = new URL(request.url).searchParams;
    const type = params.get("type");
    if (type !== "proposal" && type !== "project") {
      throw new Error("Tipo de histórico inválido.");
    }
    const id = parseRecordId(params.get("id"));
    const items = await listActivity(type, id);
    return Response.json({ items });
  } catch (error) {
    return apiFail(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiUser("any");
    const payload = payloadSchema.parse(await request.json());
    await addActivity(payload.type, payload.id, payload.message, session.name);
    return Response.json({ ok: true });
  } catch (error) {
    return apiFail(error);
  }
}
