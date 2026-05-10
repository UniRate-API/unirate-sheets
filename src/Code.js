/**
 * UniRate Sheets add-on — custom functions.
 *
 * Each =UNIRATE_* formula is a thin wrapper around the UniRate REST API
 * (https://api.unirateapi.com). API key is read from document properties,
 * which the user sets via Extensions → UniRate → Set API key.
 *
 * Network calls are cached in CacheService for 6 hours (the service max),
 * so a sheet with hundreds of formulas referencing the same rate fans out
 * to one HTTP call.
 */

var UNIRATE_BASE_URL = 'https://api.unirateapi.com';
var UNIRATE_USER_AGENT = 'unirate-sheets/0.1.0';
var UNIRATE_TIMEOUT_SECONDS = 20;
var CACHE_TTL_RATES = 3600;       // 1h for current rates
var CACHE_TTL_HISTORICAL = 21600; // 6h for historical (max CacheService TTL)
var CACHE_TTL_LIST = 21600;       // 6h for currencies / vat lists
var ERR_NO_KEY = 'UniRate: API key not set. Open Extensions → UniRate → Set API key.';

/**
 * Convert a currency amount using current or historical UniRate rates.
 *
 * @param {string} from   Source currency code (e.g. "USD").
 * @param {string} to     Target currency code (e.g. "EUR").
 * @param {number=} amount Amount to convert. Defaults to 1.
 * @param {(string|Date)=} date Historical date (YYYY-MM-DD). Pro plan only.
 *                              Omit for the current rate.
 * @return {number} Converted amount.
 * @customfunction
 */
function UNIRATE(from, to, amount, date) {
  var f = requireCurrency_('from', from);
  var t = requireCurrency_('to', to);
  var n = (amount === undefined || amount === null || amount === '') ? 1 : Number(amount);
  if (!isFinite(n)) throw new Error('UniRate: amount must be a number.');

  if (date === undefined || date === null || date === '') {
    var rate = fetchRate_(f, t);
    return n * rate;
  }
  var iso = toIsoDate_(date);
  var hRate = fetchHistoricalRate_(iso, f, t);
  return n * hRate;
}

/**
 * Returns a 2-column array of all current rates for a base currency:
 *   [["EUR", 0.92],
 *    ["GBP", 0.79], ...].
 *
 * @param {string=} base Base currency code. Defaults to "USD".
 * @return {Array<Array<string|number>>} Currency / rate pairs.
 * @customfunction
 */
function UNIRATE_RATES(base) {
  var b = requireCurrency_('base', base || 'USD');
  var rates = fetchAllRates_(b);
  return ratesToArray_(rates);
}

/**
 * Pro-gated. Returns a 2-column array of historical rates for a date.
 *
 * @param {(string|Date)} date Historical date (YYYY-MM-DD).
 * @param {string=} base Base currency code. Defaults to "USD".
 * @return {Array<Array<string|number>>} Currency / rate pairs.
 * @customfunction
 */
function UNIRATE_HISTORICAL(date, base) {
  var iso = toIsoDate_(date);
  var b = requireCurrency_('base', base || 'USD');
  var rates = fetchAllHistoricalRates_(iso, b);
  return ratesToArray_(rates);
}

/**
 * Pro-gated. Returns a date-by-currency rate matrix.
 *
 *   First row:    ["date", "EUR", "GBP", ...]
 *   Subsequent:   ["2024-01-01", 0.92, 0.79, ...]
 *
 * @param {(string|Date)} startDate Start date (YYYY-MM-DD).
 * @param {(string|Date)} endDate   End date (YYYY-MM-DD). Max 5 years.
 * @param {string=} base Base currency code. Defaults to "USD".
 * @param {string=} currencies Comma-separated currency codes (e.g. "EUR,GBP").
 *                             Omit for the full rate set.
 * @return {Array<Array<string|number>>} Header row + per-day rows.
 * @customfunction
 */
function UNIRATE_TIMESERIES(startDate, endDate, base, currencies) {
  var start = toIsoDate_(startDate);
  var end = toIsoDate_(endDate);
  var b = requireCurrency_('base', base || 'USD');
  var currencyList = parseCurrencyList_(currencies);

  var data = fetchTimeseries_(start, end, b, currencyList);
  return timeseriesToArray_(data);
}

/**
 * Returns all currency codes the API supports as a single column.
 *
 * @return {Array<Array<string>>} Currency codes.
 * @customfunction
 */
function UNIRATE_CURRENCIES() {
  var list = fetchCurrencies_();
  return list.map(function (code) { return [code]; });
}

/**
 * Returns VAT rates for an EU/UK country, or all countries if omitted.
 *
 * Single country → returns the rate as a percentage number (e.g. 19).
 * No country     → returns a 3-column array [code, name, rate].
 *
 * @param {string=} country ISO-3166 alpha-2 country code (e.g. "DE").
 * @return {(number|Array<Array<string|number>>)} VAT rate(s).
 * @customfunction
 */
function UNIRATE_VAT(country) {
  if (country === undefined || country === null || country === '') {
    var all = fetchVatRates_(null);
    return Object.keys(all).sort().map(function (code) {
      var row = all[code];
      return [code, row.country_name, Number(row.vat_rate)];
    });
  }
  var iso = String(country).trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(iso)) {
    throw new Error('UniRate: country must be a 2-letter code (e.g. "DE").');
  }
  var single = fetchVatRates_(iso);
  return Number(single.vat_rate);
}

/* -------------------------- HTTP layer ----------------------------------- */

function fetchRate_(from, to) {
  var key = 'rate:' + from + ':' + to;
  return cachedNumber_(key, CACHE_TTL_RATES, function () {
    var body = httpGet_('/api/rates', { from: from, to: to });
    return parseRate_(body);
  });
}

function fetchAllRates_(base) {
  var key = 'rates:' + base;
  return cachedJson_(key, CACHE_TTL_RATES, function () {
    var body = httpGet_('/api/rates', { from: base });
    if (!body || !body.rates) {
      throw new Error('UniRate: unexpected /api/rates response.');
    }
    return numericMap_(body.rates);
  });
}

function fetchHistoricalRate_(date, from, to) {
  var key = 'h-rate:' + date + ':' + from + ':' + to;
  return cachedNumber_(key, CACHE_TTL_HISTORICAL, function () {
    var body = httpGet_('/api/historical/rates', { date: date, from: from, to: to });
    return parseRate_(body);
  });
}

function fetchAllHistoricalRates_(date, base) {
  var key = 'h-rates:' + date + ':' + base;
  return cachedJson_(key, CACHE_TTL_HISTORICAL, function () {
    var body = httpGet_('/api/historical/rates', { date: date, from: base });
    if (!body || !body.rates) {
      throw new Error('UniRate: unexpected /api/historical/rates response.');
    }
    return numericMap_(body.rates);
  });
}

function fetchTimeseries_(start, end, base, currencies) {
  var key = 'ts:' + start + ':' + end + ':' + base + ':' + (currencies || []).join(',');
  return cachedJson_(key, CACHE_TTL_HISTORICAL, function () {
    var params = { start_date: start, end_date: end, base: base };
    if (currencies && currencies.length) params.currencies = currencies.join(',');
    var body = httpGet_('/api/historical/timeseries', params);
    if (!body || !body.data) {
      throw new Error('UniRate: unexpected /api/historical/timeseries response.');
    }
    return body.data;
  });
}

function fetchCurrencies_() {
  return cachedJson_('currencies', CACHE_TTL_LIST, function () {
    var body = httpGet_('/api/currencies', {});
    if (!body || !Array.isArray(body.currencies)) {
      throw new Error('UniRate: unexpected /api/currencies response.');
    }
    return body.currencies;
  });
}

function fetchVatRates_(country) {
  var key = country ? 'vat:' + country : 'vat:all';
  return cachedJson_(key, CACHE_TTL_LIST, function () {
    var body = httpGet_('/api/vat/rates', country ? { country: country } : {});
    if (country) {
      if (!body || !body.vat_data) {
        throw new Error('UniRate: country "' + country + '" not found.');
      }
      return body.vat_data;
    }
    if (!body || !body.vat_rates) {
      throw new Error('UniRate: unexpected /api/vat/rates response.');
    }
    return body.vat_rates;
  });
}

/**
 * Low-level HTTP GET against the UniRate API.
 * Maps non-2xx responses to friendly error messages so they render usefully
 * in a sheet cell tooltip.
 */
function httpGet_(path, params) {
  var apiKey = getApiKey_();
  if (!apiKey) throw new Error(ERR_NO_KEY);

  var url = UNIRATE_BASE_URL + path + buildQuery_(extend_({ api_key: apiKey, format: 'json' }, params || {}));
  var response = UrlFetchApp.fetch(url, {
    method: 'get',
    muteHttpExceptions: true,
    followRedirects: true,
    headers: {
      'Accept': 'application/json',
      'User-Agent': UNIRATE_USER_AGENT
    }
  });
  var status = response.getResponseCode();
  var text = response.getContentText();
  if (status >= 200 && status < 300) {
    return parseJson_(text, path);
  }
  throw mapHttpError_(status, text, path);
}

function mapHttpError_(status, text, path) {
  switch (status) {
    case 400:
      return new Error('UniRate: invalid request parameters' + extractMessage_(text));
    case 401:
      return new Error('UniRate: API key is missing or invalid.');
    case 403:
      return new Error('UniRate: ' + path + ' requires a Pro plan. See https://unirateapi.com/pricing.');
    case 404:
      return new Error('UniRate: currency or resource not found' + extractMessage_(text));
    case 429:
      return new Error('UniRate: rate limit exceeded — try again in a minute.');
    case 503:
      return new Error('UniRate: service temporarily unavailable.');
    default:
      return new Error('UniRate: API error ' + status + extractMessage_(text));
  }
}

function extractMessage_(text) {
  if (!text) return '.';
  try {
    var body = JSON.parse(text);
    if (body && body.message) return ': ' + String(body.message);
    if (body && body.error) return ': ' + String(body.error);
  } catch (_) { /* not JSON */ }
  return '.';
}

function parseJson_(text, path) {
  if (!text) throw new Error('UniRate: empty response from ' + path + '.');
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error('UniRate: malformed JSON from ' + path + '.');
  }
}

function parseRate_(body) {
  if (body && body.rate !== undefined) return Number(body.rate);
  if (body && body.result !== undefined) return Number(body.result);
  throw new Error('UniRate: response missing "rate" / "result" field.');
}

/* -------------------------- caching -------------------------------------- */

function getCache_() {
  if (typeof CacheService === 'undefined' || !CacheService) return null;
  try { return CacheService.getDocumentCache(); }
  catch (_) { return null; }
}

function cachedJson_(key, ttl, producer) {
  var cache = getCache_();
  if (cache) {
    var hit = cache.get(key);
    if (hit) {
      try { return JSON.parse(hit); } catch (_) { /* fall through */ }
    }
  }
  var value = producer();
  if (cache) {
    try { cache.put(key, JSON.stringify(value), ttl); } catch (_) { /* ignore */ }
  }
  return value;
}

function cachedNumber_(key, ttl, producer) {
  var cache = getCache_();
  if (cache) {
    var hit = cache.get(key);
    if (hit !== null && hit !== undefined && hit !== '') {
      var n = Number(hit);
      if (isFinite(n)) return n;
    }
  }
  var value = producer();
  if (cache && isFinite(value)) {
    try { cache.put(key, String(value), ttl); } catch (_) { /* ignore */ }
  }
  return value;
}

/* -------------------------- helpers -------------------------------------- */

function getApiKey_() {
  if (typeof PropertiesService === 'undefined' || !PropertiesService) return null;
  try {
    var docProps = PropertiesService.getDocumentProperties();
    var key = docProps && docProps.getProperty('UNIRATE_API_KEY');
    return key ? String(key).trim() : null;
  } catch (_) {
    return null;
  }
}

function setApiKey_(key) {
  PropertiesService.getDocumentProperties().setProperty('UNIRATE_API_KEY', String(key).trim());
}

function clearApiKey_() {
  PropertiesService.getDocumentProperties().deleteProperty('UNIRATE_API_KEY');
}

function requireCurrency_(label, value) {
  if (value === undefined || value === null || value === '') {
    throw new Error('UniRate: "' + label + '" is required.');
  }
  var code = String(value).trim().toUpperCase();
  if (!/^[A-Z0-9]{2,10}$/.test(code)) {
    throw new Error('UniRate: invalid currency code "' + value + '".');
  }
  return code;
}

function toIsoDate_(value) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  var s = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new Error('UniRate: date must be in YYYY-MM-DD format (got "' + value + '").');
  }
  return s;
}

function parseCurrencyList_(value) {
  if (value === undefined || value === null || value === '') return null;
  var parts = String(value).split(',').map(function (p) { return p.trim().toUpperCase(); }).filter(Boolean);
  return parts.length ? parts : null;
}

function buildQuery_(params) {
  var keys = Object.keys(params).filter(function (k) {
    return params[k] !== undefined && params[k] !== null && params[k] !== '';
  });
  if (!keys.length) return '';
  return '?' + keys.map(function (k) {
    return encodeURIComponent(k) + '=' + encodeURIComponent(String(params[k]));
  }).join('&');
}

function extend_(target, src) {
  Object.keys(src).forEach(function (k) { target[k] = src[k]; });
  return target;
}

function numericMap_(obj) {
  var out = {};
  Object.keys(obj).forEach(function (k) { out[k] = Number(obj[k]); });
  return out;
}

function ratesToArray_(rates) {
  return Object.keys(rates).sort().map(function (code) {
    return [code, Number(rates[code])];
  });
}

function timeseriesToArray_(data) {
  var dates = Object.keys(data).sort();
  if (!dates.length) return [['date']];
  var currencies = {};
  dates.forEach(function (d) {
    Object.keys(data[d] || {}).forEach(function (c) { currencies[c] = true; });
  });
  var currencyList = Object.keys(currencies).sort();
  var rows = [['date'].concat(currencyList)];
  dates.forEach(function (d) {
    var row = [d];
    currencyList.forEach(function (c) {
      var v = data[d] && data[d][c];
      row.push(v === undefined || v === null ? '' : Number(v));
    });
    rows.push(row);
  });
  return rows;
}

/* -------------------------- exports for tests ---------------------------- */

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    UNIRATE: UNIRATE,
    UNIRATE_RATES: UNIRATE_RATES,
    UNIRATE_HISTORICAL: UNIRATE_HISTORICAL,
    UNIRATE_TIMESERIES: UNIRATE_TIMESERIES,
    UNIRATE_CURRENCIES: UNIRATE_CURRENCIES,
    UNIRATE_VAT: UNIRATE_VAT,
    _internals: {
      buildQuery_: buildQuery_,
      toIsoDate_: toIsoDate_,
      requireCurrency_: requireCurrency_,
      parseCurrencyList_: parseCurrencyList_,
      timeseriesToArray_: timeseriesToArray_,
      ratesToArray_: ratesToArray_,
      mapHttpError_: mapHttpError_,
      ERR_NO_KEY: ERR_NO_KEY
    }
  };
}
