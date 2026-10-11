import { z } from "zod";

export const searchSchema = z.object({
  artist: z.string().trim().min(2, "Enter the artist's name.").max(150),
  title: z.string().trim().min(2, "Enter the artwork title.").max(200),
});
export type SearchInput = z.infer<typeof searchSchema>;
export type Artwork = {
  provider: "aic"|"met"|"cleveland"|"rijks";
  museum: string;
  id: number; title: string; artist: string; artistDisplay: string;
  date: string; medium: string; dimensions: string; credit: string;
  reference: string; image: string | null; alt: string;
  source: string; apiSource: string; provenance: string;
  publicDomain: boolean; mode: "live" | "saved"; accessedAt: string;
  imageSource?: string;
  provenanceField?: string;
  provenanceParts?: string[];
  match?: string;
};
export type ProviderStatus={provider:Artwork["provider"];museum:string;status:"ok"|"unavailable";matches:number};
export type SearchResponse = { artworks: Artwork[]; checkedAt: string; coverage: string;providers:ProviderStatus[] };
