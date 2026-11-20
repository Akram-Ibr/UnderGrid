import type { UgEvent } from '../engine/types';

// Minimal IndexedDB wrapper for the append-only event log. Falls back to localStorage, then memory.
const DB_NAME = 'undergrid';
const STORE = 'events';
const LS_KEY = 'undergrid.events';

let dbPromise: Promise<IDBDatabase | null> | null = null;

function open(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

export async function loadEvents(): Promise<UgEvent[]> {
  const db = await open();
  if (db) {
    return new Promise((resolve) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result as UgEvent[]);
      req.onerror = () => resolve([]);
    });
  }
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') as UgEvent[];
  } catch {
    return [];
  }
}

export async function saveEvents(events: UgEvent[]): Promise<void> {
  if (!events.length) return;
  const db = await open();
  if (db) {
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      const os = tx.objectStore(STORE);
      for (const e of events) os.put(e);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
    return;
  }
  try {
    const existing = new Map((JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') as UgEvent[]).map((e) => [e.id, e]));
    for (const e of events) existing.set(e.id, e);
    localStorage.setItem(LS_KEY, JSON.stringify([...existing.values()]));
  } catch {
    /* memory only */
  }
}

export async function clearEvents(): Promise<void> {
  const db = await open();
  if (db) {
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
}
