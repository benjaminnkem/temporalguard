import { z } from 'zod';

export const investigationClaimSchema = z.object({
  text: z.string().min(1).max(1000),
  evidenceIds: z.array(z.string().uuid()).min(1).max(20),
});

export const investigationReportSchema = z.object({
  schemaVersion: z.literal('1.0'),
  summary: z.string().min(1).max(4000),
  confidence: z.enum(['low', 'medium', 'high']),
  telemetryCompleteness: z.object({
    score: z.number().min(0).max(1),
    gaps: z.array(z.string().max(300)).max(20),
  }),
  contributors: z
    .array(
      z.object({
        rank: z.number().int().positive(),
        name: z.string().max(255),
        score: z.number().min(0).max(1),
        evidenceIds: z.array(z.string().uuid()).min(1).max(20),
      }),
    )
    .max(20),
  claims: z.array(investigationClaimSchema).max(30),
  noRemediationPerformed: z.literal(true),
});

export type InvestigationReport = z.infer<typeof investigationReportSchema>;

export function neutralizeTelemetryPromptInjection(value: string): string {
  return value.replace(
    /(ignore (all|any|previous)|system prompt|developer message|you are chatgpt|act as|follow these instructions)/gi,
    '[UNTRUSTED_INSTRUCTION_REDACTED]',
  );
}

export function removeUnsupportedClaims(
  candidate: InvestigationReport,
  knownEvidenceIds: Set<string>,
): InvestigationReport {
  const supported = (ids: string[]) =>
    ids.length > 0 && ids.every((id) => knownEvidenceIds.has(id));
  return investigationReportSchema.parse({
    ...candidate,
    claims: candidate.claims.filter((claim) => supported(claim.evidenceIds)),
    contributors: candidate.contributors
      .filter((contributor) => supported(contributor.evidenceIds))
      .sort(
        (a, b) =>
          b.score - a.score ||
          a.name.localeCompare(b.name) ||
          a.evidenceIds.join().localeCompare(b.evidenceIds.join()),
      )
      .map((contributor, index) => ({ ...contributor, rank: index + 1 })),
    noRemediationPerformed: true,
  });
}
