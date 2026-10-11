# Provenance to Production
## Cowork build brief: Art Provenance

Build a working webpage called Provenance using this document as the complete specification. This brief describes the existing interview prototype, not a future roadmap. Implement the application, run it, test its real interactions, and deliver a runnable source folder with setup instructions. Do not stop at a plan or produce only a static mockup.

The purpose is to explore artwork provenance through an interface that feels like a fine arts museum placard. The visitor types an artist and artwork title; the app searches museum catalogs, finds permitted artwork images, asks the visitor to confirm the object, and displays the museum record and provenance in one continuous page.

Version: October 10, 2026. The current reference implementation is in the private [Art-Provenance repository](https://github.com/danielli5/Art-Provenance).

## How to use this brief in Cowork

Upload this document, select a dedicated working folder, and ask Cowork: “Build the webpage described in this document. Implement and test the current scope only. Use the museum-placard design, four museum catalogs, readable evidence, and integrated provenance history. Do not add paid APIs or claim live Perplexity research. Deliver runnable code and tell me exactly what passed and what remains incomplete.”

For an independent build comparison, provide this same brief and the same permitted artwork assets to both products. Do not provide one product with the other product's implementation. Record elapsed time, user interventions, failed steps, and acceptance-test outcomes; do not assume a winner.

For an exact reproduction instead of an independent comparison, also provide a ZIP of the reference repository. Ask Cowork to run and preserve that implementation. A written brief specifies behavior and design but cannot guarantee pixel-identical independently generated code.

Do not assume Cowork can access a private GitHub repository merely because its URL is in this document. Supply the files directly or use an authorized GitHub connection. Do not request API keys for this version.

## Current scope and explicit exclusions

- Required: two-field manual input, live searches of four public museum catalogs, automatic image selection where permitted, candidate confirmation, one-page record and provenance, readable inline evidence, saved Monet example, local image preview, light/dark themes, presentation mode, and JSON museum-record export.
- Required: the Courbet interview case includes prepared, cited historical context integrated into the provenance chronology.
- Not implemented: live Perplexity Search or Agent API, a Computer runtime behind the webpage, image recognition, reverse image search, authentication, persistent user accounts, private auction-record ingestion, full-web provenance research, imported-run comparison, CSV export, or queued research jobs.
- Do not add: a “Questions to ask” section, research tabs, a standalone “Beyond the catalog” panel, authenticity scores, clean-title badges, investment ratings, or automated buy/bid recommendations.
- Honesty: searching four catalogs is not independent verification. The same title in different museums may refer to different physical works. Never combine their ownership histories merely because their titles match.

The application must work without paid AI services, credentials, or a database. If a catalog is unavailable, report that specific failure and preserve successful results from the other catalogs.

## Visual direction

Create a quiet gallery reading room, not a chatbot, dashboard, or auction marketplace. Use real artwork images and generous whitespace, thin rules, square controls, restrained color, and readable typography.

- Light palette: background #FAF9F6; secondary surface #F2F0EB; paper #FFFFFF; ink #242421; muted text #67635D; dividers #D8D4CB; action accent #722F37.
- Dark palette: background #1C1C1A; secondary surface #272723; paper #22221F; ink #E8E5DD; muted text #B4AFA5; dividers #48473F; action accent #D9A4AA.
- Typography: Source Serif 4 regular/medium for the wordmark, main headings, artwork titles, and timeline numbers. Source Sans 3 regular/medium/semibold for body text, metadata, labels, and controls.
- Scale: body 17 px; smaller reading text 15 px; metadata 13 px; section headings approximately 26–36 px; entry headline approximately 38–56 px. Avoid illegibly small source text.
- Layout: maximum page width 1600 px; desktop side padding approximately 5.4vw capped at 88 px; mobile padding 24 px. Use a 4 px spacing scale.
- Desktop entry: approximately 45% text/form at left and 55% featured artwork at right, with a generous gap. Desktop dossier: image at left, narrower artwork placard at right.
- Mobile: stack the columns below approximately 760 px. Keep complete images visible without cropping and prevent horizontal overflow.
- Identity: a small monochrome archival/placard-inspired SVG mark next to “Provenance.” Never imitate a real museum's logo.
- Controls: visible labels, 50 px inputs, square corners, one oxblood primary action, subtle secondary links, visible keyboard focus.
- Motion: brief functional transitions only; honor reduced-motion preferences. No gradients, carousel hero, parallax, ornamental AI imagery, or animated counters.

Artwork images must use contain behavior. Do not crop, recolor, generate replacements, add fake frames, or otherwise alter the research object.

## Entry screen

Header: Provenance wordmark, “The research room,” “Our approach,” “Beyond the canvas,” and an unobtrusive theme toggle. “Beyond the canvas” is a small business-translation dialog, not a standalone historical-context section.

Headline: “Every work has a history.” Supporting text should explain that the visitor enters artist and artwork, confirms the work, then explores its record.

Require only Artist and Artwork title. The primary action is “Find the artwork.” Trim whitespace; artist length is 2–150 characters and title length 2–200 characters. Show field-specific validation errors and retain text after failures.

Show the actual research scope near the form: four public museum catalogs, no live Perplexity web research. Add example shortcuts for Claude Monet / Water Lilies; Gustave Courbet / The Rock of Hautepierre; and Rembrandt / The Night Watch.

The right side features Monet's Water Lilies, 1906, with museum credit and image attribution. Provide “Explore this saved example,” explicitly labeled as a saved snapshot with its original retrieval date. It must not silently replace arbitrary searches.

Under “Can't find your artwork?” offer a local image picker accepting JPEG, PNG, or WebP up to 10 MB and 25 megapixels. Decode to validate the image; show a preview and remove control. Keep it in browser memory, revoke object URLs on replacement/removal, and do not transmit it. Explain that image identification is not configured and typed artist/title are still needed to search. Do not pretend the image drives recognition.

## Search and identity confirmation

Query all four providers through a backend. Bound the requests, use timeouts, and keep a per-provider status so “no matches in the inspected records” is visibly different from “source temporarily unavailable.”

Show candidate cards with uncropped image or a clear unavailable-image state, artist, title, date, institution, credit/rights, public museum link, and a plain-language match explanation. Require “Use this artwork” before opening its dossier. Offer return-to-search navigation.

Use heuristic matching, not a false certainty score. Normalize accents, case, punctuation, and whitespace. Require artist tokens to match and at least 60% of meaningful title tokens to match; ignore short title words and common words such as “the,” “and,” “of,” and “on.” Rank exact titles above related titles, and image availability only as a secondary consideration. Return at most three candidates per museum.

Label related-title matches as needing review. Do not confuse editions or related compositions, and never silently select a different work to obtain a prettier image.

## Museum adapters

Keep each provider's mapping separate, with provider-prefixed IDs. Validate the current public endpoint behavior during implementation; external services can change. The endpoint patterns below describe the reference implementation.

### Art Institute of Chicago

Search https://api.artic.edu/api/v1/artworks/search with q set to artist plus title, limit 30, and requested fields. Object details are at https://api.artic.edu/api/v1/artworks/{id}; the public page is https://www.artic.edu/artworks/{id}. The institution documents its API and image usage in the [Art Institute API guide](https://api.artic.edu/docs/).

Map id, title, artist_title, artist_display, date_display, medium_display, dimensions, credit_line, main_reference_number, image_id, is_public_domain, provenance_text, and thumbnail.alt_text. Use provenance_text as the exact museum passage. Use the supplied IIIF image base only after validating it, and display the image only when the record permits it.

The reference caches three verified exact-object public-domain images: Monet object 16568, Seurat object 27992, and Courbet object 27027. Cache images by provider plus object ID, not by title alone. Credit the actual mirror. If other images fail, keep the museum record and show an unavailable-image state.

### The Metropolitan Museum of Art

The reference uses https://collectionapi.metmuseum.org/public/collection/v1.1/search with q, limit 8, and offset 0, then https://collectionapi.metmuseum.org/public/collection/v1/objects/{id}. Check the [Met API documentation](https://metmuseum.github.io/) rather than assuming the older search route still works.

Map objectID, title, artistDisplayName and attribution qualifiers, objectDate, medium, dimensions, creditLine, accessionNumber, objectURL, and permitted primaryImageSmall/primaryImage. Do not reproduce an image if isPublicDomain is false or the image URL is missing. The reference object endpoint supplies no provenance field; say so rather than inventing a chain or scraping an unrelated record.

### Cleveland Museum of Art

Use https://openaccess-api.clevelandart.org/api/artworks/ with q, limit 15, and requested fields; details are at the same base plus the numeric ID. The provider's schema is described in its [Open Access API documentation](https://openaccess-api.clevelandart.org/).

Map id, title, creators, creation_date, provenance, images, url, share_license_status, accession_number, creditline, technique, and measurements. Display images.web.url only where share_license_status is CC0. Preserve provenance[].description in its original order; do not fabricate dates or detach qualifications.

### Rijksmuseum

Use https://data.rijksmuseum.nl/search/collection with creator and title. Resolve the first two orderedItems identifiers using https://id.rijksmuseum.nl/{id}?_profile=la-framed. Follow the public [Rijksmuseum search documentation](https://data.rijksmuseum.nl/docs/search) and [IIIF guidance](https://data.rijksmuseum.nl/tutorials/iiif/).

The reference maps English Linked Art labels and statements. Getty language ID 300388277 identifies English. Useful statement classes include artist 300435416, medium 300435429, dimensions 300435430, credit 300026687, and provenance 300444174. Preserve the English provenance statement rather than manufacturing events.

Resolve shows[].id to the visual item, then digitally_shown_by[].id to the digital object and access_point[].id to the image. Check the visual item's explicit public-domain mark/zero rights before display. Request a reasonable image width, approximately 1000 px. Validate all fetched identifiers against trusted Rijksmuseum hosts to avoid arbitrary URL fetching.

## Dossier: one continuous page

Start with a toolbar containing return navigation, presentation mode, and “Export record.” The top image and placard show artist, title, date, medium, dimensions, credit line, accession/reference, institution, source link, and image attribution.

Underneath, show “The source behind the image.” Include the catalog institution, evidence status, retrieval date, live-versus-saved state, and “Live web research: Not connected; historical context is prepared research.”

Then show “The documented history.” Keep this in the same scroll as the record summary. Use numbered, thin-rule-separated rows. Preserve the museum's wording, qualifications, and order. Distinguish ownership transfers from deposits, exhibitions, and auction appearances; splitting prose into rows must not imply independently verified events.

If provenance is absent, show a clear empty state and public museum link. Do not turn missing information into a clean provenance conclusion.

### Readable evidence

Each museum provenance row has an inline “Show evidence” disclosure. Opening it shows the exact passage, institution, access date, source field, and a clear single-source limitation. The summary's disclosure can show the entire museum provenance passage.

“View museum record” opens the human-readable museum page. Put “View raw data (JSON)” inside a collapsed “Technical details” disclosure. Never make raw API JSON the default evidence experience.

For prepared historical context, label the evidence “Prepared research summary” rather than pretending it is a verbatim quotation. Identify publication, author/institution, date, and a working source URL. Render all external strings as text, not unsafe HTML.

## Courbet interview case: integrated historical context

Apply this prepared context only to the confirmed Art Institute object 27027, Gustave Courbet's The Rock of Hautepierre. Do not attach it to another Courbet work or a similarly titled object. The object identity and museum provenance are supported by the [Art Institute's public record](https://www.artic.edu/artworks/27027/the-rock-of-hautepierre).

The museum's catalog chain includes Max Silberberg and the March 23, 1935 Galerie Paul Graupe sale, followed by later transfers and the museum's 1967 acquisition; preserve the source wording rather than replacing it with this abbreviated description ([museum object data](https://api.artic.edu/api/v1/artworks/27027)).

Directly beneath the museum row describing that 1935 sale, add the heading “Later claim about the 1935 sale.” Explain that Gerta Silberberg later alleged the sale of her father-in-law Max Silberberg's collection was forced; attribute this to James Cuno's 2006 testimony and explicitly distinguish the reported allegation from a court finding ([congressional testimony](https://financialservices.house.gov/media/pdf/072706jc.pdf)).

Append a later timeline event after the 1967 acquisition: “May 14, 2001 · Ownership settlement.” Explain that Gerta Silberberg and the Art Institute reached an undisclosed settlement under which the museum retained title and possession; the testimony also discusses acknowledging Max Silberberg's prior ownership on a new label ([testimony and Appendix A](https://financialservices.house.gov/media/pdf/072706jc.pdf)).

Both contextual additions must carry “Cited historical context · Prepared research, not museum catalog text.” Each has its own evidence disclosure citing James Cuno, then President and Director of the Art Institute of Chicago, July 27, 2006 ([testimony](https://financialservices.house.gov/media/pdf/072706jc.pdf)).

Do not date the later allegation as if it was made in 1935. Do not imply the settlement adjudicated whether the sale was forced. Do not put these additions in a standalone research panel: they are part of the object's history, with their distinct evidence visible.

## Permitted demonstration images

Use the exact-object images in the reference repository if supplied. Otherwise retrieve the original permitted image from its source page and retain attribution; a Wikimedia webpage URL is not itself an image asset.

- Monet, Water Lilies, Art Institute object 16568: [verified image page](https://commons.wikimedia.org/wiki/File:Claude_Monet_-_Water_Lilies_-_1933.1157_-_Art_Institute_of_Chicago.jpg).
- Seurat, A Sunday on La Grande Jatte, Art Institute object 27992: [verified image page](https://commons.wikimedia.org/wiki/File:Georges_Seurat_-_A_Sunday_on_La_Grande_Jatte_--_1884_-_Google_Art_Project.jpg).
- Courbet, The Rock of Hautepierre, Art Institute object 27027: [verified image page](https://commons.wikimedia.org/wiki/File:Gustave_Courbet_-_Les_Roches_de_Hautepierre_%28ca._1869%29.jpg).

Keep artwork credits and rights separate from the code's licensing. Never claim ownership of museum content.

## Supporting controls and commercial story

“Our approach” explains candidate confirmation, catalog sourcing, missing evidence, and the difference between a museum assertion and independent corroboration. Make it a keyboard-accessible dialog with close, Escape dismissal, and focus restoration.

“Beyond the canvas” translates the workflow into supplier qualification for manufacturing, robotics, and automation. Target a Head of Procurement or Supplier Quality at a mid-market industrial manufacturer or robotics integrator, not a private-bank executive.

Use a small mapping: artwork identity to supplier identity; ownership chain to supplier relationships; provenance gaps to missing traceability; cited museum records to source-backed supplier evidence. The value hypothesis is less manual evidence gathering and a clearer review packet. Label this a proposed workflow, not measured ROI or a compliance guarantee.

Presentation mode reduces navigation clutter without hiding citations, research status, uncertainty, or the exit control. Theme changes must not alter artwork colors.

Do not claim Computer is better than Cowork based on this app alone. The demonstrable comparison is whether each product can build and test this workflow, with what source quality and human intervention.

## Technical implementation and deliverables

Use TypeScript, React, Vite, Node/Express, and runtime schema validation. Serve frontend and API from one origin. Use Node 22 LTS or a compatible newer release. Avoid a database, paid SDK, and credentials for this scope.

Organize client/, server/, shared/, fixtures/, and docs/. Keep source/provider normalization separate from UI rendering. Include package.json, a lockfile, .gitignore, README, and recorded QA results.

Required routes:

- POST /api/search: accepts artist and title; returns normalized artworks, checkedAt, coverage, and status/match count for each provider.
- GET /api/example: returns the labeled saved Monet museum snapshot with original retrieval timestamp.
- GET /api/export/:provider/:id: returns downloadable JSON with schemaVersion, coverage, and the normalized museum artwork; allow mode=saved for the saved example.

The reference's export is a museum record, not the full prepared-context dossier. Label the action accordingly; do not claim it includes the Courbet research additions. A future full-dossier export would require a separate explicit feature.

Normalized artwork fields: provider; museum; numeric id; title; artist; artistDisplay; date; medium; dimensions; credit; reference; image or null; alt; public museum source; apiSource; provenance; publicDomain; mode (live or saved); accessedAt; optional imageSource, provenanceField, provenanceParts, and match explanation.

Use approximately 10–14 second request timeouts, an overall per-provider ceiling near 26 seconds, bounded candidate requests, and a short cache around five minutes for public results. Add basic request-size limits and rate limiting. These are prototype safeguards, not a production security certification.

Use normal same-origin API URLs outside Computer. Do not hardcode a temporary preview proxy, session URL, local machine path, or credential into the repository. Keep .env, node_modules, dist, logs, and private photos out of Git.

Supply working commands: npm ci, npm run dev, npm run check, npm run build, and npm start. Document the default port and how to change it. GitHub stores the source; GitHub Pages alone cannot execute this Node backend.

If the environment cannot run a server or reach a provider, say exactly what is blocked. Do not replace real functionality with an unmarked fake.

## Acceptance checklist

- Blank inputs produce field-specific errors; failures retain the user's text.
- Monet / Water Lilies returns live candidates or explicit provider failures; the selected image is attributed and matches its museum object.
- Courbet / The Rock of Hautepierre can select Art Institute object 27027, display the correct image, and show its museum provenance.
- Rembrandt / The Night Watch exercises Rijksmuseum when reachable; Cleveland and Met results retain their own museum identity.
- Every search displays four provider statuses, including zero matches versus unavailable.
- A nonexistent title produces an honest no-match state; one provider failure does not hide other successful results.
- Candidate confirmation is required. Similar titles are not merged into one provenance chain.
- Courbet's later allegation appears under the 1935 sale; the 2001 settlement follows the 1967 acquisition. The separate Beyond the catalog panel is absent.
- Museum evidence shows exact passages; prepared-context evidence is labeled as a summary and links to the testimony. Raw JSON is optional and collapsed.
- Other artworks never inherit Courbet-specific historical context.
- Record and provenance share one continuous page. There are no research tabs or Questions to ask section.
- Local upload previews and removes valid images, rejects invalid/oversized input, and makes no image-analysis network call.
- Saved Monet mode is visibly labeled; arbitrary searches do not silently return its fixture.
- JSON export works and accurately identifies its museum-record-only scope.
- Light/dark and presentation controls work in both directions; dialogs close with Escape and restore focus.
- At 375 px and 1440 px, artwork remains uncropped, sources remain legible, and no horizontal overflow occurs.
- Inspect screenshots of entry, results, dossier, and expanded evidence; check keyboard focus and reduced-motion behavior.
- Type checking and production build pass. A clean checkout can install and start following the README.
- Report browser errors, failed tests, unavailable sources, and remaining limitations. Do not state “all tests passed” without running them.

## Handoff and interview walkthrough

Deliver the complete source folder, a concise README, a test-results file, and a working local preview if supported. Keep access private unless explicitly authorized to publish.

For the interview: start with Courbet, confirm the object, show the placard, scroll through the 1935 sale and its later allegation, then the 2001 settlement. Open an evidence disclosure to demonstrate why readable passages and explicit attribution matter. Show another museum result to demonstrate catalog breadth, then briefly open Beyond the canvas to translate evidence preparation into industrial supplier qualification.

Describe the boundary plainly: this webpage uses live museum APIs plus prepared, cited historical context. Computer built the original application, but no live Perplexity research API is connected behind it. Compare actual build outcomes with Cowork before making competitive claims.
