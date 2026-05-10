# OAuth scope justifications (paste verbatim into the consent-screen form)

The add-on requests three scopes. Each is the **narrowest** scope that
satisfies the listed user-facing function.

## `https://www.googleapis.com/auth/script.external_request`

Required to call `https://api.unirateapi.com/api/*` from `UrlFetchApp`.
Without this scope no formula can return a rate; the entire add-on is
non-functional. Outbound traffic is restricted in `appsscript.json` via
`urlFetchWhitelist` to `https://api.unirateapi.com/` only — Apps Script
enforces this allowlist and blocks calls to any other host.

User-visible functions that depend on this scope: every `UNIRATE_*` custom
function, the **Test connection** menu item, and the sidebar **Save & test**
button.

## `https://www.googleapis.com/auth/script.container.ui`

Required to render the **UniRate API key** sidebar (`HtmlService` modal /
sidebar surfaces) and to display alert dialogs from
**Extensions → UniRate → Clear API key**. No spreadsheet content is read
or modified through this scope.

## `https://www.googleapis.com/auth/spreadsheets.currentonly`

Limited per-document scope (rather than the broad `…/auth/spreadsheets`)
needed by `SpreadsheetApp.getUi()` and `SpreadsheetApp.getActive().toast(…)`
when surfacing the menu, the alert dialogs, and the "UniRate connected"
toast notification. The scope only grants access to the spreadsheet the
add-on is currently open in.

## What is *not* requested

The add-on intentionally avoids:

- `…/auth/spreadsheets` (full Sheets) — the `*.currentonly` variant covers
  every UI surface we use.
- `…/auth/userinfo.email` / `…/auth/userinfo.profile` — we never need to
  identify the user; the API key is keyed to the document, not the person.
- `…/auth/drive*` — we never list, open, or modify Drive files outside
  the active spreadsheet.

## Demo video script (≤ 2 min)

1. Cold-load a fresh Google Sheet.
2. Install the add-on from the Marketplace listing.
3. Approve the OAuth prompt — voiceover names each scope as the consent
   screen renders it.
4. **Extensions → UniRate → Set API key…** — paste a free-tier key, click
   **Save & test**, sidebar shows "Connected. 170 currencies available."
5. In cell A1 type `=UNIRATE("USD","EUR")` — value renders.
6. In cell A2 type `=UNIRATE("USD","EUR",100,"2024-01-02")` — historical
   conversion renders (or, on a free key, a clear "Pro plan required"
   tooltip — show both flows if time permits).
7. Stop recording.
