import type {Artwork,SearchInput} from "../shared/artwork";

export const museumNames={aic:"Art Institute of Chicago",met:"The Metropolitan Museum of Art",cleveland:"Cleveland Museum of Art",rijks:"Rijksmuseum"} as const;
const cache=new Map<string,{data:any;time:number}>();
export async function catalogJson(url:string):Promise<any>{
  const cached=cache.get(url);if(cached&&Date.now()-cached.time<300000)return cached.data;
  const res=await fetch(url,{signal:AbortSignal.timeout(10000),headers:{Accept:"application/json"}});
  if(!res.ok)throw new Error(`Catalog unavailable (${res.status})`);
  const json=await res.json();
  if(cache.size>250)cache.clear();cache.set(url,{data:json,time:Date.now()});return json;
}
const str=(v:unknown)=>typeof v==="string"?v:"";
export const normalized=(v:string)=>v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu," ").replace(/\s+/g," ").trim();
export function matchScore(art:Artwork,input:SearchInput){
  const artist=normalized(art.artist);const title=normalized(art.title);
  const a=normalized(input.artist).split(" ").filter(Boolean);
  const t=normalized(input.title).split(" ").filter(w=>w.length>2&&!["the","and","of","on"].includes(w));
  if(!a.every(w=>artist.includes(w))||!t.length||t.filter(w=>title.includes(w)).length/t.length<.6)return -1;
  return (title===normalized(input.title)?100:50)+(art.image?10:0);
}
export function filterMatches(arts:Artwork[],input:SearchInput){
  return arts.map(art=>({art,score:matchScore(art,input)})).filter(x=>x.score>=0).sort((a,b)=>b.score-a.score).slice(0,3).map(({art})=>({...art,match:normalized(art.title)===normalized(input.title)?"Artist and title match":"Artist match; related title. Please verify."}));
}
const metApi="https://collectionapi.metmuseum.org/public/collection";
export async function metObject(id:number):Promise<Artwork>{
  const d=await catalogJson(`${metApi}/v1/objects/${id}`);
  if(!d.objectID)throw new Error("Missing Met object");
  const artist=[str(d.artistPrefix),str(d.artistDisplayName),str(d.artistSuffix)].filter(Boolean).join(" ");
  return {provider:"met",museum:museumNames.met,id:d.objectID,title:str(d.title),artist,artistDisplay:str(d.artistDisplayBio),date:str(d.objectDate),medium:str(d.medium),dimensions:str(d.dimensions),credit:str(d.creditLine),reference:str(d.accessionNumber),image:d.isPublicDomain?(d.primaryImageSmall||d.primaryImage||null):null,alt:`${d.title}, ${artist}`,source:d.objectURL||`https://www.metmuseum.org/art/collection/search/${d.objectID}`,apiSource:`${metApi}/v1/objects/${id}`,provenance:"",provenanceField:"No provenance field supplied by this endpoint",publicDomain:d.isPublicDomain===true,mode:"live",accessedAt:new Date().toISOString()};
}
export async function searchMet(input:SearchInput){
  const p=new URLSearchParams({q:`${input.artist} ${input.title}`,limit:"8",offset:"0"});
  const d=await catalogJson(`${metApi}/v1.1/search?${p}`);
  const rows=await Promise.allSettled((d.objectIDs||[]).slice(0,8).map(metObject));
  if(rows.length&&rows.every(x=>x.status==="rejected"))throw new Error("Met records unavailable");
  return filterMatches(rows.flatMap(x=>x.status==="fulfilled"?[x.value]:[]),input);
}
const cmaApi="https://openaccess-api.clevelandart.org/api/artworks/";
const cmaFields="id,title,creators,creation_date,provenance,images,url,share_license_status,accession_number,creditline,technique,measurements";
function clevelandRecord(d:any):Artwork{
  const parts=(d.provenance||[]).map((p:any)=>str(p.description)).filter(Boolean);
  const artist=(d.creators||[]).filter((x:any)=>x.role==="artist"||x.use_in_caption).map((x:any)=>str(x.description).split(" (")[0]).join("; ");
  return {provider:"cleveland",museum:museumNames.cleveland,id:d.id,title:str(d.title),artist,artistDisplay:artist,date:str(d.creation_date),medium:str(d.technique),dimensions:str(d.measurements),credit:str(d.creditline),reference:str(d.accession_number),image:d.share_license_status==="CC0"?(d.images?.web?.url||null):null,alt:`${d.title}, ${artist}`,source:str(d.url),apiSource:`${cmaApi}${d.id}`,provenance:parts.join("\n\n"),provenanceParts:parts,provenanceField:"provenance[].description (dates and citations are available in the raw record)",publicDomain:d.share_license_status==="CC0",mode:"live",accessedAt:new Date().toISOString()};
}
export async function clevelandObject(id:number){const d=await catalogJson(`${cmaApi}${id}`);return clevelandRecord(d.data);}
export async function searchCleveland(input:SearchInput){
  const p=new URLSearchParams({q:`${input.artist} ${input.title}`,limit:"15",fields:cmaFields});
  const d=await catalogJson(`${cmaApi}?${p}`);
  return filterMatches((d.data||[]).map(clevelandRecord),input);
}
const english=(x:any)=>x.language?.some((l:any)=>l.id?.endsWith("300388277"));
const classified=(x:any,id:string)=>x.classified_as?.some((c:any)=>c.id?.endsWith(id));
const note=(rows:any[],id:string)=>str(rows?.find(x=>english(x)&&classified(x,id))?.content);
const label=(x:any)=>str(x?.notation?.find((n:any)=>n["@language"]==="en")?.["@value"]);
const validPid=(url:string)=>/^https:\/\/id\.rijksmuseum\.nl\/\d+$/.test(url);
async function rijksData(url:string){if(!validPid(url))throw new Error("Invalid museum identifier");return catalogJson(`${url}?_profile=la-framed`);}
export async function rijksObject(id:number):Promise<Artwork>{
  const source=`https://id.rijksmuseum.nl/${id}`;const d=await rijksData(source);
  const notes=d.referred_to_by||[];
  const names=(d.identified_by||[]).filter((x:any)=>x.type==="Name"&&english(x));
  const title=str(names.find((x:any)=>classified(x,"300417207"))?.content||names.find((x:any)=>classified(x,"300417200"))?.content||names[0]?.content);
  const artist=note(d.produced_by?.referred_to_by||[],"300435416")||(d.produced_by?.part||[]).flatMap((p:any)=>p.carried_out_by||[]).map(label).filter(Boolean).join("; ");
  const date=str(d.produced_by?.timespan?.identified_by?.find(english)?.content||d.produced_by?.timespan?.begin_of_the_begin?.slice(0,4));
  let image:string|null=null;let publicDomain=false;
  const visualId=d.shows?.[0]?.id;
  if(visualId){
    try {
      const visual=await rijksData(visualId);
      publicDomain=(visual.subject_to||[]).some((r:any)=>r.classified_as?.some((c:any)=>/^https?:\/\/creativecommons\.org\/publicdomain\/(mark|zero)\//.test(c.id)));
      const digitalId=visual.digitally_shown_by?.[0]?.id;
      if(publicDomain&&digitalId){const digital=await rijksData(digitalId);const url=digital.access_point?.[0]?.id;if(/^https:\/\/iiif\.micr\.io\/[^/]+\/full\//.test(url||""))image=url.replace(/\/full\/[^/]+\//,"/full/1000,/");}
    }catch{/* Metadata remains useful when the image service is unavailable. */}
  }
  return {provider:"rijks",museum:museumNames.rijks,id,title,artist,artistDisplay:artist,date,medium:note(notes,"300435429"),dimensions:note(notes,"300435430"),credit:note(notes,"300026687"),reference:str(d.identified_by?.find((x:any)=>x.type==="Identifier"&&classified(x,"300312355"))?.content),image,alt:`${title}, ${artist}`,source,apiSource:`https://data.rijksmuseum.nl/${id}?_profile=la-framed`,provenance:note(notes,"300444174"),provenanceField:"referred_to_by, provenance statement (Getty AAT 300444174), English",publicDomain,mode:"live",accessedAt:new Date().toISOString()};
}
export async function searchRijks(input:SearchInput){
  const p=new URLSearchParams({creator:input.artist,title:input.title});
  const d=await catalogJson(`https://data.rijksmuseum.nl/search/collection?${p}`);
  const ids=(d.orderedItems||[]).slice(0,2).map((x:any)=>Number(x.id?.split("/").pop())).filter(Number.isSafeInteger);
  const rows=await Promise.allSettled(ids.map(rijksObject));
  if(rows.length&&rows.every(x=>x.status==="rejected"))throw new Error("Rijksmuseum records unavailable");
  return filterMatches(rows.flatMap(x=>x.status==="fulfilled"?[x.value]:[]),input);
}
