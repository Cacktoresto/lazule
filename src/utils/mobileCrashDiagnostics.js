import { safeReadJson, safeWriteJson } from './safeStorage.js';

const DIAGNOSTIC_KEY = 'lazule.mobile_diagnostics.v1';
const MAX_EVENTS = 24;
const MAX_STORAGE_BYTES = 12 * 1024;

function getStorage() {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage || window.localStorage || null;
}

function redact(value = '', maxLength = 140) {
  return String(value || '')
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[email]')
    .replace(/(?:\+?\d[\s().-]*){8,}/g, '[phone]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function readDiagnostics() {
  const state = safeReadJson(getStorage(), DIAGNOSTIC_KEY, null);
  return state && Array.isArray(state.events) ? state : { version: 1, events: [] };
}

function writeDiagnostics(state) {
  safeWriteJson(getStorage(), DIAGNOSTIC_KEY, state, { maxBytes: MAX_STORAGE_BYTES });
}

export function recordMobileDiagnostic(type, payload = {}) {
  if (typeof window === 'undefined') return null;

  const event = {
    type: redact(type, 48),
    at: new Date().toISOString(),
    route: redact(`${window.location?.pathname || '/'}${window.location?.search || ''}${window.location?.hash || ''}`, 220),
    payload: Object.fromEntries(
      Object.entries(payload || {}).map(([key, value]) => [redact(key, 48), redact(value, 180)]),
    ),
  };
  const state = readDiagnostics();
  const next = { version: 1, updatedAt: event.at, events: [...state.events, event].slice(-MAX_EVENTS) };
  writeDiagnostics(next);
  return event;
}

export function getMobileDiagnosticsSnapshot() {
  return readDiagnostics();
}
