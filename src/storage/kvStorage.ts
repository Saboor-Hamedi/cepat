import AsyncStorage from '@react-native-async-storage/async-storage';

const memoryStore = new Map<string, string>();

interface KeyValueBackend {
  getItem: (key: string) => Promise<string | null> | string | null;
  setItem: (key: string, value: string) => Promise<void> | void;
  removeItem: (key: string) => Promise<void> | void;
}

function getSqliteKvStore(): KeyValueBackend | null {
  // ExpoSQLite native module is optional and not present in all runtimes.
  // We rely on AsyncStorage as the primary cross-platform persistent storage.
  return null;
}

function getWebLocalStorage(): KeyValueBackend | null {
  try {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch {
    // Web storage may be blocked in restricted contexts.
  }
  return null;
}

export async function getStoredItem(key: string): Promise<string | null> {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value !== null && value !== undefined) {
      memoryStore.set(key, value);
      return value;
    }
  } catch {
    // Fall through to secondary storage backends.
  }

  const sqliteStore = getSqliteKvStore();
  if (sqliteStore) {
    try {
      const value = await sqliteStore.getItem(key);
      if (value !== null && value !== undefined) {
        memoryStore.set(key, value);
        return value;
      }
    } catch {
      // Fall through to web or memory storage.
    }
  }

  const webStore = getWebLocalStorage();
  if (webStore) {
    try {
      const value = await webStore.getItem(key);
      if (value !== null && value !== undefined) {
        memoryStore.set(key, value);
        return value;
      }
    } catch {
      // Fall through to memory store.
    }
  }

  return memoryStore.get(key) ?? null;
}

export async function setStoredItem(key: string, value: string): Promise<boolean> {
  memoryStore.set(key, value);
  let persisted = false;

  try {
    await AsyncStorage.setItem(key, value);
    persisted = true;
  } catch {
    // Try secondary storage backends before relying on in-memory session storage.
  }

  if (!persisted) {
    const sqliteStore = getSqliteKvStore();
    if (sqliteStore) {
      try {
        await sqliteStore.setItem(key, value);
        persisted = true;
      } catch {
        // Fall through to web storage.
      }
    }
  }

  if (!persisted) {
    const webStore = getWebLocalStorage();
    if (webStore) {
      try {
        await webStore.setItem(key, value);
        persisted = true;
      } catch {
        // In-memory store remains populated for the current session.
      }
    }
  }

  return persisted || memoryStore.get(key) === value;
}

export async function removeStoredItem(key: string): Promise<void> {
  memoryStore.delete(key);
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // Ignore backend removal errors.
  }
  const sqliteStore = getSqliteKvStore();
  if (sqliteStore) {
    try {
      await sqliteStore.removeItem(key);
    } catch {
      // Ignore secondary backend errors.
    }
  }
  const webStore = getWebLocalStorage();
  if (webStore) {
    try {
      await webStore.removeItem(key);
    } catch {
      // Ignore web storage errors.
    }
  }
}

export async function getStoredJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await getStoredItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function setStoredJson<T>(key: string, value: T): Promise<boolean> {
  try {
    return await setStoredItem(key, JSON.stringify(value));
  } catch {
    return false;
  }
}
