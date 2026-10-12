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

type Verdict = "disagree" | "agree" | "partial" | "single";
const shortStance: Record<Stance, string> = { supports: "Fact", reports_as_allegation: "Allegation", contradicts: "Contradicts", not_mentioned: "—" };
function classify(c: CouncilClaim, models: string[]) {
  const stances = models.map(m => c.positions.find(p => p.model === m)?.stance || "not_mentioned");
  const mentioned = stances.filter(s => s !== "not_mentioned");
  const distinct = new Set(mentioned);
  let verdict: Verdict = distinct.size > 1 ? "disagree" : mentioned.length <= 1 ? "single" : mentioned.length === models.length ? "agree" : "partial";
  // the odd one out: a mentioned stance shared by no other model
  const counts = mentioned.reduce((m, s) => m.set(s, (m.get(s) || 0) + 1), new Map<Stance, number>());
  const odd = verdict === "disagree" ? stances.map(s => s !== "not_mentioned" && counts.get(s) === 1 && mentioned.length > 2) : stances.map(() => false);
  return { stances, verdict, odd };
}
const verdictLabel: Record<Verdict, string> = { disagree: "Disagree", agree: "Agree", partial: "Some missed it", single: "One model only" };

function CouncilView({ claims, models, titles, summary }: { claims: CouncilClaim[]; models: string[]; titles: Map<string, string>; summary?: string }) {
  const rows = claims.map(c => ({ c, ...classify(c, models) }));
  const disagreements = rows.filter(r => r.verdict === "disagree");
  const others = rows.filter(r => r.verdict !== "disagree");
  const agreeCount = rows.filter(r => r.verdict === "agree").length;
  return <div className="rr-council">
    <div className={`rr-verdict ${disagreements.length ? "has-conflict" : ""}`} data-testid="council-verdict">
      <p className="rr-verdict-number">{disagreements.length}</p>
      <div>
        <p className="rr-verdict-title">{disagreements.length ? `${disagreements.length === 1 ? "point where" : "points where"} the models disagree` : "points of disagreement"}</p>
        <p className="rr-verdict-sub">{agreeCount} of {rows.length} points: all three agree · {others.length - agreeCount}: not every model found it</p>
      </div>
    </div>

    <div className="rr-matrix" role="table" aria-label="Each model's position on each claim" data-testid="council-matrix">
      <div className="rr-mrow rr-mhead" role="row"><span role="columnheader">Claim</span>{models.map(m => <span key={m} role="columnheader">{m}</span>)}</div>
      {[...disagreements, ...others].map((r, i) => <div key={i} role="row" className={`rr-mrow v-${r.verdict}`}>
        <span role="cell" className="rr-mclaim">{r.verdict === "disagree" && <AlertTriangle size={14} />}<strong>{r.c.headline || r.c.claim.split(" ").slice(0, 7).join(" ")}</strong><small>{r.c.date}</small></span>
        {r.stances.map((st, j) => <span role="cell" key={j} className={`rr-cell s-${st} ${r.odd[j] ? "odd" : ""}`} title={stanceLabel[st]}>{shortStance[st]}</span>)}
      </div>)}
    </div>
    <p className="rr-key"><span className="s-supports">Fact</span> states it as fact <span className="s-reports_as_allegation">Allegation</span> reports it as a claim <span className="s-not_mentioned">—</span> didn't mention it</p>

    {disagreements.map((r, i) => <article key={i} className="rr-conflict" data-testid={`council-claim-${i}`}>
      <p className="rr-conflict-label"><AlertTriangle size={15} />Disagreement · {r.c.date}</p>
      <h3>{r.c.headline || r.c.claim}</h3>
      <div className="rr-sides">{models.map((m, j) => <div key={m} className={`rr-side s-${r.stances[j]} ${r.odd[j] ? "odd" : ""}`}><span>{m}</span><strong>{stanceLabel[r.stances[j]]}</strong></div>)}</div>
      <p className="rr-conflict-note">{r.c.note}</p>
      <SourceLinks urls={r.c.sourceUrls} titles={titles} />
    </article>)}

    {summary && <p className="rr-summary">{summary}</p>}
    <details className="rr-others"><summary data-testid="council-others">All {others.length} other points</summary>
      {others.map((r, i) => <article key={i} className="rr-claim" data-testid={`council-other-${i}`}>
        <p className="rr-finding-meta"><span className="rr-date">{r.c.date}</span><span className={`rr-badge v-${r.verdict}`}>{verdictLabel[r.verdict]}</span></p>
        <p className="rr-claim-text">{r.c.claim}</p>
        {r.c.note && <p className="rr-note">{r.c.note}</p>}
        <SourceLinks urls={r.c.sourceUrls} titles={titles} />
      </article>)}
    </details>
  </div>;
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
    <div className="research-heading"><h2 id="research-room-heading">Check it against the open web.</h2></div>
    <p className="muted rr-intro">Live search with Perplexity's Agent API. Every link shown was found by the model's own search.</p>

    {!config?.configured ? <p className="rr-unavailable">Live research isn't connected on this server. {savedModes.council || savedModes.search ? "A saved run is available below." : ""}</p> : <>
      <fieldset className="rr-lineup">
        <legend className="sr-only">Model lineup</legend>
        {(["frontier", "efficient"] as const).map(t => <label key={t} className={tier === t ? "active" : ""}>
          <input type="radio" name="tier" value={t} checked={tier === t} onChange={() => setTier(t)} disabled={running} data-testid={`tier-${t}`} />
          <span className="rr-tier-name">{t === "frontier" ? "Frontier" : "Efficient"}</span>
          <small>{config.tiers[t].researchers.map(m => m.label).join(" · ")}</small>
        </label>)}
      </fieldset>
      <div className="rr-actions">
        <button className="primary" onClick={() => start("council")} disabled={running} data-testid="button-research-council"><Users size={16} />Compare three models</button>
        <button className="secondary" onClick={() => start("search")} disabled={running} data-testid="button-research-search"><Search size={16} />One model · {lineup?.single.label}</button>
      </div>
    </>}
    {(savedModes.council || savedModes.search) && <div className="rr-saved-links">{savedModes.council && <button className="text-button" onClick={() => openSaved("council")} disabled={running} data-testid="button-saved-council">Saved comparison</button>}{savedModes.search && <button className="text-button" onClick={() => openSaved("search")} disabled={running} data-testid="button-saved-search">Saved one-model run</button>}</div>}
    {error && <p className="rr-error" role="alert">{error}</p>}

    {job && <div className="rr-result" aria-live="polite">
      <div className="rr-result-head">
        <span className="eyebrow">{job.mode === "council" ? "MODEL COUNCIL-STYLE COMPARISON · AGENT API" : "ONE MODEL · LIVE WEB SEARCH"}</span>
        <span className="evidence-status">{job.saved ? `Saved run from ${new Date(job.startedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}` : running ? "Running now" : reused ? `Live run from ${new Date(job.startedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}, reused` : "Live run"}{job.status !== "running" && job.totalCost > 0 ? (reused ? ` · cost ${money(job.totalCost)} when it ran; no new cost` : ` · API cost ${money(job.totalCost)}`) : ""}</span>
      </div>
      {job.status !== "running" && job.runs.every(r => r.status === "done") ? <p className="rr-summary-line" data-testid="research-progress">{job.runs.map(r => r.label).join(" · ")} · {job.runs.reduce((n, r) => n + (r.queries?.length || 0), 0)} web searches · {Math.round(Math.max(...job.runs.map(r => r.durationMs || 0)) / 1000)}s</p> :
      <ul className="rr-progress" data-testid="research-progress">
        {job.runs.map(r => <li key={r.model} className={`st-${r.status}`}><span className="rr-dot">{r.status === "done" ? <Check size={12} /> : r.status === "failed" ? <AlertTriangle size={12} /> : <Clock size={12} />}</span><strong>{r.label}</strong><span>{r.provider}</span><span>{r.status === "done" ? `${r.queries?.length || 0} searches · ${seconds(r.durationMs)}${r.cost ? ` · ${money(r.cost)}` : ""}` : r.status === "failed" ? r.error : `Searching… ${Math.max(0, Math.round((now - Date.parse(job.startedAt)) / 1000))}s`}</span></li>)}
        {job.mode === "council" && <li className={`st-${job.synthesis?.status || "queued"}`}><span className="rr-dot">{job.synthesis?.status === "done" ? <Check size={12} /> : <Clock size={12} />}</span><strong>Comparison</strong><span>{job.synthesis?.label || "Waiting for all models"}</span><span>{job.synthesis?.status === "done" ? `claims aligned · ${seconds(job.synthesis.durationMs)}` : job.synthesis?.status === "failed" ? job.synthesis.error : job.synthesis ? "Comparing reports…" : "Starts when the models finish"}</span></li>}
      </ul>}
      {job.status === "failed" && <p className="rr-error">{job.error}</p>}

      {job.mode === "search" && job.runs[0]?.status === "done" && <div className="rr-single"><Findings run={job.runs[0]} titles={titles} /><SearchTrail run={job.runs[0]} /></div>}

      {job.mode === "council" && job.synthesis?.status === "done" && <CouncilView claims={job.synthesis.claims || []} models={doneModels} titles={titles} summary={job.synthesis.summary} />}
      {job.mode === "council" && job.runs.some(r => r.status === "done") && <div className="rr-reports"><p className="rr-trail-label">Each model's report</p>{job.runs.filter(r => r.status === "done").map(r => <details key={r.model} className="evidence-disclosure rr-report"><summary data-testid={`report-${r.model}`}>{r.label} · {r.provider} · {r.findings?.length || 0} findings</summary><div className="evidence-card"><Findings run={r} titles={titles} /><SearchTrail run={r} /></div></details>)}</div>}

      {job.status !== "running" && <p className="evidence-limit rr-limit">AI findings are leads to verify, not conclusions about title. {job.mode === "council" ? "Built for this demo on Perplexity's Agent API; not the Model Council feature in the Perplexity app." : ""}</p>}
    </div>}
  </section>;
}
