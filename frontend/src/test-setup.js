// Dexie needs a real (or polyfilled) IndexedDB — Vitest runs in Node by default,
// which doesn't have one. fake-indexeddb provides a spec-compliant in-memory
// implementation, so db/schema.js works exactly the same in tests as it does
// in a real browser, no mocking of our own code required.
import 'fake-indexeddb/auto'
