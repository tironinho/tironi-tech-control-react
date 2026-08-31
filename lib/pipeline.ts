export const PROPOSAL_STAGES = [
  "Início de lead",
  "Primeiro contato",
  "Qualificação",
  "Proposta enviada",
  "Negociação",
  "Aprovada",
  "Não vingou",
] as const;

export const PROJECT_STAGES = [
  "Backlog",
  "Em andamento",
  "Em revisão",
  "Atenção",
  "Concluído",
  "Pausado",
] as const;

export const LEAD_TEMPERATURES = ["quente", "frio"] as const;

export const LEAD_CHANNELS = [
  "Indicação",
  "Instagram",
  "LinkedIn",
  "WhatsApp",
  "Site",
  "Evento",
  "Cold outreach",
  "Outro",
] as const;

export type ProposalStage = (typeof PROPOSAL_STAGES)[number];
export type ProjectStage = (typeof PROJECT_STAGES)[number];
export type LeadTemperature = (typeof LEAD_TEMPERATURES)[number];

export function mapLegacyProjectStage(status: string): ProjectStage {
  if (status === "on_track") return "Em andamento";
  if (status === "at_risk") return "Atenção";
  if ((PROJECT_STAGES as readonly string[]).includes(status)) return status as ProjectStage;
  return "Em andamento";
}

export function mapLegacyProposalStage(stage: string): ProposalStage {
  if (stage === "Diagnóstico") return "Início de lead";
  if (stage === "Perdida") return "Não vingou";
  if ((PROPOSAL_STAGES as readonly string[]).includes(stage)) return stage as ProposalStage;
  return "Início de lead";
}

export function proposalConversionRate(
  proposals: { stage: string; createdAt?: string | null }[],
  days = 90,
) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const closed = proposals.filter((item) => {
    const stage = mapLegacyProposalStage(item.stage);
    if (stage !== "Aprovada" && stage !== "Não vingou") return false;
    if (!item.createdAt) return true;
    return new Date(item.createdAt).getTime() >= cutoff;
  });
  if (!closed.length) return 0;
  const won = closed.filter((item) => mapLegacyProposalStage(item.stage) === "Aprovada").length;
  return Math.round((won / closed.length) * 100);
}
