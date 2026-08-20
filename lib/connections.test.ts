import { describe, expect, it } from 'bun:test';
import { filterCatalog, isConnectionsApiMissing, normalizeProvider } from './connections.ts';
import type { ConnectionCatalogItem } from './api.ts';

const catalog: ConnectionCatalogItem[] = [
  { provider: 'HUBSPOT', name: 'HubSpot', connected: false, managed_auth: true },
  { provider: 'GOOGLE_ANALYTICS', name: 'Google Analytics', connected: true, managed_auth: true },
  { provider: 'TIKTOK', name: 'TikTok', connected: true, managed_auth: false },
];

describe('filterCatalog', () => {
  it('returns everything for an empty query', () => {
    expect(filterCatalog(catalog, '   ')).toHaveLength(3);
  });

  it('matches on display name, case-insensitively', () => {
    expect(filterCatalog(catalog, 'hubspot').map((i) => i.provider)).toEqual(['HUBSPOT']);
  });

  it('matches on provider slug too', () => {
    expect(filterCatalog(catalog, 'google_').map((i) => i.name)).toEqual(['Google Analytics']);
  });

  it('returns nothing when no app matches', () => {
    expect(filterCatalog(catalog, 'salesforce')).toEqual([]);
  });
});

describe('isConnectionsApiMissing', () => {
  it('detects a backend without the connections endpoints', () => {
    expect(isConnectionsApiMissing(new Error('API 404: Not Found'))).toBe(true);
    expect(isConnectionsApiMissing(new Error('API 501: not implemented'))).toBe(true);
  });

  it('does not swallow real failures', () => {
    expect(isConnectionsApiMissing(new Error('API 403: forbidden'))).toBe(false);
    expect(isConnectionsApiMissing(new Error('fetch failed'))).toBe(false);
  });
});

describe('normalizeProvider', () => {
  it('normalizes user input to the slug shape', () => {
    expect(normalizeProvider(' google-analytics ')).toBe('GOOGLE_ANALYTICS');
    expect(normalizeProvider('google analytics')).toBe('GOOGLE_ANALYTICS');
    expect(normalizeProvider('HUBSPOT')).toBe('HUBSPOT');
  });
});
