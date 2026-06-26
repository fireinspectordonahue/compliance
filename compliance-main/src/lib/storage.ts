/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const getSafeLocalStorage = (): Storage => {
  try {
    // Test if localStorage is accessible and working
    if (typeof window !== 'undefined' && window.localStorage) {
      const testKey = '__test_localstorage__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      return window.localStorage;
    }
  } catch (e) {
    console.warn('LocalStorage is not accessible or blocked (e.g. inside sandboxed iframe). Falling back to in-memory store.', e);
  }

  // In-memory fallback shim
  const memoryStore: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in memoryStore ? memoryStore[key] : null),
    setItem: (key: string, value: string) => { memoryStore[key] = String(value); },
    removeItem: (key: string) => { delete memoryStore[key]; },
    clear: () => { for (const key in memoryStore) { delete memoryStore[key]; } },
    key: (index: number) => Object.keys(memoryStore)[index] || null,
    get length() { return Object.keys(memoryStore).length; }
  } as Storage;
};

export const safeStorage = getSafeLocalStorage();
