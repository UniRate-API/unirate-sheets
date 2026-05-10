# Marketplace listing copy

## Short description (≤ 80 chars)
Live currency rates and historical FX in any Sheet — `=UNIRATE("USD","EUR")`.

## Detailed description (Markdown allowed in the GCP listing form)

Add live currency exchange rates, historical FX data, and EU/UK VAT rates to any Google Sheet. Use it like a spreadsheet function:

- `=UNIRATE("USD","EUR")` — live rate.
- `=UNIRATE("USD","EUR",100)` — convert 100 USD to EUR.
- `=UNIRATE("USD","EUR",100,"2024-01-15")` — historical conversion.
- `=UNIRATE_RATES("USD")` — all rates for a base currency.
- `=UNIRATE_TIMESERIES("2024-01-01","2024-01-31","USD","EUR,GBP")` — date × currency matrix.
- `=UNIRATE_CURRENCIES()` — list of 170+ supported codes.
- `=UNIRATE_VAT("DE")` — current VAT rates for EU + UK.

**Why UniRate**

- Free tier: 1,000 requests/day with no credit card.
- 170+ currencies including crypto, daily history back to 1999 (Pro).
- Results cached for 1 h on rates, 6 h on historical lookups, so a sheet
  with hundreds of formulas evaluates to one HTTP call per hour.

**How it works**

1. Install the add-on.
2. Open **Extensions → UniRate → Set API key…**.
3. Paste your free key from [unirateapi.com/register](https://unirateapi.com/register).
4. Use any of the formulas above in any cell.

The API key is stored in the spreadsheet's document properties only — no
data leaves your sheet except the currency codes and dates UniRate needs
to fulfil the request.

**Open source**

Code is MIT-licensed and hosted at <https://github.com/UniRate-API/unirate-sheets>.

**Support**

- Email: support@unirateapi.com
- Bug reports: <https://github.com/UniRate-API/unirate-sheets/issues>
