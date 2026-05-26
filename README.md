# UniRate for Google Sheets

`=UNIRATE("USD","EUR")` — live currency rates, historical lookups, and EU/UK
VAT rates as Sheets formulas, backed by the [UniRate API](https://unirateapi.com).

> Get a free API key at [unirateapi.com/register](https://unirateapi.com/register) (1,000 requests/day, no card).

## Functions

| Formula | Returns |
|---|---|
| `=UNIRATE("USD","EUR")` | Live rate, 1 USD → ? EUR. |
| `=UNIRATE("USD","EUR",100)` | 100 USD converted at the live rate. |
| `=UNIRATE("USD","EUR",100,"2024-01-15")` | Historical conversion (Pro). |
| `=UNIRATE_RATES("USD")` | All current rates against USD as a 2-column array. |
| `=UNIRATE_HISTORICAL("2024-01-15","USD")` | All historical rates for a date (Pro). |
| `=UNIRATE_TIMESERIES("2024-01-01","2024-01-31","USD","EUR,GBP")` | Date × currency rate matrix (Pro). |
| `=UNIRATE_CURRENCIES()` | Single-column list of supported currency codes. |
| `=UNIRATE_VAT()` / `=UNIRATE_VAT("DE")` | EU/UK VAT — full table or a single rate. |

The 4-arg historical form, `UNIRATE_HISTORICAL`, and `UNIRATE_TIMESERIES`
require a UniRate Pro plan; without one they return a clear "Pro plan"
message in the cell tooltip rather than a silent error.

Currency codes are case-insensitive and trimmed. Dates accept either a
`YYYY-MM-DD` string or a Sheets date cell.

## Install (end users)

> A Workspace Marketplace listing is in OAuth verification. Until that
> goes live, install via "Test as add-on" or by copying the script.

1. Open a Google Sheet.
2. **Extensions → Apps Script**.
3. Replace `Code.gs` with the contents of `src/Code.js`.
4. Add a new file `Setup.gs` with the contents of `src/Setup.js`.
5. Add a new HTML file `Sidebar` with the contents of `src/Sidebar.html`.
6. Open `appsscript.json` (gear icon → "Show appsscript.json") and replace
   it with `src/appsscript.json`.
7. Save, refresh the sheet, accept the OAuth prompt.
8. **Extensions → UniRate → Set API key…** — paste your key and save.
9. Try `=UNIRATE("USD","EUR")` in any cell.

## Develop

Local mock tests run under Node — no Apps Script account required.

```bash
npm install
npm test            # 30 jest tests, no network
```

The Apps Script source itself is pushed via [`clasp`](https://github.com/google/clasp):

```bash
npx clasp login
npx clasp create --type sheets --rootDir src --title "UniRate for Sheets"
# clasp writes ./.clasp.json with your scriptId — keep it gitignored.
npx clasp push
```

`.claspignore` keeps tests, `node_modules`, and CI config out of the
deployable. Only `src/` is shipped.

## Caching and quota

Each successful API call is cached in [`CacheService`](https://developers.google.com/apps-script/reference/cache/cache-service)
for 1 hour (current rates) or 6 hours (historical and currency-list lookups).
A sheet with hundreds of `=UNIRATE("USD","EUR")` formulas fans out to one
HTTP call per hour, so a free-tier key handles realistic load.

## Marketplace listing — submission checklist

This add-on is set up to be published to the Google Workspace Marketplace.
Steps left, all of which require clicks in the Google Cloud Console:

1. **GCP project** — create one at <https://console.cloud.google.com/projectcreate>.
   Pick a name like `unirate-sheets-addon`.
2. **OAuth consent screen** — APIs & Services → OAuth consent screen.
   - User type: **External**.
   - App name: `UniRate for Sheets`.
   - Support email: `admin@unirateapi.com`.
   - App logo: upload `marketplace/icon-128.png`.
   - Developer contact: `admin@unirateapi.com`.
   - Authorized domains: `unirateapi.com`.
   - Scopes — add the three from `src/appsscript.json`:
     - `…/auth/script.external_request`
     - `…/auth/script.container.ui`
     - `…/auth/spreadsheets.currentonly`
   - Optional/test users → leave empty (we want public).
3. **Switch the Apps Script project to this GCP project** —
   Apps Script editor → Project Settings → "Change project" → enter the
   GCP project number from step 1.
4. **Enable Marketplace SDK** — APIs & Services → Library → search for
   "Google Workspace Marketplace SDK" → Enable.
5. **Configure the Marketplace listing** — IAM & Admin → Marketplace SDK →
   Configuration / App listing tabs:
   - Application icon: 128×128 PNG.
   - Banner: 220×140 PNG.
   - Screenshots: 1280×800 PNG (3–5 of them; placeholders in `marketplace/`).
   - Privacy policy: `https://unirateapi.com/privacy`.
   - Terms of service: `https://unirateapi.com/terms`.
   - Detailed description: copy from `marketplace/listing-description.md`.
6. **Verify domain** — Search Console → add `unirateapi.com` if not already.
7. **Submit for OAuth verification** — OAuth consent screen → Publish app →
   "Prepare for verification". Google asks for:
   - Justification per scope (we use only the three above; copy reasoning
     from `marketplace/oauth-justifications.md`).
   - A demo video of the install + key-entry + one formula evaluation,
     ≤ 2 min, captioned.
   - Domain ownership confirmation (already done in step 6).
8. **Submit for Marketplace publish** — Marketplace SDK → Publish.
   Listing review and OAuth verification run in parallel; both typically
   take 1–2 weeks.

While verification is pending the script can still be installed by hand
(see "Install" above). The OAuth grant warns "unverified app" until
Google approves; that goes away once verification clears.

<!-- unirate-ecosystem-footer:start -->
## Other UniRate clients

UniRate ships official client libraries and framework integrations across the
ecosystem. The repos below are all maintained under the
[UniRate-API](https://github.com/UniRate-API) org.

- **Languages:** [Python](https://github.com/UniRate-API/unirate-api-python) · [Node.js / TypeScript](https://github.com/UniRate-API/unirate-api-nodejs) · [Go](https://github.com/UniRate-API/unirate-api-go) · [Rust](https://github.com/UniRate-API/unirate-api-rust) · [Java](https://github.com/UniRate-API/unirate-api-java) · [Ruby](https://github.com/UniRate-API/unirate-api-ruby) · [PHP](https://github.com/UniRate-API/unirate-api-php) · [.NET](https://github.com/UniRate-API/unirate-api-dotnet) · [Swift](https://github.com/UniRate-API/unirate-api-swift)
- **Web frameworks:** [NestJS](https://github.com/UniRate-API/nestjs-unirate) · [Django / Wagtail](https://github.com/UniRate-API/wagtail-unirate) · [FastAPI](https://github.com/UniRate-API/fastapi-unirate) · [Flask](https://github.com/UniRate-API/flask-unirate) · [React](https://github.com/UniRate-API/react-unirate) · [tRPC](https://github.com/UniRate-API/trpc-unirate)
- **Static-site generators:** [Astro](https://github.com/UniRate-API/astro-unirate) · [Eleventy](https://github.com/UniRate-API/eleventy-unirate) · [Hugo](https://github.com/UniRate-API/hugo-unirate)
- **Data / orchestration:** [Airflow](https://github.com/UniRate-API/airflow-provider-unirate) · [dbt](https://github.com/UniRate-API/dbt-unirate) · [LangChain](https://github.com/UniRate-API/langchain-unirate)
- **Workflow / no-code:** [n8n](https://github.com/UniRate-API/n8n-nodes-unirate) · [Google Sheets](https://github.com/UniRate-API/unirate-sheets) · [MCP server](https://github.com/UniRate-API/unirate-mcp)
- **Editors / tools:** [VS Code](https://github.com/UniRate-API/vscode-unirate) · [Obsidian](https://github.com/UniRate-API/obsidian-currency)
- **Specialty bridges:** [NodaMoney (.NET)](https://github.com/UniRate-API/UniRateApi.NodaMoney)

Get a free API key at [unirateapi.com](https://unirateapi.com).
<!-- unirate-ecosystem-footer:end -->

## License

MIT — see [LICENSE](LICENSE). Copyright © 2026 Unirate Team.
