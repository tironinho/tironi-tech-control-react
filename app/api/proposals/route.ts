import { z } from "zod";
import { apiFail, assertBoardAccess, requireApiUser } from "@/lib/auth";
import {
  addActivity,
  createProposal,
  deleteProposal,
  parseRecordId,
  updateProposal,
  updateProposalStage,
} from "@/lib/dashboard";
import { PROPOSAL_STAGES } from "@/lib/pipeline";

const payloadSchema = z.object({
  stage: z.enum(PROPOSAL_STAGES),
  clientName: z.string().trim().min(2).max(120),
  title: z.string().trim().min(2).max(160),
  amount: z.number().min(0),
  probability: z.number().int().min(0).max(100),
  contactName: z.string().trim().max(120).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
  ownerId: z.number().int().positive().nullable().optional().default(null),
  leadTemperature: z.enum(["quente", "frio"]).default("quente"),
  channel: z.string().trim().max(80).optional().default(""),
  historyNote: z.string().trim().max(300).optional(),
});

const stageSchema = z.object({
  stage: z.enum(PROPOSAL_STAGES),
});

export async function POST(request: Request) {
  try {
    const session = await requireApiUser("any");
    assertBoardAccess(session, "comercial");
    const payload = payloadSchema.parse(await request.json());
    const { historyNote, ...data } = payload;
    const row = await createProposal({ ...data, author: session.name });
    if (historyNote) await addActivity("proposal", Number(row.id), historyNote, session.name);
    return Response.json({ ok: true, id: row.id });
  } catch (error) {
    return apiFail(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireApiUser("any");
    assertBoardAccess(session, "comercial");
    const id = parseRecordId(new URL(request.url).searchParams.get("id"));
    const body = await request.json();
    if (body && typeof body === "object" && "stage" in body && !("title" in body) && !("clientName" in body)) {
      const payload = stageSchema.parse(body);
      const row = await updateProposalStage(id, payload.stage, session.name);
      return Response.json({ ok: true, id: row.id });
    }
    const payload = payloadSchema.parse(body);
    const { historyNote, ...data } = payload;
    const row = await updateProposal(id, data, session.name);
    if (historyNote) await addActivity("proposal", id, historyNote, session.name);
    return Response.json({ ok: true, id: row.id });
  } catch (error) {
    return apiFail(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireApiUser("any");
    assertBoardAccess(session, "comercial");
    const id = parseRecordId(new URL(request.url).searchParams.get("id"));
    await deleteProposal(id);
    return Response.json({ ok: true });
  } catch (error) {
    return apiFail(error);
  }
}
