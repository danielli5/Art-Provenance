import { Fragment, useEffect, useRef, useState } from "react";
import { QueryClientProvider, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "./lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./components/ui/form";
import { ArrowUpRight, ArrowRight, ArrowLeft, Sun, Moon, Plus, Minus, X, Upload, Check, Search, Expand, Download } from "lucide-react";
import { searchSchema, type Artwork, type SearchInput, type SearchResponse, type ProviderStatus } from "../../shared/artwork";
import { curatedImages } from "../../shared/curated-images";
import { ResearchRoom } from "./ResearchRoom";
import type { Narrative } from "../../shared/research";

const catalogUrl = "https://www.artic.edu/artworks/16568/water-lilies";
const apiBase = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";
const cachedImage=(art:Artwork)=>art.provider==="aic"?curatedImages[art.id]:undefined;

function Logo() {
  return <span className="wordmark"><svg width="27" height="30" viewBox="0 0 27 30" fill="none" role="img" aria-label="Provenance mark"><path d="M3 26V4h12c5 0 8 3 8 7s-3 7-8 7H9" stroke="currentColor" strokeWidth="1.4"/><path d="M8 26V9h6c2 0 4 1 4 3" stroke="currentColor" strokeWidth="1.4"/></svg>provenance<span className="wordmark-dot">.</span></span>;
}
function OutLink({href,children,id}:{href:string;children:React.ReactNode;id:string}) {
  return <a data-testid={id} href={href} target="_blank" rel="noopener noreferrer">{children}<ArrowUpRight size={14}/></a>;
}
function ArtImage({art,large=false}:{art:Artwork;large?:boolean}) {
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[art.provider,art.id,art.image]);
  return art.image&&!failed ? <img data-testid={`img-art-${art.provider}-${art.id}`} className={large?"main-art":"candidate-art"} src={cachedImage(art)?.path||art.image} onError={()=>setFailed(true)} alt={art.alt||`${art.title} by ${art.artist}`} decoding="async"/> : <div className="image-fallback" role="img" aria-label="Artwork image unavailable"><span>Image unavailable for display</span><small>It may be restricted or temporarily unreachable. The collection record is still available.</small></div>;
}
function EvidencePanel({art,passage,id,label="Museum's wording"}:{art:Artwork;passage?:string;id:string;label?:string}) {
  const excerpt=passage??art.provenance;
  return <details className="evidence-disclosure" data-testid={`panel-${id}`}>
    <summary data-testid={`show-${id}`}>{label} <Plus size={14} className="evidence-plus"/><Minus size={14} className="evidence-minus"/></summary>
    <section className="evidence-card" aria-label={`Museum evidence for ${art.title}`}>
      {excerpt?<blockquote data-testid={`quote-${id}`}>{excerpt}</blockquote>:<p className="evidence-empty">No provenance passage in this record.</p>}
      <div className="evidence-attribution"><span>{art.museum}</span><span>Retrieved {new Date(art.accessedAt).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</span></div>
      <OutLink href={art.source} id={`museum-${id}`}>View museum record</OutLink>
      <details className="technical-evidence"><summary data-testid={`technical-${id}`}>Technical details</summary><p>Source field: {art.provenanceField||"museum provenance record"}.</p><OutLink href={art.apiSource} id={`raw-${id}`}>View raw data (JSON)</OutLink></details>
    </section>
  </details>;
}
const testimony="https://financialservices.house.gov/media/pdf/072706jc.pdf";
function HistoricalContext({kind}:{kind:"claim"|"settlement"}) {
  const claim=kind==="claim";
  return <article className="timeline-entry outside-source" data-testid={claim?"history-context-claim":"settlement-timeline-entry"}>
    <span className="timeline-period">{claim?"Later claim":"May 14, 2001"}</span>
    <div>
      <p className="timeline-owner">{claim?"Gerta Silberberg, Max Silberberg's heir":"Settlement with the Silberberg heir"}</p>
      <p className="timeline-text">{claim
        ?"She alleged the 1935 sale was a forced sale under Nazi persecution. This is an allegation; no court ruled on it."
        :"The Art Institute and Gerta Silberberg reached an undisclosed settlement. The museum kept the painting and added a label recognizing Max Silberberg's ownership."}</p>
      <p className="timeline-basis">Not in the museum catalog · <a href={testimony} target="_blank" rel="noopener noreferrer" data-testid={`source-context-${kind}`}>James Cuno, congressional testimony, 2006</a></p>
    </div>
  </article>;
}
function ProvenanceApp() {
  const [theme,setTheme]=useState(()=>matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");
  const [stage,setStage]=useState<"entry"|"results"|"dossier">("entry");
  const [artworks,setArtworks]=useState<Artwork[]>([]);
  const [providers,setProviders]=useState<ProviderStatus[]>([]);
  const [selected,setSelected]=useState<Artwork|null>(null);
  const [fallback,setFallback]=useState(false);
  const [upload,setUpload]=useState<string|null>(null);
  const [uploadError,setUploadError]=useState("");
  const [notice,setNotice]=useState("");
  const [panel,setPanel]=useState<"method"|"enterprise"|null>(null);
  const [presentation,setPresentation]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null);
  const fileRef=useRef<HTMLInputElement>(null);
  const resultHeading=useRef<HTMLHeadingElement>(null);
  const previousTrigger=useRef<HTMLElement|null>(null);
  const form=useForm<SearchInput>({resolver:zodResolver(searchSchema),defaultValues:{artist:"",title:""}});
  useEffect(()=>{document.documentElement.dataset.theme=theme;},[theme]);
  useEffect(()=>()=>{if(upload)URL.revokeObjectURL(upload);},[upload]);
  useEffect(()=>{if(stage!=="entry")resultHeading.current?.focus();},[stage]);
  useEffect(()=>{if(panel){previousTrigger.current=document.activeElement as HTMLElement;dialog.current?.showModal();}else if(dialog.current?.open){dialog.current.close();previousTrigger.current?.focus();}},[panel]);

  const search=useMutation({
    mutationFn:async(values:SearchInput)=>(await (await apiRequest("POST","/api/search",values)).json()) as SearchResponse,
    onSuccess:data=>{setArtworks(data.artworks);setProviders(data.providers);setStage("results");setNotice("");},
    onError:()=>setNotice("The collections could not be reached. Try again, or open the saved Monet example.")
  });
  const saved=useMutation({
    mutationFn:async()=>(await(await apiRequest("GET","/api/example")).json()) as Artwork,
    onSuccess:art=>{setArtworks([art]);setProviders([]);setStage("results");setNotice("");},
    onError:()=>setNotice("The saved example could not be loaded. Please try again.")
  });
  const busy=search.isPending||saved.isPending;
  function reset() {setStage("entry");setSelected(null);setPresentation(false);setNotice("");}
  function confirm(art:Artwork){setSelected(art);setStage("dossier");}
  async function chooseFile(file?:File) {
    if(!file)return;
    setUploadError("");
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>10*1024*1024){setUploadError("Choose a JPEG, PNG, or WebP under 10 MB.");return;}
    const url=URL.createObjectURL(file);
    try {
      const image = new Image();image.src=url;await image.decode();
      if(image.naturalWidth*image.naturalHeight>25_000_000)throw new Error();
      setUpload(url);
    }catch{URL.revokeObjectURL(url);setUploadError("This image could not be opened, or exceeds 25 megapixels.");}
  }
  function runExample(artist:string,title:string){form.setValue("artist",artist);form.setValue("title",title);form.clearErrors();search.mutate({artist,title});}
  const sections=selected?.provenanceParts??selected?.provenance.split(/;\s*(?![^[]*\])/).filter(Boolean)??[];
  const sectionSuffix=(index:number)=>selected?.provenanceParts?"":index<sections.length-1?";":"";
  const hasHistoricalContext=selected?.provider==="aic"&&selected.id===27027;
  const [narrative,setNarrative]=useState<Narrative|null>(null);
  const [narrating,setNarrating]=useState(false);
  const partsKey=sections.map(x=>x.trim()).join("|");
  useEffect(()=>{
    setNarrative(null);
    if(!selected||!sections.length)return;
    let live=true;setNarrating(true);
    apiRequest("POST","/api/narrative",{provider:selected.provider,objectId:selected.id,parts:sections.map(x=>x.trim())})
      .then(r=>r.json()).then(n=>{if(live)setNarrative(n);}).catch(()=>{}).finally(()=>{if(live)setNarrating(false);});
    return()=>{live=false;};
  },[selected?.provider,selected?.id,partsKey]);
  return <div className={presentation?"app presentation":"app"}>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header">
      <button data-testid="button-home" className="logo-button" onClick={reset} aria-label="Provenance home"><Logo/></button>
      <button data-testid="button-theme" className="icon-button" aria-label={`Switch to ${theme==="light"?"dark":"light"} mode`} onClick={()=>setTheme(theme==="light"?"dark":"light")}>{theme==="light"?<Moon size={17}/>:<Sun size={17}/>}</button>
    </header>
    <main id="main">
      {stage==="entry"&&<>
        <section className="entry-grid">
          <div className="introduction">
                        <h1>Every work<br/>has a history.</h1>
            <p className="intro-copy">Search four museum collections, then test the record against the open web.</p>
            <Form {...form}><form onSubmit={form.handleSubmit(v=>{setNotice("");search.mutate(v);})} className="search-form" noValidate>
              <FormField control={form.control} name="artist" render={({field})=><FormItem className="field"><FormLabel>Artist</FormLabel><FormControl><input {...field} data-testid="input-artist" placeholder="e.g. Claude Monet" autoComplete="off" disabled={busy}/></FormControl><FormMessage/></FormItem>}/>
              <FormField control={form.control} name="title" render={({field})=><FormItem className="field"><FormLabel>Artwork title</FormLabel><FormControl><input {...field} data-testid="input-title" placeholder="e.g. Water Lilies" autoComplete="off" disabled={busy}/></FormControl><FormMessage/></FormItem>}/>
              <button data-testid="button-find" className="primary" type="submit" disabled={busy}>{busy?"Looking through the collection…":"Find the artwork"}{busy?<span className="spinner"/>:<ArrowRight size={18}/>}</button>
              <p className="collection-names">The Met · Rijksmuseum · Art Institute of Chicago · Cleveland</p>
            </form></Form>
            {notice&&<p role="alert" className="inline-error">{notice}</p>}
            <div className="try-links"><span>Try a work</span><button data-testid="example-monet" disabled={busy} onClick={()=>runExample("Claude Monet","Water Lilies")}>Monet</button><span>/</span><button data-testid="example-courbet" disabled={busy} onClick={()=>runExample("Gustave Courbet","The Rock of Hautepierre")}>Courbet</button><span>/</span><button data-testid="example-rembrandt" disabled={busy} onClick={()=>runExample("Rembrandt","The Night Watch")}>Rembrandt</button></div>
          </div>
          <figure className="featured">
                        <div className="featured-image"><img data-testid="img-featured" src="./images/water-lilies.jpg" alt="Claude Monet’s Water Lilies, 1906: pale pink blooms across blue-green pond reflections" width="843" height="810"/></div>
            <figcaption><div><strong>Claude Monet</strong><span>Water Lilies, 1906</span><small>Oil on canvas · 89.9 × 94.1 cm</small></div><OutLink href={catalogUrl} id="link-featured-source">Art Institute of Chicago</OutLink></figcaption>
          </figure>
        </section>
      </>}
      {stage==="results"&&<section className="results-section">
        <button data-testid="button-back-search" className="back-link" onClick={reset}><ArrowLeft size={15}/>Back to search</button>
        <div className="section-heading"><div><h1 ref={resultHeading} tabIndex={-1}>{artworks.length?"Is this your artwork?":"The record is still out there."}</h1></div></div>
        <p className="results-intro">{artworks.length?"Check the date and museum before continuing.":"No close match in the collections that responded."}</p>
        {!!providers.length&&<div className="collection-coverage" aria-label="Search coverage">{providers.map(p=><div key={p.provider} className={p.status==="unavailable"?"provider-unavailable":""}><span>{p.museum}</span><small>{p.status==="unavailable"?"Temporarily unavailable":`${p.matches} ${p.matches===1?"match":"matches"}`}</small></div>)}</div>}
        {!artworks.length&&<div className="no-results"><Search size={28}/><h2>Try a different title or spelling.</h2><button className="primary" data-testid="empty-back" onClick={reset}>Refine your search <ArrowRight size={16}/></button><button data-testid="empty-saved" className="text-button" onClick={()=>saved.mutate()} disabled={busy}>Open saved example</button></div>}
        <div className="candidates">{artworks.map((art,index)=><article className={`candidate ${index===0?"recommended":""}`} key={`${art.provider}-${art.id}`}><div className="candidate-picture"><ArtImage art={art}/></div><div className="candidate-caption">{index===0&&<span className="eyebrow">BEST MATCH</span>}<h2>{art.title}</h2><p>{art.artist} · {art.date}</p><small>{art.medium}</small><small>{art.dimensions.split(";")[0]}</small><OutLink href={art.source} id={`source-${art.provider}-${art.id}`}>{art.museum} · {art.reference}</OutLink><button data-testid={`select-${art.provider}-${art.id}`} className={index===0?"primary":"secondary"} onClick={()=>confirm(art)}>Use this artwork <ArrowRight size={16}/></button></div></article>)}</div>
      </section>}
      {stage==="dossier"&&selected&&<section className="dossier-section">
        <div className="dossier-toolbar"><button data-testid="button-back-results" className="back-link" onClick={()=>{setStage("results");setPresentation(false);}}><ArrowLeft size={15}/>Choose another work</button><div><button data-testid="button-present" className="text-button" onClick={()=>setPresentation(!presentation)}><Expand size={15}/>{presentation?"Exit presentation":"Present"}</button><a className="text-button" data-testid="button-export" href={`${apiBase}/api/export/${selected.provider}/${selected.id}?mode=${selected.mode}`} target="_blank" rel="noopener noreferrer"><Download size={15}/>Export record</a></div></div>
        <div className="object-grid"><figure className="object-image"><ArtImage art={selected} large/><figcaption>{(cachedImage(selected)?.source||selected.imageSource)&&<div><OutLink href={cachedImage(selected)?.source||selected.imageSource!} id="link-image-source">{cachedImage(selected)?"Cached image":"Image"} via Wikimedia Commons</OutLink></div>}</figcaption></figure><article className="placard"><p className="artist-name">{selected.artist}</p><h1 ref={resultHeading} tabIndex={-1}>{selected.title}</h1><p className="work-date">{selected.date}</p><div className="placard-details"><p>{selected.medium}</p><p>{selected.dimensions.split(";")[0]}</p></div><p className="credit-line">{selected.credit}</p><OutLink href={selected.source} id="link-object-source">View the museum record</OutLink></article></div>
        <div className="research-body continuous-record">
        <section className="provenance-panel" aria-labelledby="provenance-heading">
          <div className="research-heading"><h2 id="provenance-heading">Who owned it.</h2></div>
          {selected.provenance?<>
            <p className="muted provenance-lede">{narrative?"Plain-English version written by AI from the museum's record. Open any entry for the museum's exact wording.":narrating?"Rewriting the museum's record in plain English…":"The museum's record, as published."}</p>
            <div className={`timeline ${narrating?"is-loading":""}`}>
              {sections.map((s,i)=>{const steps=narrative?.entries.filter(e=>e.index===i)||[];const raw=`${s.trim()}${sectionSuffix(i)}`;return <Fragment key={i}>
                {steps.length?steps.map((n,k)=><Fragment key={k}><article className="timeline-entry" data-testid={`timeline-entry-${i}-${k}`}>
                  <span className="timeline-period">{/^unknown$/i.test(n.period)?"Undated":n.period}</span>
                  <div><p className="timeline-owner">{n.owner}</p><p className="timeline-text">{n.text}</p>{n.basis&&<p className="timeline-basis">Museum's source: {n.basis}</p>}
                    {k===steps.length-1&&<EvidencePanel art={selected} passage={raw} id={`evidence-${i}`}/>}</div>
                </article>{hasHistoricalContext&&/Graupe/i.test(n.owner)&&<HistoricalContext kind="claim"/>}</Fragment>):<article className="timeline-entry" data-testid={`timeline-entry-${i}`}>
                  <span className="timeline-period">{String(i+1).padStart(2,"0")}</span>
                  <div><p className="timeline-text">{raw}</p><EvidencePanel art={selected} passage={raw} id={`evidence-${i}`}/></div>
                </article>}
                {hasHistoricalContext&&!steps.length&&/sold Galerie Paul Graupe.*1935/i.test(s)&&<HistoricalContext kind="claim"/>}
              </Fragment>;})}
              {hasHistoricalContext&&<HistoricalContext kind="settlement"/>}
            </div>
          </>:<div className="no-provenance"><p>The museum didn't publish an ownership history for this work.</p><EvidencePanel art={selected} id="missing-evidence" label="Museum record"/></div>}
        </section>
        <ResearchRoom art={selected}/>
        </div>
      </section>}
    </main>
    <footer><Logo/></footer>
    {busy&&<div className="sr-only" role="status" aria-live="polite">Looking up artwork records. Please wait.</div>}
  </div>;
}
export default function App(){return <QueryClientProvider client={queryClient}><ProvenanceApp/></QueryClientProvider>}
