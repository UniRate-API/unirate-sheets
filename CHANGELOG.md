# Changelog

## v0.1.0 — 2026-05-10

Initial release.

- `=UNIRATE(from, to, [amount], [date])` — current or historical conversion.
- `=UNIRATE_RATES(base)` — all current rates for a base currency, as a 2-column array.
- `=UNIRATE_HISTORICAL(date, base)` — Pro-gated historical rate table for a date.
- `=UNIRATE_TIMESERIES(start, end, base, currencies)` — Pro-gated timeseries.
- `=UNIRATE_CURRENCIES()` — supported currency codes.
- `=UNIRATE_VAT([country])` — EU/UK VAT rates.
- Sidebar for storing the API key in document properties.
- `Extensions → UniRate` menu with **Set API key**, **Test connection**, **Help**.
- 6-hour `CacheService` cache on rates / currencies / VAT to keep recalc traffic well under free-tier limits.
