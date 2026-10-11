# Computer vs. Cowork: Art Provenance Scorecard

An evidence-led comparison for Daniel's Perplexity hiring-manager interview. Evaluate the same museum-inspired webpage, then translate observed differences into a buyer hypothesis for manufacturing, robotics, and automation.

Status: evaluation template, not benchmark results. Both products remain Not measured until tested under the protocol below. Proposed weights reflect this project's priorities, not an industry-standard benchmark.

## The question to answer

Which product gets me from a written specification to a working, trustworthy, reusable application with less human correction?

This test compares the products building the app. It does not establish that either product performs better at live provenance research: the specified app uses museum APIs and prepared historical context, not a live Perplexity research backend. Do not award discovery credit for facts and sources already supplied in the brief.

## Set up a fair test

- **Identical starting packet:** Use the same frozen Cowork build brief, permitted artwork images, and saved museum fixture. The brief is in the [Art-Provenance repository](https://github.com/danielli5/Art-Provenance/blob/master/docs/cowork-build-brief.md). If one product cannot access the private repository, upload the same packet directly to both.
- **Fresh runs:** Start a new session and empty working folder in each product. Do not supply the existing implementation, prior conversation, hidden hints, or screenshots to only one.
- **Same scope:** Four museum catalogs, artist/title input, candidate confirmation, continuous record and provenance, inline evidence, and the specified Courbet context. No paid APIs or unrequested features.
- **Two checkpoints:** Preserve the first deliverable before corrective feedback. Then permit up to three repair rounds, each containing at most three concrete failed acceptance tests. Record each instruction verbatim and score the final result separately.
- **Same stopping rule:** Set the deadline before starting and apply it to both. If you stop a run early, mark it incomplete rather than guessing how it would have finished.
- **Comparable conditions:** Test in the same general time window. Record product plan, selected mode/model if exposed, operating environment, enabled connectors, and file access. Do not guess hidden models.
- **Provider outages:** When an external museum fails, use the same recorded response or controlled failure fixture for both products to test handling. Report real-world reachability separately; do not reward one product for a transient outage affecting only the other.
- **Existing Computer app:** Use it as a demonstration reference only. Its iterative development history is not a controlled first-pass baseline. If you compare it against a new Cowork run, label the exercise “mature reference vs. first attempt,” not a head-to-head benchmark.

### Common opening instruction

“Build the application in the attached Art Provenance brief. Implement the current scope, run it, and test it. Do not add paid APIs, image recognition, or unrequested features. Deliver runnable source, setup instructions, a working preview if your environment supports it, and an honest test report. Preserve museum wording, distinguish prepared context from live data, and report blockers instead of substituting fake results.”

## Quality score: 100 points

Each category has four checks below. Give one point for each fully passed check: category rating is 0–4. A partially completed check fails for scoring but may be described in the notes. Category contribution equals its weight multiplied by passed checks divided by four.

Use NM for Not measured, not zero. Report an overall total only after all 24 checks have an outcome; until then, report checks evaluated out of 24 and no overall score. Record evidence IDs, not just impressions.

| Category | Weight | Computer first / final | Cowork first / final | Evidence / notes |
|---|---:|---|---|---|
| Evidence and historical accuracy | 25 | NM / NM | NM / NM | |
| Working end-to-end application | 25 | NM / NM | NM / NM | |
| Reliability and edge cases | 15 | NM / NM | NM / NM | |
| Museum-style usability | 15 | NM / NM | NM / NM | |
| Honest scope and privacy | 10 | NM / NM | NM / NM | |
| Reusable handoff | 10 | NM / NM | NM / NM | |
| Total, once fully evaluated | 100 | NM / NM | NM / NM | |

Example: three of four evidence checks contribute 18.75 of that category's 25 points. Keep first-pass and final totals separate so repair effort stays visible.

### Evidence and historical accuracy

- [ ] **E1: Correct object and image.** Confirmed artist, title, museum ID, image, credit, and rights all refer to the same work. Test Courbet plus a second artwork; do not accept a similar image as an exact match.
- [ ] **E2: Traceable catalog claims.** Audit every displayed provenance row for the selected Courbet case against its cited museum passage. Preserve qualifications and order; no invented owner, transfer, or missing interval.
- [ ] **E3: Correct contextual history.** Courbet's later forced-sale allegation appears beside the relevant 1935 sale, and the 2001 settlement appears later in the chronology. The allegation is not presented as a judicial finding or as a claim made in 1935; other works do not inherit this context. Use the [museum record](https://www.artic.edu/artworks/27027/the-rock-of-hautepierre) and [Cuno testimony](https://financialservices.house.gov/media/pdf/072706jc.pdf) as the supplied verification packet.
- [ ] **E4: Readable evidence.** Inline panels distinguish exact museum excerpts from prepared summaries, identify the source and date, and link to the correct public page or testimony. Raw JSON is optional under Technical details.

### Working end-to-end application

- [ ] **F1: Minimal input.** Artist and artwork title alone initiate discovery. Clear field errors handle blank inputs; no image URL or upload is required.
- [ ] **F2: Four-provider discovery.** All four museum adapters are implemented and exercised with live data or clearly marked test responses. The results show per-provider status and retain distinct museum identities.
- [ ] **F3: Confirmation and continuous dossier.** A user must select the work before opening the dossier. Record summary and provenance share one scroll, without research tabs, Questions to ask, or a standalone Beyond the catalog panel.
- [ ] **F4: Complete supporting flow.** Saved example, local image preview/removal, presentation mode, and JSON museum-record export all work. Export is labeled for what it actually contains.

### Reliability and edge cases

- [ ] **R1: Honest no-match handling.** A nonexistent title does not return an unlabeled fixture, invented object, or unrelated “best match.”
- [ ] **R2: Partial service failure.** Make one provider fail. Successful providers remain usable, and the failed source is distinguished from a successful source with zero results.
- [ ] **R3: Missing source content.** An unavailable image or absent provenance yields an explicit state with the remaining museum record intact, not fabricated content.
- [ ] **R4: Recovery and isolation.** Failed searches preserve input, a later valid search succeeds, and switching artworks does not leak the previous artwork's image or historical context. No uncaught browser error occurs in these flows.

### Museum-style usability

- [ ] **U1: Visual fidelity.** Quiet museum-placard aesthetic, specified serif/sans typography, warm surfaces, thin dividers, restrained accent, and uncropped artwork. No generic chat/dashboard replacement.
- [ ] **U2: Responsive reading.** At 1440 px and 375 px, entry, results, dossier, and expanded evidence remain legible with no horizontal overflow or clipped controls.
- [ ] **U3: Keyboard interaction.** Form fields have labels, controls have visible focus, evidence disclosures work from the keyboard, and dialogs support Escape and restore focus.
- [ ] **U4: Theme and presentation.** Light/dark and presentation controls work in both directions without hiding evidence, research status, uncertainty, or the exit control.

### Honest scope and privacy

- [ ] **H1: Research labeling.** Live catalog data, saved snapshots, and prepared context are visibly distinct. No claim of live Perplexity research or independent corroboration where neither occurred.
- [ ] **H2: Local upload boundary.** Inspect network traffic while selecting/removing an image: it stays local, limits are enforced, and the interface does not pretend to recognize it.
- [ ] **H3: No unauthorized exposure.** No secrets in source/bundle, private uploads in the handoff, unapproved public publication, or unauthorized paid API calls.
- [ ] **H4: Honest completion report.** Compare claimed tests with observed behavior. Unsupported or untested features are disclosed; the app offers no authentication, legal-title, or compliance guarantee.

### Reusable handoff

- [ ] **D1: Clean setup.** In a separate clean checkout, documented install and development-start commands work without undocumented credentials or workspace files.
- [ ] **D2: Build verification.** Type checking and production build succeed; production start serves the application and backend.
- [ ] **D3: Portable source.** Frontend, provider adapters, shared types, assets, and fixtures are included with attribution. No dependence on an expiring preview URL.
- [ ] **D4: Usable documentation.** README explains setup, limitations, data flow, export scope, test outcomes, and the need for a server-capable host rather than GitHub Pages alone.

## Non-negotiable gates

A total score is not enough to declare an application trustworthy. At each checkpoint, mark these gates Pass, Fail, or Not tested and cite the observed evidence.

| Gate | Computer first / final | Cowork first / final |
|---|---|---|
| No fabricated material ownership claim or supporting citation | Not tested / Not tested | Not tested / Not tested |
| No substitution of a different artwork as the confirmed object | Not tested / Not tested | Not tested / Not tested |
| No unlabeled fake/live substitution or false verification claim | Not tested / Not tested | Not tested / Not tested |
| No secret exposure, unauthorized upload/publication, or paid action | Not tested / Not tested | Not tested / Not tested |

A failed gate makes that checkpoint not ready for a buyer demonstration, regardless of its quality total. A corrected gate may pass in the final result, but preserve the first-pass failure and correction effort. “Passed” means no issue found in the tested scope, not proof of universal safety.

## Effort and delivery: report separately

Do not combine speed, cost, and quality into a convenient winner after seeing the results. Present the quality score alongside actual effort so the trade-off remains visible.

| Metric | Computer | Cowork | Measurement rule |
|---|---|---|---|
| Time to first runnable build | NM | NM | Start at submitted brief; stop when the primary flow runs. |
| Time to accepted final checkpoint | NM | NM | Include repairs and retesting; record incomplete if deadline reached. |
| Human active minutes | NM | NM | Time spent correcting, editing, moving files, or unblocking work; exclude passive waiting. |
| Corrective interventions | NM | NM | Count each distinct human correction; log approval-only actions separately. |
| Manual code edits by evaluator | NM | NM | Count edits and minutes. None is preferable for this task, but disclose all. |
| Delivery friction | NM | NM | Record steps needed to open a working preview and start a clean checkout. |
| Observed usage/cost | Not recorded | Not recorded | Only report actual visible usage or charges. Do not estimate credits or treat subscription and API fees as equivalent. |
| Verified source-supported claims | NM | NM | Supported material claims divided by material claims audited; retain the audited set. |

### Minimal run log

| Run / checkpoint | Product, plan, exposed mode/model | Start / end | Action or intervention | Result | Evidence ID |
|---|---|---|---|---|---|
| | | | | | |
| | | | | | |
| | | | | | |

Save screenshots, command logs, downloaded JSON, network observations, source passages, and the delivered code revision. Use IDs such as C-FIRST-E3 or W-FINAL-R2 and record the file or recording location. An assistant's “done” message is not proof.

## Repeatable test sequence

- **Happy paths:** Search Courbet / The Rock of Hautepierre, confirm the Art Institute object, and inspect all history and evidence. Then search Monet / Water Lilies and Rembrandt / The Night Watch to exercise matching and provider diversity.
- **Edge cases:** Try blank fields, a nonexistent title, one failed provider, an unavailable image, and a record without provenance. Inspect the distinction between zero results and inaccessible sources.
- **Interaction and privacy:** Upload/remove a valid local image, try an invalid file, toggle themes and presentation, open/close evidence and dialogs, and export the museum record.
- **Handoff:** Evaluate both desktop/mobile views, then run install, type check, build, and start from the delivered source in a clean directory.

Freeze the inputs and test fixtures before the two runs. Do not require a particular count of live results, since catalog responses may change; require correct identities, bounded retrieval, and honest source statuses.

## Translate findings into an industrial buyer POV

The following are hypotheses for a sales conversation, not demonstrated industry outcomes. Art provenance and supplier qualification share an evidence-preparation pattern, but their legal, technical, and operational requirements are not interchangeable.

| If the comparison actually shows… | Specific buyer and market | Defensible value hypothesis | What an industrial pilot must measure |
|---|---|---|---|
| Better source-to-claim traceability and fewer invented links | Head of Supplier Quality at a mid-market industrial equipment manufacturer | Prepare a review packet that makes unsupported supplier assertions easier to spot. | Citation accuracy, missing evidence found, reviewer corrections, and signoff time on the same supplier cases. |
| More reliable multi-source retrieval and failure reporting | Head of Procurement at a robotics integrator | Reduce manual collection of public supplier evidence without hiding unresolved sources. | Analyst minutes per supplier, source coverage, unresolved records, and follow-up effort. |
| Faster delivery of a usable tool with fewer corrections | VP Operations at an automation OEM | Test a narrow operational workflow without committing immediately to a full software project. | Time to a tested pilot, implementation assistance, adoption, and maintenance burden. |
| Easier portable handoff and reproducible setup | Engineering or IT partner supporting that operations team | Make the pilot easier to inspect, adapt, and support. | Clean-install success, integration work, security review findings, and ownership of ongoing support. |

Do not claim that four museum connectors prove enterprise-system integration, that a private prototype proves production security, or that building this tool proves supplier compliance. Use the result to earn a tightly scoped industrial pilot.

## Interview-ready conclusion

Fill this in only after testing. If results are mixed, say where each product performed better rather than forcing an overall winner.

“I gave both products the same brief and inputs. On this task, [product] scored [score] after [repair rounds], compared with [score], and required [human minutes] versus [human minutes]. The most consequential difference was [observed behavior], demonstrated by [evidence]. For a [buyer] at a [market/company type], my hypothesis is [specific workflow benefit]. I would validate that next on [bounded supplier task], measuring [metric].”

If a controlled rerun is not completed, use this instead: “I built and refined this prototype with Computer and am testing Cowork against the same specification. I have a working demonstration and a comparison method, not yet a validated head-to-head result.”

The interview story should be about judgment: a genuine personal use case, a working artifact, visible evidence, honest limitations, and a credible path to buyer value.
