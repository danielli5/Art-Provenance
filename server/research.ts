import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { Express } from "express";
import {
  researchRequestSchema,
  type CouncilClaim,
  type ModelRun,
  type ResearchFinding,
  type ResearchJob,
  type ResearchRequest,
  type ResearchTier,
} from "../shared/research";

// Perplexity Agent API. In the Computer sandbox and on pplx.app, a credential
// proxy supplies the URL and token. Elsewhere, set PERPLEXITY_API_KEY.
function endpoint() {
  const proxyUrl = process.env.CUSTOM_CRED_API_PERPLEXITY_AI_URL;
  const proxyKey = process.env.CUSTOM_CRED_API_PERPLEXITY_AI_PROXY_AUTH_KEY;
  if (proxyUrl && proxyKey) {
    return { url: `${proxyUrl.replace(/\/$/, "")}/v1/agent`, headers: { "x-api-key": proxyKey } as Record<string, string> };
  }
  const key = process.env.PERPLEXITY_API_KEY;
  if (key) return { url: "https://api.perplexity.ai/v1/agent", headers: { Authorization: `Bearer ${key}` } as Record<string, string> };
  return null;
}
export const researchConfigured = () => endpoint() !== null;

type Lineup = { label: string; provider: string; model: string }[];
export const lineups: Record<ResearchTier, { researchers: Lineup; single: Lineup[number]; synthesizer: Lineup[number] }> = {
  frontier: {
    single: { label: "Claude Sonnet 5.5", provider: "Anthropic", model: "anthropic/claude-sonnet-5-5" },
    researchers: [
      { label: "Claude Opus 5.5", provider: "Anthropic", model: "anthropic/claude-opus-5-5" },
      { label: "GPT-6.1 Sol", provider: "OpenAI", model: "openai/gpt-6.1-sol" },
      { label: "Gemini 3.1 Pro", provider: "Google", model: "google/gemini-3.1-pro-preview" },
    ],
    synthesizer: { label: "Claude Sonnet 5.5", provider: "Anthropic", model: "anthropic/claude-sonnet-5-5" },
  },
  efficient: {
    single: { label: "GPT-6 Luna", provider: "OpenAI", model: "openai/gpt-6-luna" },
    researchers: [
      { label: "Claude Haiku 5.5", provider: "Anthropic", model: "anthropic/claude-haiku-5-5" },
      { label: "GPT-6 Luna", provider: "OpenAI", model: "openai/gpt-6-luna" },
      { label: "Gemini 3.8 Flash", provider: "Google", model: "google/gemini-3.8-flash" },
    ],
    synthesizer: { label: "GPT-6 Luna", provider: "OpenAI", model: "openai/gpt-6-luna" },
  },
};

const findingSchema = {
  type: "object", additionalProperties: false,
  required: ["summary", "findings", "gaps"],
  properties: {
    summary: { type: "string" },
    findings: { type: "array", items: { type: "object", additionalProperties: false,
      required: ["claim", "date", "relation", "certainty", "sourceUrls"],
      properties: {
        claim: { type: "string" }, date: { type: "string" },
        relation: { type: "string", enum: ["confirms_catalog", "adds_to_catalog", "conflicts_with_catalog"] },
        certainty: { type: "string", enum: ["documented", "reported", "alleged", "uncertain"] },
        sourceUrls: { type: "array", items: { type: "string" } },
      } } },
    gaps: { type: "array", items: { type: "string" } },
  },
};
const councilSchema = {
  type: "object", additionalProperties: false,
  required: ["summary", "claims"],
  properties: {
    summary: { type: "string" },
    claims: { type: "array", items: { type: "object", additionalProperties: false,
      required: ["claim", "date", "relation", "positions", "agreement", "needsReview", "note", "sourceUrls"],
      properties: {
        claim: { type: "string" }, date: { type: "string" },
        relation: { type: "string", enum: ["confirms_catalog", "adds_to_catalog", "conflicts_with_catalog"] },
        positions: { type: "array", items: { type: "object", additionalProperties: false, required: ["model", "stance"],
          properties: { model: { type: "string" }, stance: { type: "string", enum: ["supports", "reports_as_allegation", "contradicts", "not_mentioned"] } } } },
        agreement: { type: "string", enum: ["agree", "partial", "disagree", "single_model"] },
        needsReview: { type: "boolean" }, note: { type: "string" },
        sourceUrls: { type: "array", items: { type: "string" } },
      } } },
  },
};

const researcherInstructions = `You are a careful art provenance researcher. Always search the web before answering.
Rules:
- Cite only URLs that appeared in your own search results. Never invent a URL.
- Distinguish documented facts, reported accounts, and allegations. An allegation is not a finding.
- For each finding, state whether it confirms, adds to, or conflicts with the museum catalog text you were given.
- Prefer primary and institutional sources: museum records, sale catalogues, government or court documents, scholarly work, established newspapers.
- Return at most 8 findings, ordered chronologically, and list remaining gaps in the ownership chain.
- Keep each claim under 70 words and the summary under 90 words.`;

function researchPrompt(r: ResearchRequest) {
  return `Artwork: ${r.artist}, "${r.title}"${r.date ? `, ${r.date}` : ""}. Held by ${r.museum} (object ${r.objectId}).
Museum catalog provenance (verbatim):
${r.provenance || "(The museum record supplies no provenance text.)"}

Research beyond this catalog: restitution or ownership claims, disputes, settlements, auction and sale records, exhibition history relevant to ownership, scholarly sources, and unexplained gaps in the chain.`;
}

const jobs = new Map<string, ResearchJob>();
const resultCache = new Map<string, { jobId: string; time: number }>();
let spend = { day: new Date().toISOString().slice(0, 10), usd: 0 };
const dailyCap = Number(process.env.RESEARCH_DAILY_CAP_USD || 3);
const visitorRuns = new Map<string, number[]>();

function addSpend(usd: number) {
  const day = new Date().toISOString().slice(0, 10);
  if (spend.day !== day) spend = { day, usd: 0 };
  spend.usd += usd;
}
function spentToday() {
  const day = new Date().toISOString().slice(0, 10);
  return spend.day === day ? spend.usd : 0;
}

type AgentResult = { text: string; cost: number; queries: string[]; results: { url: string; title: string; date?: string }[] };
async function callAgent(model: string, input: string, instructions: string, schemaName: string, schema: object, useSearch: boolean): Promise<AgentResult> {
  const ep = endpoint();
  if (!ep) throw new Error("Perplexity API is not configured");
  const body: Record<string, unknown> = {
    model, input, instructions, max_output_tokens: 8000,
    response_format: { type: "json_schema", json_schema: { name: schemaName, schema } },
  };
  if (useSearch) { body.tools = [{ type: "web_search", max_results: 10 }]; body.max_steps = 6; }
  const response = await fetch(ep.url, {
    method: "POST", headers: { "Content-Type": "application/json", ...ep.headers },
    body: JSON.stringify(body), signal: AbortSignal.timeout(170_000),
  });
  if (!response.ok) throw new Error(`Perplexity API returned ${response.status}: ${(await response.text()).slice(0, 300)}`);
  const data: any = await response.json();
  const cost = Number(data?.usage?.cost?.total_cost) || 0;
  addSpend(cost);
  const queries: string[] = []; const results: AgentResult["results"] = [];
  let text = "";
  for (const item of data.output || []) {
    if (item.type === "search_results") {
      queries.push(...(item.queries || []));
      for (const r of item.results || []) if (typeof r.url === "string") results.push({ url: r.url, title: String(r.title || r.url), date: r.date || undefined });
    }
    if (item.type === "fetch_url_results") for (const c of item.content || []) if (typeof c.url === "string") results.push({ url: c.url, title: String(c.title || c.url) });
    if (item.type === "message") for (const c of item.content || []) if (c.type === "output_text") text += c.text;
  }
  if (!text && typeof data.output_text === "string") text = data.output_text;
  if (process.env.RESEARCH_DEBUG === "1") console.error(`[research] ${model} status=${data.status} types=${(data.output || []).map((o: any) => o.type).join(",")} text=${text.slice(0, 300)}`);
  text = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  return { text, cost, queries, results };
}

const normalizeUrl = (u: string) => u.trim().replace(/#.*$/, "").replace(/\/$/, "").replace(/^http:\/\//, "https://").toLowerCase();
function keepRetrieved(urls: unknown, retrieved: Set<string>) {
  return (Array.isArray(urls) ? urls : []).filter((u): u is string => typeof u === "string" && retrieved.has(normalizeUrl(u)) && /^https?:\/\//.test(u)).slice(0, 6);
}
function dedupe<T extends { url: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter(i => { const k = normalizeUrl(i.url); if (seen.has(k)) return false; seen.add(k); return true; });
}

async function runResearcher(job: ResearchJob, run: ModelRun, request: ResearchRequest) {
  const started = Date.now();
  run.status = "running";
  try {
    let result = await callAgent(run.model, researchPrompt(request), researcherInstructions, "provenance_research", findingSchema, true);
    let parsed: any;
    try { parsed = JSON.parse(result.text); }
    catch {
      const firstCost = result.cost;
      result = await callAgent(run.model, researchPrompt(request), researcherInstructions + "\n- Be brief: at most 6 findings.", "provenance_research", findingSchema, true);
      result.cost += firstCost;
      parsed = JSON.parse(result.text);
    }
    const retrieved = new Set(result.results.map(r => normalizeUrl(r.url)));
    run.sources = dedupe(result.results).slice(0, 40);
    run.queries = [...new Set(result.queries)].slice(0, 30);
    run.summary = String(parsed.summary || "");
    run.gaps = (parsed.gaps || []).map(String).slice(0, 8);
    run.findings = (parsed.findings || []).slice(0, 8).map((f: any): ResearchFinding => {
      const sourceUrls = keepRetrieved(f.sourceUrls, retrieved);
      return { claim: String(f.claim), date: String(f.date || ""), relation: f.relation, certainty: f.certainty, sourceUrls, unverifiedCitations: (f.sourceUrls || []).length - sourceUrls.length };
    });
    run.cost = result.cost;
    run.status = "done";
  } catch (error) {
    console.error(`[research] ${run.model} failed:`, error instanceof Error ? error.message : error);
    run.status = "failed";
    run.error = error instanceof Error && /Perplexity API returned 4\d\d/.test(error.message) ? error.message : "This model did not finish. Other models are unaffected.";
  } finally {
    run.durationMs = Date.now() - started;
    job.totalCost = job.runs.reduce((s, r) => s + (r.cost || 0), 0) + (job.synthesis?.cost || 0);
  }
}

async function runCouncil(job: ResearchJob, request: ResearchRequest, tier: ResearchTier) {
  await Promise.all(job.runs.map(run => runResearcher(job, run, request)));
  const finished = job.runs.filter(r => r.status === "done");
  if (finished.length < 2) { job.status = "failed"; job.error = "Fewer than two models finished, so there is nothing to compare."; return; }
  const synth = lineups[tier].synthesizer;
  job.synthesis = { status: "running", label: synth.label, model: synth.model, provider: synth.provider };
  const started = Date.now();
  try {
    const retrieved = new Set(finished.flatMap(r => (r.sources || []).map(s => normalizeUrl(s.url))));
    const reports = finished.map(r => ({ model: r.label, summary: r.summary, findings: r.findings }));
    const input = `Museum catalog provenance for ${request.artist}, "${request.title}" (${request.museum}):
${request.provenance || "(none supplied)"}

Independent research reports from ${finished.length} models from different providers:
${JSON.stringify(reports, null, 1)}`;
    const instructions = `You synthesize independent research reports into a claim-by-claim comparison. Do not research or add new facts.
- Merge findings that describe the same event into one claim. Keep at most 8 claims, chronological.
- For every claim give one position per model (${finished.map(r => r.label).join(", ")}): "supports" if the model states it as fact, "reports_as_allegation" if the model presents it as a claim or allegation, "contradicts" if it conflicts, "not_mentioned" otherwise.
- agreement: "agree" if all models support it in the same way; "partial" if some do not mention it or differ in certainty; "disagree" if any contradicts or one treats an allegation as fact; "single_model" if only one model mentions it.
- needsReview is true for anything other than full agreement, and for any allegation.
- note: one short sentence explaining the difference or why it needs review.
- sourceUrls: only URLs that appear in the reports.`;
    const result = await callAgent(synth.model, input, instructions, "council_synthesis", councilSchema, false);
    const parsed = JSON.parse(result.text);
    const labels = new Set(finished.map(r => r.label));
    job.synthesis.summary = String(parsed.summary || "");
    job.synthesis.claims = (parsed.claims || []).slice(0, 8).map((c: any): CouncilClaim => ({
      claim: String(c.claim), date: String(c.date || ""), relation: c.relation, agreement: c.agreement,
      needsReview: Boolean(c.needsReview) || c.agreement !== "agree", note: String(c.note || ""),
      positions: (c.positions || []).filter((p: any) => labels.has(p.model)).map((p: any) => ({ model: String(p.model), stance: p.stance })),
      sourceUrls: keepRetrieved(c.sourceUrls, retrieved),
    }));
    job.synthesis.cost = result.cost;
    job.synthesis.status = "done";
  } catch {
    job.synthesis.status = "failed";
    job.synthesis.error = "The comparison step did not finish. Each model's research is still shown.";
  } finally {
    job.synthesis.durationMs = Date.now() - started;
  }
}

const savedDir = "fixtures/research";
const savedPath = (r: { provider: string; objectId: number; mode: string }) => `${savedDir}/${r.provider}-${r.objectId}-${r.mode}.json`;

export function registerResearchRoutes(app: Express) {
  app.get("/api/research/config", (_req, res) => {
    res.json({
      configured: researchConfigured(),
      tiers: Object.fromEntries(Object.entries(lineups).map(([tier, l]) => [tier, { single: l.single, researchers: l.researchers, synthesizer: l.synthesizer }])),
      dailyCapUsd: dailyCap, spentTodayUsd: Number(spentToday().toFixed(4)),
    });
  });

  app.post("/api/research", (req, res) => {
    const parsed = researchRequestSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ message: "This artwork record could not be researched." }); return; }
    if (!researchConfigured()) { res.status(503).json({ message: "Live research is not configured on this server." }); return; }
    const request = parsed.data;
    const key = `${request.provider}:${request.objectId}:${request.mode}:${request.tier}`;
    const cached = resultCache.get(key);
    if (cached && Date.now() - cached.time < 60 * 60 * 1000 && jobs.get(cached.jobId)?.status === "done") {
      res.json({ jobId: cached.jobId, cached: true }); return;
    }
    if (spentToday() >= dailyCap) { res.status(429).json({ message: "Today's research budget for this demo has been used. The saved run is still available." }); return; }
    const visitor = req.get("X-Visitor-Id") || req.ip || "local";
    const now = Date.now();
    const recent = (visitorRuns.get(visitor) || []).filter(t => now - t < 10 * 60 * 1000);
    if (recent.length >= 6) { res.status(429).json({ message: "Please wait a few minutes before running more research." }); return; }
    visitorRuns.set(visitor, [...recent, now]);

    const lineup = lineups[request.tier];
    const models = request.mode === "council" ? lineup.researchers : [lineup.single];
    const job: ResearchJob = {
      id: randomUUID(), mode: request.mode, tier: request.tier, status: "running",
      startedAt: new Date().toISOString(), artwork: { provider: request.provider, objectId: request.objectId, title: request.title, artist: request.artist },
      runs: models.map(m => ({ label: m.label, provider: m.provider, model: m.model, status: "queued" })), totalCost: 0, saved: false,
    };
    jobs.set(job.id, job);
    if (jobs.size > 200) { const oldest = jobs.keys().next().value; if (oldest) jobs.delete(oldest); }
    (async () => {
      if (request.mode === "council") await runCouncil(job, request, request.tier);
      else {
        await runResearcher(job, job.runs[0], request);
        if (job.runs[0].status === "failed") { job.status = "failed"; job.error = job.runs[0].error; }
      }
      if (job.status !== "failed") job.status = "done";
      job.totalCost = job.runs.reduce((s, r) => s + (r.cost || 0), 0) + (job.synthesis?.cost || 0);
      job.finishedAt = new Date().toISOString();
      if (job.status === "done" && job.runs.every(r => r.status === "done") && (job.mode === "search" || job.synthesis?.status === "done")) {
        resultCache.set(key, { jobId: job.id, time: Date.now() });
        if (process.env.RESEARCH_SAVE_RUNS === "1") {
          await mkdir(savedDir, { recursive: true });
          await writeFile(savedPath({ provider: request.provider, objectId: request.objectId, mode: request.mode }), JSON.stringify({ ...job, saved: true }, null, 1));
        }
      }
    })();
    res.status(202).json({ jobId: job.id, cached: false });
  });

  app.get("/api/research/saved/:provider/:id/:mode", async (req, res) => {
    const { provider, id, mode } = req.params;
    if (!/^(aic|met|cleveland|rijks)$/.test(provider) || !/^\d{1,9}$/.test(id) || !/^(search|council)$/.test(mode)) { res.status(400).json({ message: "Invalid request" }); return; }
    try { res.json(JSON.parse(await readFile(savedPath({ provider, objectId: Number(id), mode }), "utf8"))); }
    catch { res.status(404).json({ message: "No saved run for this artwork." }); }
  });

  app.get("/api/research/:id", (req, res) => {
    const job = jobs.get(String(req.params.id));
    if (!job) { res.status(404).json({ message: "This research run is no longer available." }); return; }
    res.json(job);
  });
}
