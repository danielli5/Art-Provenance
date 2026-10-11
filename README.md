# Provenance

A fine-art museum placard-inspired artwork discovery prototype, built with Perplexity Computer. Enter an artist and title, review automatically retrieved images and records, confirm the work, and inspect its published provenance.

## What works

- Live catalog search through the Art Institute of Chicago public API.
- Automatic selection of display-permitted public-domain images and explicit object confirmation.
- Attributed museum metadata and original provenance text, without invented ownership links.
- Saved Monet example for demonstrations, visibly labeled as a snapshot.
- Responsive light/dark layouts, presentation mode, JSON export, and source links.
- Optional local image preview. Files are not uploaded; image recognition is not implemented.

## Boundaries

This is a single-collection prototype, not whole-web search or autonomous provenance verification. No paid AI API or Perplexity Computer runtime is connected. No Computer-versus-Cowork results are claimed. Artist-plus-title matching is heuristic and requires human confirmation.

## Local setup

Node 20 or later.

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

Both cached images are keyed by exact museum object IDs, never substituted for unrelated search results. Other results attempt an identity-checked public-domain Wikimedia mirror before using the original museum URL. Some image hosts may fail; the UI then retains the record with an explicit unavailable-image state. Image and metadata reuse remains subject to museum terms: https://www.artic.edu/terms

Source Sans 3 and Source Serif 4 are served by Google Fonts. No ownership of museum content is claimed.

## GitHub / deployment

The project is initialized as a local Git repository. No GitHub repository has been created or pushed. Confirm repository owner, name, visibility, and code license before publishing. Do not commit private auction records, private photos, keys, `.env`, dependencies, or build outputs.

This frontend requires its Node backend for search and downloads; GitHub Pages alone does not run it. Review dependencies and add production monitoring before public hosting.
