import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Search, Users, AlertTriangle, Check, Clock } from "lucide-react";
import type { Artwork } from "../../shared/artwork";
import type { CouncilClaim, ModelRun, ResearchConfig, ResearchJob, ResearchTier, Relation, Stance } from "../../shared/research";
import { apiRequest } from "./lib/queryClient";

const apiBase = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";
const relationLabel: Record<Relation, string> = { confirms_catalog: "Confirms catalog", adds_to_catalog: "Adds to catalog", conflicts_with_catalog: "Conflicts with catalog" };
const certaintyLabel = { documented: "Documented", reported: "Reported", alleged: "Allegation", uncertain: "Uncertain" } as const;
const stanceLabel: Record<Stance, string> = { supports: "States as fact", reports_as_allegation: "Reports as allegation", contradicts: "Contradicts", not_mentioned: "Not mentioned" };
const agreementLabel = { agree: "Models agree", partial: "Partial agreement", disagree: "Models disagree", single_model: "One model only" } as const;
const money = (n: number) => n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`;
const seconds = (ms?: number) => ms ? `${Math.round(ms / 1000)}s` : "";
const hostOf = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };

function SourceLinks({ urls, titles }: { urls: string[]; titles: Map<string, string> }) {
  if (!urls.length) return <p className="rr-nosource">No retrieved source was cited for this point. Treat it as unverified.</p>;
  return <ul className="rr-sources">{urls.map(u => <li key={u}><a href={u} target="_blank" rel="noopener noreferrer">{titles.get(u) && titles.get(u) !== u ? titles.get(u) : hostOf(u)} <ArrowUpRight size={12} /></a><span>{hostOf(u)}</span></li>)}</ul>;
}

function SearchTrail({ run }: { run: ModelRun }) {
  return <details className="technical-evidence rr-trail">
    <summary data-testid={`trail-${run.model}`}>Search trail · {run.queries?.length || 0} searches, {run.sources?.length || 0} sources retrieved</summary>
    {!!run.queries?.length && <><p className="rr-trail-label">Searches the model ran</p><ol className="rr-queries">{run.queries.map((q, i) => <li key={i}>{q}</li>)}</ol></>}
    {!!run.sources?.length && <><p className="rr-trail-label">Pages retrieved</p><ul className="rr-retrieved">{run.sources.map(s => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a> <span>{hostOf(s.url)}{s.date ? ` · ${s.date}` : ""}</span></li>)}</ul></>}
  </details>;
}

function Findings({ run, titles }: { run: ModelRun; titles: Map<string, string> }) {
  return <>
    {run.summary && <p className="rr-summary">{run.summary}</p>}
    <ol className="rr-findings">{(run.findings || []).map((f, i) => <li key={i} className={`rr-finding rel-${f.relation}`}>
      <div className="rr-finding-meta"><span className="rr-date">{f.date || "Undated"}</span><span className={`rr-badge rel-${f.relation}`}>{relationLabel[f.relation]}</span><span className={`rr-badge cert-${f.certainty}`}>{certaintyLabel[f.certainty]}</span></div>
      <p>{f.claim}</p>
      <SourceLinks urls={f.sourceUrls} titles={titles} />
    </li>)}</ol>
    {!!run.gaps?.length && <div className="rr-gaps"><p className="rr-trail-label">Gaps the model could not close</p><ul>{run.gaps.map((g, i) => <li key={i}>{g}</li>)}</ul></div>}
  </>;
}

function ClaimTable({ claims, models, titles }: { claims: CouncilClaim[]; models: string[]; titles: Map<string, string> }) {
  return <div className="rr-claims">{claims.map((c, i) => <article key={i} className={`rr-claim ${c.needsReview ? "needs-review" : ""}`} data-testid={`council-claim-${i}`}>
    <div className="rr-finding-meta"><span className="rr-date">{c.date || "Undated"}</span><span className={`rr-badge agree-${c.agreement}`}>{agreementLabel[c.agreement]}</span><span className={`rr-badge rel-${c.relation}`}>{relationLabel[c.relation]}</span>{c.needsReview && <span className="rr-review"><AlertTriangle size={13} />Needs human review</span>}</div>
    <p className="rr-claim-text">{c.claim}</p>
    <dl className="rr-stances">{models.map(m => { const s = c.positions.find(p => p.model === m)?.stance || "not_mentioned"; return <div key={m} className={`stance-${s}`}><dt>{m}</dt><dd>{stanceLabel[s]}</dd></div>; })}</dl>
    {c.note && <p className="rr-note">{c.note}</p>}
    <SourceLinks urls={c.sourceUrls} titles={titles} />
  </article>)}</div>;
}

export function ResearchRoom({ art }: { art: Artwork }) {
  const [config, setConfig] = useState<ResearchConfig | null>(null);
  const [tier, setTier] = useState<ResearchTier>("frontier");
  const [job, setJob] = useState<ResearchJob | null>(null);
  const [error, setError] = useState("");
  const [savedModes, setSavedModes] = useState<{ search?: boolean; council?: boolean }>({});
  const [now, setNow] = useState(Date.now());
  const [reused, setReused] = useState(false);
  const poll = useRef<number>();

  useEffect(() => { fetch(`${apiBase}/api/research/config`).then(r => r.json()).then(setConfig).catch(() => setConfig(null)); }, []);
  useEffect(() => {
    setJob(null); setError("");
    Promise.all((["search", "council"] as const).map(m => fetch(`${apiBase}/api/research/saved/${art.provider}/${art.id}/${m}`).then(r => [m, r.ok] as const).catch(() => [m, false] as const)))
      .then(entries => setSavedModes(Object.fromEntries(entries)));
  }, [art.provider, art.id]);
  useEffect(() => () => window.clearInterval(poll.current), []);
  useEffect(() => { if (job?.status !== "running") return; const t = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(t); }, [job?.status]);

  const titles = useMemo(() => new Map((job?.runs || []).flatMap(r => (r.sources || []).map(s => [s.url, s.title] as [string, string]))), [job]);
  const running = job?.status === "running";

  async function start(mode: "search" | "council") {
    setError(""); window.clearInterval(poll.current);
    try {
      const res = await apiRequest("POST", "/api/research", { provider: art.provider, objectId: art.id, artist: art.artist, title: art.title, date: art.date || "", museum: art.museum, provenance: (art.provenance || "").slice(0, 6000), mode, tier });
      const { jobId, cached } = await res.json();
      setReused(Boolean(cached));
      const tick = async () => {
        const r = await fetch(`${apiBase}/api/research/${jobId}`);
        if (!r.ok) { window.clearInterval(poll.current); setError("The research run was lost. Please try again."); return; }
        const j: ResearchJob = await r.json(); setJob(j);
        if (j.status !== "running") window.clearInterval(poll.current);
      };
      await tick();
      poll.current = window.setInterval(tick, 2000);
    } catch (e) {
      const msg = e instanceof Error ? e.message.replace(/^\d+:\s*/, "") : "";
      try { setError(JSON.parse(msg).message); } catch { setError(msg || "Live research could not start."); }
    }
  }
  async function openSaved(mode: "search" | "council") {
    window.clearInterval(poll.current); setError(""); setReused(false);
    const r = await fetch(`${apiBase}/api/research/saved/${art.provider}/${art.id}/${mode}`);
    if (r.ok) setJob(await r.json()); else setError("No saved run is available for this artwork.");
  }

  const lineup = config?.tiers[tier];
  const doneModels = job?.runs.filter(r => r.status === "done").map(r => r.label) || [];

  return <section className="research-room" aria-labelledby="research-room-heading" data-testid="research-room">
    <div className="research-heading"><h2 id="research-room-heading">Test the record against the open web.</h2><span className="mode-label">LIVE PERPLEXITY RESEARCH · SEPARATE FROM THE CATALOG</span></div>
    <p className="muted rr-intro">The chronology above is the museum's own account. Here, AI models search the live web through Perplexity's Agent API and report whether outside sources confirm, add to, or conflict with it. Every link shown was retrieved by the model's own search; any other cited link is removed.</p>

    {!config?.configured ? <p className="rr-unavailable">Live research isn't connected on this server. {savedModes.council || savedModes.search ? "A saved run is available below." : ""}</p> : <>
      <fieldset className="rr-lineup">
        <legend>Model lineup</legend>
        {(["frontier", "efficient"] as const).map(t => <label key={t} className={tier === t ? "active" : ""}>
          <input type="radio" name="tier" value={t} checked={tier === t} onChange={() => setTier(t)} disabled={running} data-testid={`tier-${t}`} />
          <span className="rr-tier-name">{t === "frontier" ? "Frontier models" : "Efficient models"}</span>
          <small>{config.tiers[t].researchers.map(m => m.label).join(" · ")}</small>
        </label>)}
      </fieldset>
      <div className="rr-actions">
        <button className="primary" onClick={() => start("search")} disabled={running} data-testid="button-research-search"><Search size={16} />Search the web · {lineup?.single.label}</button>
        <button className="secondary" onClick={() => start("council")} disabled={running} data-testid="button-research-council"><Users size={16} />Compare three models</button>
      </div>
    </>}
    {(savedModes.council || savedModes.search) && <div className="rr-saved-links">{savedModes.council && <button className="text-button" onClick={() => openSaved("council")} disabled={running} data-testid="button-saved-council">Open saved three-model run</button>}{savedModes.search && <button className="text-button" onClick={() => openSaved("search")} disabled={running} data-testid="button-saved-search">Open saved one-model run</button>}</div>}
    {error && <p className="rr-error" role="alert">{error}</p>}

    {job && <div className="rr-result" aria-live="polite">
      <div className="rr-result-head">
        <span className="eyebrow">{job.mode === "council" ? "MODEL COUNCIL-STYLE COMPARISON · BUILT ON PERPLEXITY'S AGENT API" : "LIVE WEB RESEARCH · ONE MODEL"}</span>
        <span className="evidence-status">{job.saved ? `Saved run from ${new Date(job.startedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}` : running ? "Running now" : reused ? `Live run from ${new Date(job.startedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}, reused` : "Live run"}{job.status !== "running" && job.totalCost > 0 ? (reused ? ` · cost ${money(job.totalCost)} when it ran; no new cost` : ` · API cost ${money(job.totalCost)}`) : ""}</span>
      </div>
      <ul className="rr-progress" data-testid="research-progress">
        {job.runs.map(r => <li key={r.model} className={`st-${r.status}`}><span className="rr-dot">{r.status === "done" ? <Check size={12} /> : r.status === "failed" ? <AlertTriangle size={12} /> : <Clock size={12} />}</span><strong>{r.label}</strong><span>{r.provider}</span><span>{r.status === "done" ? `${r.queries?.length || 0} searches · ${seconds(r.durationMs)}${r.cost ? ` · ${money(r.cost)}` : ""}` : r.status === "failed" ? r.error : `Searching… ${Math.max(0, Math.round((now - Date.parse(job.startedAt)) / 1000))}s`}</span></li>)}
        {job.mode === "council" && <li className={`st-${job.synthesis?.status || "queued"}`}><span className="rr-dot">{job.synthesis?.status === "done" ? <Check size={12} /> : <Clock size={12} />}</span><strong>Comparison</strong><span>{job.synthesis?.label || "Waiting for all models"}</span><span>{job.synthesis?.status === "done" ? `claims aligned · ${seconds(job.synthesis.durationMs)}` : job.synthesis?.status === "failed" ? job.synthesis.error : job.synthesis ? "Comparing reports…" : "Starts when the models finish"}</span></li>}
      </ul>
      {job.status === "failed" && <p className="rr-error">{job.error}</p>}

      {job.mode === "search" && job.runs[0]?.status === "done" && <div className="rr-single"><Findings run={job.runs[0]} titles={titles} /><SearchTrail run={job.runs[0]} /></div>}

      {job.mode === "council" && job.synthesis?.status === "done" && <div className="rr-council">
        {job.synthesis.summary && <p className="rr-summary">{job.synthesis.summary}</p>}
        <p className="rr-legend">{(job.synthesis.claims || []).filter(c => c.needsReview).length} of {(job.synthesis.claims || []).length} points need human review. Disagreement is the signal: it shows where a researcher should open the primary source.</p>
        <ClaimTable claims={job.synthesis.claims || []} models={doneModels} titles={titles} />
      </div>}
      {job.mode === "council" && job.runs.some(r => r.status === "done") && <div className="rr-reports"><p className="rr-trail-label">Each model's independent report</p>{job.runs.filter(r => r.status === "done").map(r => <details key={r.model} className="evidence-disclosure rr-report"><summary data-testid={`report-${r.model}`}>{r.label} · {r.provider} · {r.findings?.length || 0} findings</summary><div className="evidence-card"><Findings run={r} titles={titles} /><SearchTrail run={r} /></div></details>)}</div>}

      {job.status !== "running" && <p className="evidence-limit rr-limit">AI research can be wrong or incomplete. These findings are leads to verify, not conclusions about title or restitution, and allegations are labeled as allegations. {job.mode === "council" ? "This comparison is built for this demo on Perplexity's Agent API; it is not the Model Council feature in the Perplexity app." : ""}</p>}
    </div>}
  </section>;
}
