# Art Provenance

A fine-art museum placard-inspired artwork discovery prototype, built with Perplexity Computer. Enter an artist and title, review automatically retrieved images and records, confirm the work, and inspect its published provenance.

## What works

- Live public-catalog search across the Art Institute of Chicago, the Metropolitan Museum of Art, Cleveland Museum of Art, and Rijksmuseum. Per-source coverage distinguishes no matches from service failures.
- Automatic selection of display-permitted public-domain images and explicit object confirmation.
- Attributed museum metadata and original provenance text, without invented ownership links.
- Saved Monet example for demonstrations, visibly labeled as a snapshot.
- Responsive light/dark layouts, presentation mode, JSON export, and source links.
- Optional local image preview. Files are not uploaded; image recognition is not implemented.

## Boundaries

This is a four-collection prototype, not whole-web search or autonomous provenance verification. No paid AI API or Perplexity Computer runtime is connected. No Computer-versus-Cowork results are claimed. Artist-plus-title matching is heuristic and requires human confirmation. Search returns bounded candidates, not an exhaustive enumeration of all collection holdings.

The Courbet / The Rock of Hautepierre interview case integrates cited context into the provenance history. A later forced-sale allegation is explained beside the 1935 sale; the 2001 settlement appears as a subsequent timeline event. Evidence disclosures identify James Cuno's 2006 congressional testimony and distinguish prepared research from museum catalog text. Context is not generated live, and an allegation is not presented as a court finding.

The Met search uses its current `/public/collection/v1.1/search` endpoint. Some Met records expose neither a permitted image nor provenance text; the UI reports that rather than inventing either. The Rijksmuseum adapter resolves object, visual-item, and digital-object identifiers and checks image-specific rights. Cleveland provenance descriptions remain attributed to Cleveland.

## Local setup

Node 22 LTS or a compatible newer release.

```sh
npm ci
npm run dev
```

Open http://localhost:5000. The supplied saved example is already prepared. To refresh it, run `npx tsx script/prepare-example.ts`; this downloads a public-domain museum image and its source record.

```sh
npm run check
npm run build
npm start
```

Frontend and backend share one server. The `__PORT_5000__` placeholder in the API client supports the Computer preview proxy; in an ordinary production build it uses same-origin requests.

## Structure

- `shared/artwork.ts`: validated request schema and response types
- `client/src/App.tsx`: input, selection, dossier, and presentation
- `client/src/index.css`: museum-inspired visual system
- `server/routes.ts`: bounded keyless catalog search, cache, rate limiting, and export
- `server/museums.ts`: museum-specific adapters and field mappings
- `fixtures/monet.json`: public source snapshot and retrieval timestamp
- `client/public/images/water-lilies.jpg`: downloaded public-domain collection image

No database, authentication cookies, or persistent visitor storage is used. Form state and optional image previews remain in the browser. Backend logs omit query bodies; the source provider receives search terms. Shared server caching holds only public source responses for five minutes.

## Sources and licenses

Collection API and image-use guidance: https://api.artic.edu/docs/

Featured artwork: Claude Monet, Water Lilies, 1906. Art Institute of Chicago, Mr. and Mrs. Martin A. Ryerson Collection, 1933.1157.
https://www.artic.edu/artworks/16568/water-lilies

The API marks the featured work public domain. A verified public-domain mirror is used because the museum's IIIF image host may reject automated requests:
https://commons.wikimedia.org/wiki/File:Claude_Monet_-_Water_Lilies_-_1933.1157_-_Art_Institute_of_Chicago.jpg

A second cached image matches Art Institute accession 1926.224, Georges Seurat, A Sunday on La Grande Jatte — 1884:
https://commons.wikimedia.org/wiki/File:Georges_Seurat_-_A_Sunday_on_La_Grande_Jatte_--_1884_-_Google_Art_Project.jpg

Cached images are scoped to the Art Institute provider and exact museum object IDs, never substituted for unrelated search results. Other Chicago results attempt an identity-checked public-domain Wikimedia mirror before using the original museum URL. Some image hosts may fail; the UI then retains the record with an explicit unavailable-image state. Image and metadata reuse remains subject to museum terms: https://www.artic.edu/terms

Courbet interview image, Art Institute 1967.140, object 27027:
https://commons.wikimedia.org/wiki/File:Gustave_Courbet_-_Les_Roches_de_Hautepierre_(ca._1869).jpg

Prepared-case sources:
https://api.artic.edu/api/v1/artworks/27027
https://financialservices.house.gov/media/pdf/072706jc.pdf

Additional museum documentation:
https://metmuseum.github.io/
https://openaccess-api.clevelandart.org/
https://data.rijksmuseum.nl/docs/search
https://data.rijksmuseum.nl/tutorials/iiif/

Source Sans 3 and Source Serif 4 are served by Google Fonts. No ownership of museum content is claimed.

## GitHub / deployment

Source repository: https://github.com/danielli5/Art-Provenance (private). The webpage's display name remains Provenance. A self-contained reproduction brief is included at `docs/cowork-build-brief.md`; use the brief alone for an independent build comparison, or supply this source code for exact reproduction.

Do not commit private auction records, private photos, keys, `.env`, dependencies, or build outputs. No additional code license grant has been selected for publication; retain existing third-party notices and review the template's package metadata before any public release.

This frontend requires its Node backend for search and downloads; GitHub Pages alone does not run it. Review dependencies and add production monitoring before public hosting.
