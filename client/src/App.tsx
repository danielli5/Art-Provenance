import { useEffect, useRef, useState } from "react";
import { QueryClientProvider, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "./lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./components/ui/form";
import { ArrowUpRight, ArrowRight, ArrowLeft, Sun, Moon, Plus, Minus, X, Upload, Check, Search, Expand, Download } from "lucide-react";
import { searchSchema, type Artwork, type SearchInput, type SearchResponse } from "../../shared/artwork";
import { curatedImages } from "../../shared/curated-images";

const catalogUrl = "https://www.artic.edu/artworks/16568/water-lilies";
const museum = "Art Institute of Chicago";
const apiBase = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

function Logo() {
  return <span className="wordmark"><svg width="27" height="30" viewBox="0 0 27 30" fill="none" role="img" aria-label="Provenance mark"><path d="M3 26V4h12c5 0 8 3 8 7s-3 7-8 7H9" stroke="currentColor" strokeWidth="1.4"/><path d="M8 26V9h6c2 0 4 1 4 3" stroke="currentColor" strokeWidth="1.4"/></svg>provenance<span className="wordmark-dot">.</span></span>;
}
function OutLink({href,children,id}:{href:string;children:React.ReactNode;id:string}) {
  return <a data-testid={id} href={href} target="_blank" rel="noopener noreferrer">{children}<ArrowUpRight size={14}/></a>;
}
function ArtImage({art,large=false}:{art:Artwork;large?:boolean}) {
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[art.id,art.image]);
  return art.image&&!failed ? <img data-testid={`img-art-${art.id}`} className={large?"main-art":"candidate-art"} src={curatedImages[art.id]?.path||art.image} onError={()=>setFailed(true)} alt={art.alt||`${art.title} by ${art.artist}`} decoding="async"/> : <div className="image-fallback" role="img" aria-label="Artwork image unavailable"><span>Image unavailable for display</span><small>It may be restricted or temporarily unreachable. The collection record is still available.</small></div>;
}
function EvidencePanel({art,passage,id}:{art:Artwork;passage?:string;id:string}) {
  const excerpt=passage??art.provenance;
  return <details className="evidence-disclosure" data-testid={`panel-${id}`}>
    <summary data-testid={`show-${id}`}>Show evidence <Plus size={14} className="evidence-plus"/><Minus size={14} className="evidence-minus"/></summary>
    <section className="evidence-card" aria-label={`Museum evidence for ${art.title}`}>
      <div className="evidence-card-heading"><span className="eyebrow">THE MUSEUM'S ACCOUNT</span><span className="evidence-status">Single-source statement</span></div>
      <h3>{art.title}</h3>
      <p className="evidence-object">{art.artist} · {art.date} · Object {art.reference}</p>
      {excerpt?<><p className="evidence-label">Exact passage from the published provenance</p><blockquote data-testid={`quote-${id}`}>{excerpt}</blockquote></>:<p className="evidence-empty">No provenance passage was supplied in this record. The museum's object metadata is available on its public collection page.</p>}
      <div className="evidence-attribution"><span>{museum}</span><span>{art.mode==="saved"?"Saved record retrieved":"Record retrieved"} {new Date(art.accessedAt).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</span></div>
      <p className="evidence-limit">This is the museum's published statement, not an original ownership document or an independently verified transfer. Any archives cited in the passage have not been inspected here.</p>
      <OutLink href={art.source} id={`museum-${id}`}>View museum record</OutLink>
      <details className="technical-evidence"><summary data-testid={`technical-${id}`}>Technical details</summary><p>The machine-readable collection record contains this text in its provenance_text field. This link opens JSON intended for software, not a reader-friendly page.</p><OutLink href={art.apiSource} id={`raw-${id}`}>View raw data (JSON)</OutLink></details>
    </section>
  </details>;
}
function ProvenanceApp() {
  const [theme,setTheme]=useState(()=>matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");
  const [stage,setStage]=useState<"entry"|"results"|"dossier">("entry");
  const [artworks,setArtworks]=useState<Artwork[]>([]);
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
    onSuccess:data=>{setArtworks(data.artworks);setStage("results");setNotice("");},
    onError:()=>setNotice("The collection could not be reached. Try again, or open the saved Monet example.")
  });
  const saved=useMutation({
    mutationFn:async()=>(await(await apiRequest("GET","/api/example")).json()) as Artwork,
    onSuccess:art=>{setArtworks([art]);setStage("results");setNotice("");},
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
  const sections=selected?.provenance.split(/;\s*(?![^[]*\])/).filter(Boolean)||[];
  return <div className={presentation?"app presentation":"app"}>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header">
      <button data-testid="button-home" className="logo-button" onClick={reset} aria-label="Provenance home"><Logo/></button>
      <nav aria-label="Main navigation">
        <button data-testid="button-research" className={stage==="entry"?"nav-active":""} onClick={reset}>The research room</button>
        <button data-testid="button-method" onClick={()=>setPanel("method")}>Our approach</button>
        <button data-testid="button-enterprise" onClick={()=>setPanel("enterprise")}>Beyond the canvas <ArrowUpRight size={13}/></button>
      </nav>
      <button data-testid="button-theme" className="icon-button" aria-label={`Switch to ${theme==="light"?"dark":"light"} mode`} onClick={()=>setTheme(theme==="light"?"dark":"light")}>{theme==="light"?<Moon size={17}/>:<Sun size={17}/>}</button>
    </header>
    <main id="main">
      {stage==="entry"&&<>
        <section className="entry-grid">
          <div className="introduction">
            <div className="eyebrow"><span className="tiny-rule"/> A WORK. A RECORD. A HISTORY.</div>
            <h1>Every work<br/>has a history.</h1>
            <p className="intro-copy">Begin with the artist and the artwork.<br/>Discover the image, then look beyond it.</p>
            <Form {...form}><form onSubmit={form.handleSubmit(v=>{setNotice("");search.mutate(v);})} className="search-form" noValidate>
              <FormField control={form.control} name="artist" render={({field})=><FormItem className="field"><FormLabel>Artist</FormLabel><FormControl><input {...field} data-testid="input-artist" placeholder="e.g. Claude Monet" autoComplete="off" disabled={busy}/></FormControl><FormMessage/></FormItem>}/>
              <FormField control={form.control} name="title" render={({field})=><FormItem className="field"><FormLabel>Artwork title</FormLabel><FormControl><input {...field} data-testid="input-title" placeholder="e.g. Water Lilies" autoComplete="off" disabled={busy}/></FormControl><FormMessage/></FormItem>}/>
              <button data-testid="button-find" className="primary" type="submit" disabled={busy}>{busy?"Looking through the collection…":"Find the artwork"}{busy?<span className="spinner"/>:<ArrowRight size={18}/>}</button>
              <p className="search-scope"><span className="status-dot"/>Live image discovery · Art Institute of Chicago</p>
            </form></Form>
            {notice&&<p role="alert" className="inline-error">{notice}</p>}
            <div className="try-links"><span>Try a work</span><button data-testid="example-monet" disabled={busy} onClick={()=>runExample("Claude Monet","Water Lilies")}>Monet · Water Lilies</button><span>/</span><button data-testid="example-seurat" disabled={busy} onClick={()=>runExample("Georges Seurat","A Sunday on La Grande Jatte")}>Seurat</button></div>
            <div className="fallback-area"><button data-testid="button-fallback" className="text-button" aria-expanded={fallback} onClick={()=>setFallback(!fallback)}>Can't find your artwork?{fallback?<Minus size={14}/>:<Plus size={14}/>}</button>
              {fallback&&<div className="upload-panel"><p>Add a reference photo for your own comparison. It stays in this browser; image identification is not enabled in this test.</p><input ref={fileRef} data-testid="input-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>chooseFile(e.target.files?.[0])} aria-label="Upload artwork reference"/><button data-testid="button-upload" className="secondary" onClick={()=>fileRef.current?.click()}><Upload size={15}/>Choose an image</button><small>JPEG, PNG or WebP · Up to 10 MB</small>{uploadError&&<p role="alert" className="inline-error">{uploadError}</p>}{upload&&<div className="upload-preview"><img src={upload} alt="Your local artwork reference"/><button data-testid="button-remove-image" onClick={()=>{setUpload(null);if(fileRef.current)fileRef.current.value="";}}>Remove image <X size={12}/></button></div>}</div>}
            </div>
          </div>
          <figure className="featured">
            <div className="featured-label"><span>FROM THE COLLECTION</span><span>01 / STUDY IN WATER</span></div>
            <div className="featured-image"><img data-testid="img-featured" src="./images/water-lilies.jpg" alt="Claude Monet’s Water Lilies, 1906: pale pink blooms across blue-green pond reflections" width="843" height="810"/></div>
            <figcaption><div><strong>Claude Monet</strong><span>Water Lilies, 1906</span><small>Oil on canvas · 89.9 × 94.1 cm</small></div><OutLink href={catalogUrl} id="link-featured-source">Art Institute of Chicago</OutLink></figcaption>
            <div className="image-credit">Mr. and Mrs. Martin A. Ryerson Collection · Public domain <a data-testid="link-featured-image" href="https://commons.wikimedia.org/wiki/File:Claude_Monet_-_Water_Lilies_-_1933.1157_-_Art_Institute_of_Chicago.jpg" target="_blank" rel="noopener noreferrer">via Wikimedia Commons</a></div>
            <button data-testid="button-saved" className="saved-link" onClick={()=>saved.mutate()} disabled={busy}>Explore this saved example <ArrowUpRight size={14}/></button>
          </figure>
        </section>
        <section className="entry-footnote"><span className="eyebrow">LOOK CLOSELY. ASK BETTER QUESTIONS.</span><p>A source is a starting point, not a verdict.<br/>Follow the record. Keep the gaps visible.</p><button data-testid="button-how" onClick={()=>setPanel("method")}>How we read the evidence <ArrowRight size={16}/></button></section>
      </>}
      {stage==="results"&&<section className="results-section">
        <button data-testid="button-back-search" className="back-link" onClick={reset}><ArrowLeft size={15}/>Back to search</button>
        <div className="section-heading"><div><span className="eyebrow">IDENTIFY BEFORE YOU INVESTIGATE</span><h1 ref={resultHeading} tabIndex={-1}>{artworks.length?"Is this your artwork?":"The record is still out there."}</h1></div><span className="mode-label">{artworks[0]?.mode==="saved"?"SAVED EXAMPLE":"LIVE COLLECTION SEARCH"}</span></div>
        <p className="results-intro">{artworks.length?"A title can belong to more than one work. Check the date, medium and collection before continuing.":"No close artist-and-title match was found in the Art Institute of Chicago catalog. This is not a whole-web search, and does not mean the artwork does not exist."}</p>
        {!artworks.length&&<div className="no-results"><Search size={28}/><h2>Try a different title or spelling.</h2><p>You can also return to the research room and add a reference image, or explore the saved Monet record.</p><button className="primary" data-testid="empty-back" onClick={reset}>Refine your search <ArrowRight size={16}/></button><button data-testid="empty-saved" className="text-button" onClick={()=>saved.mutate()} disabled={busy}>Open saved example</button></div>}
        <div className="candidates">{artworks.map((art,index)=><article className={`candidate ${index===0?"recommended":""}`} key={art.id}><div className="candidate-picture"><ArtImage art={art}/></div><div className="candidate-caption"><span className="eyebrow">{index===0?"RECOMMENDED RECORD":`ALTERNATIVE ${String(index).padStart(2,"0")}`}</span><h2>{art.title}</h2><p>{art.artist} · {art.date}</p><small>{art.medium}</small><small>{art.dimensions.split(";")[0]}</small><div className="candidate-match"><Check size={13}/>{art.match||"Saved, identified collection record"}</div><OutLink href={art.source} id={`source-${art.id}`}>{museum} · {art.reference}</OutLink><p className="rights">{art.publicDomain?"Public-domain image available":"Image reuse not cleared; record only"}</p><button data-testid={`select-${art.id}`} className={index===0?"primary":"secondary"} onClick={()=>confirm(art)}>Use this artwork <ArrowRight size={16}/></button></div></article>)}</div>
      </section>}
      {stage==="dossier"&&selected&&<section className="dossier-section">
        <div className="dossier-toolbar"><button data-testid="button-back-results" className="back-link" onClick={()=>{setStage("results");setPresentation(false);}}><ArrowLeft size={15}/>Choose another work</button><div><span className="mode-label">{selected.mode==="saved"?"SAVED COLLECTION RECORD":"LIVE COLLECTION RECORD"}</span><button data-testid="button-present" className="text-button" onClick={()=>setPresentation(!presentation)}><Expand size={15}/>{presentation?"Exit presentation":"Present"}</button><a className="text-button" data-testid="button-export" href={`${apiBase}/api/export/${selected.id}?mode=${selected.mode}`} target="_blank" rel="noopener noreferrer"><Download size={15}/>Export record</a></div></div>
        <div className="object-grid"><figure className="object-image"><ArtImage art={selected} large/><figcaption>{museum} · {selected.publicDomain?"Public domain":"Image not reproduced"}<br/>{selected.credit}{(curatedImages[selected.id]?.source||selected.imageSource)&&<div><OutLink href={curatedImages[selected.id]?.source||selected.imageSource!} id="link-image-source">{curatedImages[selected.id]?"Cached image":"Image"} via Wikimedia Commons</OutLink></div>}</figcaption></figure><article className="placard"><span className="eyebrow">OBJECT RECORD / {selected.reference}</span><p className="artist-name">{selected.artist}</p><h1 ref={resultHeading} tabIndex={-1}>{selected.title}</h1><p className="work-date">{selected.date}</p><div className="placard-details"><p>{selected.medium}</p><p>{selected.dimensions.split(";")[0]}</p></div><p className="credit-line">{selected.credit}</p><div className="placard-source"><span className="status-dot"/>Collection record identified</div><OutLink href={selected.source} id="link-object-source">View the museum record</OutLink><p className="placard-caveat">An identified record is not authentication of an object in your possession.</p></article></div>
        <div className="research-body continuous-record">
        <section className="record-grid" aria-labelledby="record-heading"><div><span className="eyebrow">WHAT WE KNOW, AND HOW</span><h2 id="record-heading">The source behind the image.</h2><p>This dossier displays the museum's object metadata and its published provenance text, where available. It does not claim independent corroboration or a complete ownership chain.</p><EvidencePanel art={selected} id="record-evidence"/></div><dl className="evidence-summary"><div><dt>Source</dt><dd>{museum}</dd></div><div><dt>Evidence status</dt><dd>Single-source museum record</dd></div><div><dt>Record retrieved</dt><dd>{new Date(selected.accessedAt).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}{selected.mode==="saved"?" · saved snapshot":""}</dd></div><div><dt>Independent research</dt><dd>Not performed in this preview</dd></div></dl></section>
        <section className="provenance-panel" aria-labelledby="provenance-heading"><div className="research-heading"><h2 id="provenance-heading">The documented history.</h2><span className="mode-label">MUSEUM'S ACCOUNT · NOT INDEPENDENTLY VERIFIED</span></div><p className="muted">The entries below preserve the museum's order and wording, including qualifications. Deposits are treated separately from ownership transfers.</p>{selected.provenance?<><div className="timeline">{sections.map((s,i)=><article key={i} className="timeline-entry"><span className="timeline-number">{String(i+1).padStart(2,"0")}</span><div><p>{s.trim()}{i<sections.length-1?";":""}</p><EvidencePanel art={selected} passage={`${s.trim()}${i<sections.length-1?";":""}`} id={`evidence-${i}`}/></div></article>)}</div><p className="provenance-note">Record gaps and source qualifications remain unresolved. This is not a title or authenticity assessment.</p></>:<div className="no-provenance"><h3>No provenance text supplied.</h3><p>The catalog did not return an ownership history for this work. Ask the institution for its curatorial documentation; do not infer a chain from the credit line.</p><EvidencePanel art={selected} id="missing-evidence"/></div>}</section>
        </div>
      </section>}
    </main>
    <footer><Logo/><span>Art first. Evidence always.</span><span>Collection discovery prototype · Built with Perplexity Computer</span></footer>
    <dialog ref={dialog} onCancel={()=>setPanel(null)} onClick={e=>{if(e.target===dialog.current)setPanel(null);}}>
      <div className="dialog-top"><span className="eyebrow">{panel==="method"?"THE RESEARCH PRINCIPLE":"FROM PROVENANCE TO PRODUCTION"}</span><button className="icon-button" data-testid="close-dialog" onClick={()=>setPanel(null)} aria-label="Close"><X size={20}/></button></div>
      {panel==="method"?<><h2>A record, not a verdict.</h2><p>We start with artist and title, retrieve museum records, and recommend a display-permitted image with matching metadata. You confirm the work before exploring its history.</p><p>This preview searches one collection: the Art Institute of Chicago. It is not a whole-web research agent. The museum's statements remain attributed to the museum; repeated claims are not independent proof.</p><p>For broader provenance research, the next version needs additional source adapters and a cited research backend. No paid AI services are called by this preview.</p><OutLink href="https://api.artic.edu/docs/" id="link-method-docs">Collection API and image rights</OutLink></>:<><h2>Different objects.<br/>The same need for evidence.</h2><p>Buying art at auction starts with a question: what supports the story? Supplier qualification in robotics and manufacturing can begin with the same discipline.</p><div className="translation"><div><span>Ownership claim</span><ArrowRight size={15}/><span>Supplier relationship</span></div><div><span>Archive record</span><ArrowRight size={15}/><span>Supplier documentation</span></div><div><span>Gap in provenance</span><ArrowRight size={15}/><span>Missing traceability</span></div></div><p>Proposed buyer: Director of Strategic Sourcing, with a VP of Supply Chain sponsor. The pilot measures evidence quality and preparation effort; people retain technical review and approval.</p><small>No Computer-versus-Cowork performance claim has been measured in this preview.</small></>}
    </dialog>
    {busy&&<div className="sr-only" role="status" aria-live="polite">Looking up artwork records. Please wait.</div>}
  </div>;
}
export default function App(){return <QueryClientProvider client={queryClient}><ProvenanceApp/></QueryClientProvider>}
