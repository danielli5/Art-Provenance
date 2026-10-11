# Test inventory

## Evidence-panel revision checklist

- Every provenance row opens an inline readable passage rather than navigating to JSON.
- The overview provides the complete museum passage in the same component.
- Museum page link uses the selected artwork's public URL.
- Raw JSON is labeled and hidden under Technical details by default.
- Text preserves source qualifications; source date and single-source limitation are visible.
- Native disclosure keyboard toggle, close/reopen, light/dark and 375 px layouts.
- Regression object: Gustave Caillebotte, Paris Street; Rainy Day, collection ID 20684.
- Record summary and provenance are on one continuous page; no research tabs or Questions to ask section.

Revision verified: TypeScript and production build pass. Live Caillebotte record 20684 opens readable passages with the correct public museum URL; raw JSON stays hidden until Technical details is expanded. Keyboard closing works. The final combined page renders the record and history together with no tabs or Questions section. Desktop, 375 px mobile, and dark evidence panels inspected; no horizontal overflow or uncaught page errors found.

- Entry: two required fields, field errors, real catalog search, loading and service-failure states.
- Discovery: Monet and a second artist, no-match result, image/source/rights attribution, alternatives, confirmation.
- Dossier: record, provenance, questions, source links, JSON export, return navigation.
- Presentation and theme: enter/exit, light/dark cycle.
- Help: approach and enterprise dialogs, keyboard close, focus return.
- Local upload: open/close fallback, valid preview, remove, reject wrong type.
- Visual: 1440 px and 375 px, entry/results/dossier, no horizontal overflow, uncropped artwork.
- Honesty: visible single-collection coverage, saved fixture labeled, no invented full-web research.
- Explore: blank query; nonexistent title; provider unavailable; known image failure.

## Verified in Chromium

- TypeScript check and production build passed.
- Blank fields show specific validation errors.
- Live Monet / Water Lilies search returns object 16568 and a displayed image.
- Live Seurat / A Sunday on La Grande Jatte search returns object 27992 and alternatives; correct image displays after confirmation.
- Live museum provenance preserves eight source segments for the Monet case, including the chronology caveat.
- Record, provenance, and questions tabs work; source URLs remain attached.
- JSON export downloads `provenance-27992.json`.
- Approach and enterprise dialogs open and close; Escape dismisses the approach dialog.
- Presentation and theme controls complete both directions; light/dark screenshots inspected.
- Local upload displays after image decoding; removal works; text upload is rejected.
- Invented-title search returns an honest no-match result.
- Simulated museum outage produces an inline recoverable error, not an invented result.
- Saved example is visibly labeled as saved.
- 1440 px desktop and 375 px mobile layouts inspected; no horizontal overflow in entry, results, or dossier.
- No uncaught browser page errors in the tested flows.

## Limitations

- Some museum-hosted images are blocked by the provider. Two exact-object, source-verified public-domain mirrors are cached for reliable demonstration; other images attempt verified mirrors and may show unavailable-image states.
- Full web research, automatic photo identification, run comparison import, and multi-user persistent research jobs are not implemented.
- Preview has basic rate limiting, but no public-production access gate. Keep it private until production security work.
- Dependency audit of the template reported eight advisories, including tooling-related transitives. This is an interview prototype, not a production-security signoff; resolve dependency advisories and review the production dependency set before public deployment.
