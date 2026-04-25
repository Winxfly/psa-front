const DEFAULT_API_BASE_URL = '/api/v1';

function normalizeApiBaseUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return DEFAULT_API_BASE_URL;
  }

  return value.replace(/\/+$/, '');
}

const runtimeConfig = globalThis.__PSA_CONFIG__ || {};

export const config = Object.freeze({
  apiBaseUrl: normalizeApiBaseUrl(runtimeConfig.apiBaseUrl),
});

export default config;
