import assert from 'node:assert/strict';
import { test } from 'node:test';
import { recordMobileDiagnostic, getMobileDiagnosticsSnapshot } from '../src/utils/mobileCrashDiagnostics.js';
import { appendTasteMemorySignal, loadTasteMemoryStore } from '../src/utils/tasteMemoryStore.js';

function throwingStorage() {
  return {
    getItem() { throw new Error('storage blocked'); },
    setItem() { throw new Error('quota exceeded'); },
    removeItem() { throw new Error('storage blocked'); },
  };
}

test('taste memory reads and writes tolerate blocked mobile storage', () => {
  const storage = throwingStorage();

  assert.doesNotThrow(() => loadTasteMemoryStore(storage));
  assert.doesNotThrow(() => appendTasteMemorySignal({ events: [] }, { tags: ['âmbar'], moods: ['noite'] }, storage));
});

test('mobile diagnostics retain a bounded breadcrumb trail without sensitive raw input', () => {
  const previousWindow = global.window;
  const data = new Map();
  global.window = {
    location: { pathname: '/catalogo', search: '?q=email%40example.com', hash: '' },
    sessionStorage: {
      getItem: (key) => (data.has(key) ? data.get(key) : null),
      setItem: (key, value) => data.set(key, String(value)),
    },
  };

  try {
    for (let index = 0; index < 40; index += 1) {
      recordMobileDiagnostic('search', { query: `cliente${index}@example.com 11999999999` });
    }

    const snapshot = getMobileDiagnosticsSnapshot();
    assert.equal(snapshot.events.length, 24);
    assert.doesNotMatch(JSON.stringify(snapshot), /cliente39@example\.com|11999999999/);
    assert.match(JSON.stringify(snapshot), /\[email\]|\[phone\]/);
  } finally {
    if (previousWindow === undefined) delete global.window;
    else global.window = previousWindow;
  }
});
