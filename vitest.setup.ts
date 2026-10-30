import '@testing-library/jest-dom/vitest';

const dom = (globalThis as { jsdom?: { window: Window } }).jsdom;
if (dom && typeof globalThis.localStorage === 'undefined') {
  for (const key of ['localStorage', 'sessionStorage'] as const) {
    Object.defineProperty(globalThis, key, { value: dom.window[key], configurable: true, writable: true });
  }
}
