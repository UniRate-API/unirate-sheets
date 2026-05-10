/**
 * Jest setup for Code.js. Stubs the Apps Script globals (UrlFetchApp,
 * PropertiesService, CacheService) so the file can be required and
 * exercised under Node.
 */

const mockProps = {
  _store: {},
  getProperty(k) { return this._store[k] === undefined ? null : this._store[k]; },
  setProperty(k, v) { this._store[k] = v; },
  deleteProperty(k) { delete this._store[k]; }
};

const mockCache = {
  _store: {},
  get(k) { return this._store[k] === undefined ? null : this._store[k]; },
  put(k, v) { this._store[k] = v; }
};

const fetchMock = jest.fn();

global.PropertiesService = { getDocumentProperties: () => mockProps };
global.CacheService = { getDocumentCache: () => mockCache };
global.UrlFetchApp = { fetch: fetchMock };

global._mockProps = mockProps;
global._mockCache = mockCache;
global._fetchMock = fetchMock;

global.mockResponse = (status, body) => ({
  getResponseCode: () => status,
  getContentText: () => (typeof body === 'string' ? body : JSON.stringify(body))
});
