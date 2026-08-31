import { z } from "zod";
import { apiFail, homeFor, loginWithPassword, setSession } from "@/lib/auth";

const payloadSchema = z.object({
  username: z.string().trim().min(2).max(80),
  password: z.string().min(4).max(120),
});

export async function POST(request: Request) {
  try {
    const payload = payloadSchema.parse(await request.json());
    const user = await loginWithPassword(payload.username, payload.password);
    await setSession(user);
    return Response.json({ ok: true, home: homeFor(user) });
  } catch (error) {
    return apiFail(error);
  }
}
