require('./_setup');

const code = require('../src/Code.js');
const internals = code._internals;

beforeEach(() => {
  global._mockProps._store = { UNIRATE_API_KEY: 'test-key' };
  global._mockCache._store = {};
  global._fetchMock.mockReset();
});

function lastUrl() {
  return global._fetchMock.mock.calls[0][0];
}

describe('=UNIRATE(from, to, amount, date)', () => {
  test('returns rate when amount is omitted', () => {
    global._fetchMock.mockReturnValueOnce(mockResponse(200, { rate: '0.92' }));
    expect(code.UNIRATE('USD', 'EUR')).toBeCloseTo(0.92);
    expect(lastUrl()).toContain('/api/rates');
    expect(lastUrl()).toContain('from=USD');
    expect(lastUrl()).toContain('to=EUR');
    expect(lastUrl()).toContain('api_key=test-key');
  });

  test('multiplies rate by amount', () => {
    global._fetchMock.mockReturnValueOnce(mockResponse(200, { rate: '0.5' }));
    expect(code.UNIRATE('USD', 'EUR', 100)).toBeCloseTo(50);
  });

  test('uppercases and trims currency codes', () => {
    global._fetchMock.mockReturnValueOnce(mockResponse(200, { rate: '0.92' }));
    code.UNIRATE(' usd ', 'eur');
    expect(lastUrl()).toContain('from=USD');
    expect(lastUrl()).toContain('to=EUR');
  });

  test('routes to /api/historical/rates when a date is supplied', () => {
    global._fetchMock.mockReturnValueOnce(mockResponse(200, { rate: '0.85' }));
    expect(code.UNIRATE('USD', 'EUR', 10, '2024-01-15')).toBeCloseTo(8.5);
    expect(lastUrl()).toContain('/api/historical/rates');
    expect(lastUrl()).toContain('date=2024-01-15');
  });

  test('accepts a Date object for the historical date', () => {
    global._fetchMock.mockReturnValueOnce(mockResponse(200, { rate: '0.85' }));
    code.UNIRATE('USD', 'EUR', 1, new Date(Date.UTC(2024, 0, 15)));
    expect(lastUrl()).toContain('date=2024-01-15');
  });

  test('throws when API key is missing', () => {
    delete global._mockProps._store.UNIRATE_API_KEY;
    expect(() => code.UNIRATE('USD', 'EUR')).toThrow(/API key not set/);
    expect(global._fetchMock).not.toHaveBeenCalled();
  });

  test('throws on missing required arg', () => {
    expect(() => code.UNIRATE('', 'EUR')).toThrow(/"from" is required/);
  });

  test('throws on bad currency code', () => {
    expect(() => code.UNIRATE('USD', 'E$')).toThrow(/invalid currency code/);
  });

  test('throws on non-numeric amount', () => {
    expect(() => code.UNIRATE('USD', 'EUR', 'abc')).toThrow(/amount must be a number/);
  });

  test('throws on bad date format', () => {
    expect(() => code.UNIRATE('USD', 'EUR', 1, '2024/01/15')).toThrow(/YYYY-MM-DD/);
  });
});

describe('=UNIRATE_RATES(base)', () => {
  test('returns sorted [code, rate] pairs', () => {
    global._fetchMock.mockReturnValueOnce(mockResponse(200, {
      rates: { GBP: '0.79', EUR: '0.92', JPY: '150.0' }
    }));
    const out = code.UNIRATE_RATES('USD');
    expect(out).toEqual([['EUR', 0.92], ['GBP', 0.79], ['JPY', 150]]);
  });

  test('defaults base to USD', () => {
    global._fetchMock.mockReturnValueOnce(mockResponse(200, { rates: { EUR: '0.9' } }));
    code.UNIRATE_RATES();
    expect(lastUrl()).toContain('from=USD');
  });
});

describe('=UNIRATE_HISTORICAL(date, base)', () => {
  test('hits /api/historical/rates and returns 2-col array', () => {
    global._fetchMock.mockReturnValueOnce(mockResponse(200, {
      rates: { EUR: '0.85', GBP: '0.78' }
    }));
    const out = code.UNIRATE_HISTORICAL('2024-01-15', 'USD');
    expect(out).toEqual([['EUR', 0.85], ['GBP', 0.78]]);
    expect(lastUrl()).toContain('/api/historical/rates');
    expect(lastUrl()).toContain('date=2024-01-15');
  });
});

describe('=UNIRATE_TIMESERIES', () => {
  test('returns header row + sorted day rows', () => {
    global._fetchMock.mockReturnValueOnce(mockResponse(200, {
      data: {
        '2024-01-02': { EUR: 0.91, GBP: 0.80 },
        '2024-01-01': { EUR: 0.92, GBP: 0.79 }
      }
    }));
    const out = code.UNIRATE_TIMESERIES('2024-01-01', '2024-01-02', 'USD', 'EUR,GBP');
    expect(out[0]).toEqual(['date', 'EUR', 'GBP']);
    expect(out[1]).toEqual(['2024-01-01', 0.92, 0.79]);
    expect(out[2]).toEqual(['2024-01-02', 0.91, 0.80]);
    expect(lastUrl()).toContain('start_date=2024-01-01');
    expect(lastUrl()).toContain('end_date=2024-01-02');
    expect(lastUrl()).toContain('currencies=EUR%2CGBP');
  });
});

describe('=UNIRATE_CURRENCIES()', () => {
  test('returns single-column array of supported codes', () => {
    global._fetchMock.mockReturnValueOnce(mockResponse(200, { currencies: ['USD', 'EUR', 'GBP'] }));
    expect(code.UNIRATE_CURRENCIES()).toEqual([['USD'], ['EUR'], ['GBP']]);
    expect(lastUrl()).toContain('/api/currencies');
  });
});

describe('=UNIRATE_VAT(country)', () => {
  test('returns single rate as a number when country is given', () => {
    global._fetchMock.mockReturnValueOnce(mockResponse(200, {
      country: 'DE',
      vat_data: { country_code: 'DE', country_name: 'Germany', vat_rate: 19.0 }
    }));
    expect(code.UNIRATE_VAT('DE')).toBe(19.0);
  });

  test('returns 3-column array when country is omitted', () => {
    global._fetchMock.mockReturnValueOnce(mockResponse(200, {
      vat_rates: {
        DE: { country_code: 'DE', country_name: 'Germany', vat_rate: 19.0 },
        FR: { country_code: 'FR', country_name: 'France', vat_rate: 20.0 }
      }
    }));
    expect(code.UNIRATE_VAT()).toEqual([
      ['DE', 'Germany', 19.0],
      ['FR', 'France', 20.0]
    ]);
  });

  test('rejects malformed country codes', () => {
    expect(() => code.UNIRATE_VAT('Germany')).toThrow(/2-letter code/);
  });
});

describe('Error mapping', () => {
  test('401 → API-key message', () => {
    global._fetchMock.mockReturnValueOnce(mockResponse(401, { message: 'bad key' }));
    expect(() => code.UNIRATE('USD', 'EUR')).toThrow(/API key is missing or invalid/);
  });

  test('403 → Pro plan message', () => {
    global._fetchMock.mockReturnValueOnce(mockResponse(403, { error: 'pro only' }));
    expect(() => code.UNIRATE('USD', 'EUR', 1, '2024-01-01')).toThrow(/Pro plan/);
  });

  test('429 → rate-limit message', () => {
    global._fetchMock.mockReturnValueOnce(mockResponse(429, ''));
    expect(() => code.UNIRATE('USD', 'EUR')).toThrow(/rate limit exceeded/);
  });

  test('503 → service unavailable', () => {
    global._fetchMock.mockReturnValueOnce(mockResponse(503, ''));
    expect(() => code.UNIRATE('USD', 'EUR')).toThrow(/service temporarily unavailable/);
  });

  test('404 currency-not-found surfaces upstream message', () => {
    global._fetchMock.mockReturnValueOnce(mockResponse(404, { message: 'currency XYZ not found' }));
    expect(() => code.UNIRATE('USD', 'XYZ')).toThrow(/currency XYZ not found/);
  });

  test('500 → generic API-error wrapper', () => {
    global._fetchMock.mockReturnValueOnce(mockResponse(500, 'boom'));
    expect(() => code.UNIRATE('USD', 'EUR')).toThrow(/API error 500/);
  });
});

describe('Caching', () => {
  test('second call with same args reads from cache, no second HTTP call', () => {
    global._fetchMock.mockReturnValueOnce(mockResponse(200, { rate: '0.92' }));
    expect(code.UNIRATE('USD', 'EUR')).toBeCloseTo(0.92);
    expect(code.UNIRATE('USD', 'EUR')).toBeCloseTo(0.92);
    expect(global._fetchMock).toHaveBeenCalledTimes(1);
  });

  test('different currency pair → fresh fetch', () => {
    global._fetchMock
      .mockReturnValueOnce(mockResponse(200, { rate: '0.92' }))
      .mockReturnValueOnce(mockResponse(200, { rate: '0.79' }));
    code.UNIRATE('USD', 'EUR');
    code.UNIRATE('USD', 'GBP');
    expect(global._fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('Internals', () => {
  test('buildQuery_ skips empty/null values', () => {
    expect(internals.buildQuery_({ a: 1, b: '', c: null, d: 'x' })).toBe('?a=1&d=x');
  });

  test('toIsoDate_ accepts YYYY-MM-DD strings and Date instances', () => {
    expect(internals.toIsoDate_('2024-01-15')).toBe('2024-01-15');
    expect(internals.toIsoDate_(new Date(Date.UTC(2024, 0, 15)))).toBe('2024-01-15');
  });

  test('parseCurrencyList_ trims and uppercases', () => {
    expect(internals.parseCurrencyList_(' eur , gbp ,jpy')).toEqual(['EUR', 'GBP', 'JPY']);
    expect(internals.parseCurrencyList_('')).toBeNull();
  });

  test('timeseriesToArray_ uses sorted dates and union of currencies', () => {
    const out = internals.timeseriesToArray_({
      '2024-01-02': { EUR: 0.91 },
      '2024-01-01': { EUR: 0.92, GBP: 0.79 }
    });
    expect(out).toEqual([
      ['date', 'EUR', 'GBP'],
      ['2024-01-01', 0.92, 0.79],
      ['2024-01-02', 0.91, '']
    ]);
  });
});
