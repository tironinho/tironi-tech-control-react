export const PROPOSAL_STAGES = [
  "Diagnóstico",
  "Qualificação",
  "Proposta enviada",
  "Negociação",
  "Aprovada",
  "Perdida",
] as const;

export const PROJECT_STAGES = [
  "Backlog",
  "Em andamento",
  "Em revisão",
  "Atenção",
  "Concluído",
  "Pausado",
] as const;

export type ProposalStage = (typeof PROPOSAL_STAGES)[number];
export type ProjectStage = (typeof PROJECT_STAGES)[number];

export function mapLegacyProjectStage(status: string): ProjectStage {
  if (status === "on_track") return "Em andamento";
  if (status === "at_risk") return "Atenção";
  if ((PROJECT_STAGES as readonly string[]).includes(status)) return status as ProjectStage;
  return "Em andamento";
}
