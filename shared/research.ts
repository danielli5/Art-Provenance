import { z } from "zod";

export const researchRequestSchema = z.object({
  provider: z.enum(["aic", "met", "cleveland", "rijks"]),
  objectId: z.number().int().positive().max(999_999_999),
  artist: z.string().trim().min(1).max(150),
  title: z.string().trim().min(1).max(200),
  date: z.string().max(80).optional().default(""),
  museum: z.string().trim().min(1).max(120),
  provenance: z.string().max(6000).optional().default(""),
  mode: z.enum(["search", "council"]),
  tier: z.enum(["frontier", "efficient"]),
});
export type ResearchRequest = z.infer<typeof researchRequestSchema>;
export type ResearchTier = ResearchRequest["tier"];
export type Relation = "confirms_catalog" | "adds_to_catalog" | "conflicts_with_catalog";

export type ResearchFinding = {
  claim: string; date: string; relation: Relation;
  certainty: "documented" | "reported" | "alleged" | "uncertain";
  sourceUrls: string[];
  unverifiedCitations: number;
};
export type ModelRun = {
  label: string; provider: string; model: string;
  status: "queued" | "running" | "done" | "failed";
  durationMs?: number; cost?: number; error?: string;
  summary?: string; findings?: ResearchFinding[]; gaps?: string[];
  queries?: string[]; sources?: { url: string; title: string; date?: string }[];
};
export type Stance = "supports" | "reports_as_allegation" | "contradicts" | "not_mentioned";
export type CouncilClaim = {
  claim: string; date: string; relation: Relation;
  positions: { model: string; stance: Stance }[];
  agreement: "agree" | "partial" | "disagree" | "single_model";
  needsReview: boolean; note: string; sourceUrls: string[];
};
export type ResearchJob = {
  id: string; mode: "search" | "council"; tier: ResearchTier;
  status: "running" | "done" | "failed"; error?: string;
  startedAt: string; finishedAt?: string; saved: boolean;
  artwork: { provider: string; objectId: number; title: string; artist: string };
  runs: ModelRun[];
  synthesis?: { status: "running" | "done" | "failed"; label: string; model: string; provider: string; durationMs?: number; cost?: number; error?: string; summary?: string; claims?: CouncilClaim[] };
  totalCost: number;
};
export type ResearchConfig = {
  configured: boolean;
  tiers: Record<ResearchTier, { single: { label: string; provider: string; model: string }; researchers: { label: string; provider: string; model: string }[]; synthesizer: { label: string; provider: string; model: string } }>;
  dailyCapUsd: number; spentTodayUsd: number;
};
