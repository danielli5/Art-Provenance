## Security Review Results

### BLOCK (must fix before publishing)
- None.

### WARN (inform user, let them decide)
- Dependency audit reports 5 high-severity vulnerabilities (and 4 moderate, below the review threshold) in the installed dependency tree, including Tailwind CSS 3.4.19 and related packages; `npm audit` reports no critical vulnerabilities. Update/override the affected packages and rerun the audit. — `package.json:96`, `package-lock.json`
- Per-visitor rate limits can be bypassed because clients can choose `X-Visitor-Id`; additionally, research spend is counted only after provider responses, so concurrent requests may all pass the daily-cap check before any spend is recorded. Use a trusted rate-limit key and reserve/track in-flight budget before starting paid calls. — `server/routes.ts:50-53`; `server/research.ts:104-115, 127-134, 264-269`

### PASS
- No hardcoded-secret patterns found; no non-example `.env` files were present. `.env` files are ignored by `.gitignore`.
- The sole `dangerouslySetInnerHTML` match is in an unused chart component; its generated style uses a React-generated identifier and component configuration, with no demonstrated user-controlled input path. No exploitable XSS/injection pattern found.
- No open-CORS configuration found.
