import type { Express } from "express";
import type { Server } from "node:http";
import { readFile } from "node:fs/promises";
import { searchSchema, type Artwork } from "../shared/artwork";
import { curatedImages } from "../shared/curated-images";

const API="https://api.artic.edu/api/v1";
const fields="id,title,artist_title,artist_display,date_display,medium_display,dimensions,credit_line,main_reference_number,image_id,is_public_domain,provenance_text,thumbnail";
const clean=(v:unknown)=>typeof v==="string"?v:"";
const norm=(v:string)=>v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu," ").replace(/\s+/g," ").trim();
function normalize(d:any,iiif:string,mode:"live"|"saved",at:string):Artwork {
  const imageAllowed=d.is_public_domain===true&&/^[\da-f-]+$/i.test(d.image_id||"");
  const safeBase=iiif.startsWith("https://www.artic.edu/iiif/")?iiif:"https://www.artic.edu/iiif/2";
  return {id:d.id,title:clean(d.title),artist:clean(d.artist_title)||clean(d.artist_display),artistDisplay:clean(d.artist_display),date:clean(d.date_display),medium:clean(d.medium_display),dimensions:clean(d.dimensions),credit:clean(d.credit_line),reference:clean(d.main_reference_number),image:imageAllowed?`${safeBase}/${d.image_id}/full/843,/0/default.jpg`:null,alt:clean(d.thumbnail?.alt_text),source:`https://www.artic.edu/artworks/${d.id}`,apiSource:`${API}/artworks/${d.id}`,provenance:clean(d.provenance_text),publicDomain:d.is_public_domain===true,mode,accessedAt:at};
}
async function getJson(url:string) {
  const response=await fetch(url,{signal:AbortSignal.timeout(14000),headers:{"Accept":"application/json","User-Agent":"ProvenanceResearchPreview/0.1"}});
  if(!response.ok)throw new Error("Collection request failed");
  return response.json();
}
const cache=new Map<string,{data:any;time:number}>();
async function lookup(url:string){const hit=cache.get(url);if(hit&&Date.now()-hit.time<300000)return hit.data;const data=await getJson(url);if(cache.size>150)cache.clear();cache.set(url,{data,time:Date.now()});return data;}
const counters=new Map<string,{n:number;t:number}>();
async function resolveImage(art:Artwork):Promise<Artwork>{
  if(!art.publicDomain)return art;
  if(curatedImages[art.id])return {...art,imageSource:curatedImages[art.id].source};
  try {
    const filename=`File:${art.artist} - ${art.title} - ${art.reference} - Art Institute of Chicago.jpg`;
    const params=new URLSearchParams({action:"query",format:"json",titles:filename,prop:"imageinfo",iiprop:"url|extmetadata",iiurlwidth:"1000"});
    let result=await lookup(`https://commons.wikimedia.org/w/api.php?${params}`);
    let pages:any[]=Object.values(result.query?.pages||{});
    for(const page of pages){
      const i=page.imageinfo?.[0];const m=i?.extmetadata;
      const credit=m?.Credit?.value||"";
      const identity=new RegExp(`artic\\.edu/artworks/${art.id}(?:[/"<\\s]|$)`).test(credit);
      const url=i?.thumburl||i?.url||"";
      if(identity&&m?.LicenseShortName?.value==="Public domain"&&/^https:\/\/(thumb|upload)\.wikimedia\.org\//.test(url)){
        return {...art,image:url,imageSource:i.descriptionurl};
      }
    }
  }catch{/* Keep the original museum URL, with client-side unavailable state. */}
  return art;
}
export async function registerRoutes(httpServer:Server,app:Express):Promise<Server>{
  app.use("/api",(req,res,next)=>{
    res.setHeader("X-Content-Type-Options","nosniff");
    const key=req.get("X-Visitor-Id")||req.ip||"local";const now=Date.now();
    let bucket=counters.get(key);if(!bucket||now-bucket.t>60000)bucket={n:0,t:now};
    bucket.n++;if(counters.size>1000)counters.clear();counters.set(key,bucket);
    if(bucket.n>35){res.status(429).json({message:"Please wait a minute before searching again."});return;}next();
  });
  app.post("/api/search",async(req,res)=>{
    const parsed=searchSchema.safeParse(req.body);
    if(!parsed.success){res.status(400).json({message:"Enter both artist and artwork title."});return;}
    try{
      const {artist,title}=parsed.data;
      const params=new URLSearchParams({q:`${artist} ${title}`,limit:"30",fields});
      const response=await lookup(`${API}/artworks/search?${params}`);
      const artistTerms=norm(artist).split(" ").filter(Boolean);
      const titleTerms=norm(title).split(" ").filter(w=>w.length>2&&!["the","and","of","on"].includes(w));
      const at=new Date().toISOString();
      const scored=(response.data||[]).filter((d:any)=>{
        const a=norm(clean(d.artist_title)||clean(d.artist_display));const t=norm(clean(d.title));
        return artistTerms.every(word=>a.includes(word))&&titleTerms.length>0&&titleTerms.filter(w=>t.includes(w)).length/titleTerms.length>=.6;
      }).map((d:any)=>{
        const art=normalize(d,response.config?.iiif_url||"", "live",at);
        const exact=norm(art.title)===norm(title);
        return {art:{...art,match:exact?"Artist and title match":"Artist match; related title. Please verify."},score:(exact?100:50)+(art.image?10:0)};
      }).sort((a:any,b:any)=>b.score-a.score).slice(0,3);
      const artworks=await Promise.all(scored.map((x:any)=>resolveImage(x.art)));
      res.json({artworks,coverage:"Art Institute of Chicago; identity-checked Wikimedia image mirrors where available",checkedAt:at});
    }catch{res.status(422).json({message:"The museum service is unavailable. Try again or use the saved example."});}
  });
  app.get("/api/example",async(_req,res)=>{
    const record=JSON.parse(await readFile("fixtures/monet.json","utf8"));
    res.json({...normalize(record.data,record.config.iiif_url,"saved",record.retrievedAt),image:record.mirror.url,imageSource:record.mirror.source});
  });
  app.get("/api/export/:id",async(req,res)=>{
    const id=String(req.params.id);if(!/^\d{1,9}$/.test(id)){res.status(400).json({message:"Invalid object identifier"});return;}
    try{
      let record,art;
      if(req.query.mode==="saved"&&id==="16568"){record=JSON.parse(await readFile("fixtures/monet.json","utf8"));art=normalize(record.data,record.config.iiif_url,"saved",record.retrievedAt);}
      else{record=await lookup(`${API}/artworks/${id}?fields=${fields}`);art=normalize(record.data,record.config.iiif_url,"live",new Date().toISOString());}
      res.setHeader("Content-Disposition",`attachment; filename="provenance-${id}.json"`);
      res.type("application/json").send(JSON.stringify({schemaVersion:1,coverage:"Single-source museum record, not independent provenance research",artwork:art},null,2));
    }catch{res.status(422).json({message:"Could not export this record. Please try again."});}
  });
  return httpServer;
}
