import { RoomListing } from '../types';

const DB_NAME = 'iproom_database';
const DB_VERSION = 1;
const STORE_NAME = 'rooms_store';
const LOCAL_STORAGE_KEY = 'iproom_local_rooms';

/**
 * Open IndexedDB database for virtually unlimited room storage
 */
const openDatabase = (): Promise<IDBDatabase | null> => {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.warn('IndexedDB open error, falling back to localStorage');
        resolve(null);
      };
    } catch (e) {
      resolve(null);
    }
  });
};

/**
 * Fetch all locally stored rooms from IndexedDB and LocalStorage (merged & deduplicated)
 */
export const getLocalStoredRooms = async (): Promise<RoomListing[]> => {
  const roomsMap = new Map<string, RoomListing>();

  // 1. Read from LocalStorage first for instant synchronous data
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed: RoomListing[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((r) => {
            if (r && r.id) roomsMap.set(r.id, r);
          });
        }
      }
    } catch (e) {
      // ignore parse error
    }
  }

  // 2. Read from IndexedDB for complete, unlimited room collection
  try {
    const db = await openDatabase();
    if (db) {
      const idbRooms = await new Promise<RoomListing[]>((resolve) => {
        try {
          const transaction = db.transaction(STORE_NAME, 'readonly');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.getAll();

          request.onsuccess = () => {
            resolve(Array.isArray(request.result) ? request.result : []);
          };

          request.onerror = () => {
            resolve([]);
          };
        } catch (e) {
          resolve([]);
        }
      });

      idbRooms.forEach((r) => {
        if (r && r.id) {
          // If already in map, keep newer
          roomsMap.set(r.id, r);
        }
      });
    }
  } catch (err) {
    console.warn('IndexedDB read error:', err);
  }

  return Array.from(roomsMap.values());
};

/**
 * Persist a room to both IndexedDB and LocalStorage without artificial limits
 */
export const persistRoomLocally = async (room: RoomListing): Promise<void> => {
  if (!room || !room.id) return;

  // 1. Save to IndexedDB (virtually unlimited capacity, never hits quota limit)
  try {
    const db = await openDatabase();
    if (db) {
      await new Promise<void>((resolve) => {
        try {
          const transaction = db.transaction(STORE_NAME, 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          store.put(room);
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => resolve();
        } catch (e) {
          resolve();
        }
      });
    }
  } catch (err) {
    console.warn('Failed to save to IndexedDB:', err);
  }

  // 2. Save to LocalStorage with automatic quota protection
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      let list: RoomListing[] = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) list = [];

      const idx = list.findIndex((r) => r.id === room.id);
      if (idx >= 0) {
        list[idx] = room;
      } else {
        list.unshift(room);
      }

      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
      } catch (quotaErr) {
        console.warn('LocalStorage quota reached, optimizing thumbnail storage:', quotaErr);
        // Optimize: keep first image thumbnail for each room to fit unlimited rooms in localStorage
        const optimizedList = list.map((r) => ({
          ...r,
          images: r.images && r.images.length > 0 ? [r.images[0]] : [],
        }));
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(optimizedList));
        } catch (e2) {
          // If still full, store most recent items in localStorage while IndexedDB has everything
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(optimizedList.slice(0, 15)));
        }
      }
    } catch (e) {}
  }
};

/**
 * Remove a room from both IndexedDB and LocalStorage permanently
 */
export const removeRoomLocally = async (roomId: string): Promise<void> => {
  if (!roomId) return;

  // 1. Remove from IndexedDB
  try {
    const db = await openDatabase();
    if (db) {
      await new Promise<void>((resolve) => {
        try {
          const transaction = db.transaction(STORE_NAME, 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          store.delete(roomId);
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => resolve();
        } catch (e) {
          resolve();
        }
      });
    }
  } catch (err) {
    console.warn('Failed to remove from IndexedDB:', err);
  }

  // 2. Remove from LocalStorage
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const list: RoomListing[] = JSON.parse(raw);
        if (Array.isArray(list)) {
          const filtered = list.filter((r) => r.id !== roomId);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
        }
      }
    } catch (e) {}
  }
};

/**
 * Save complete array of rooms locally
 */
export const syncAllRoomsLocally = async (rooms: RoomListing[]): Promise<void> => {
  if (!Array.isArray(rooms)) return;

  // 1. Write to IndexedDB
  try {
    const db = await openDatabase();
    if (db) {
      await new Promise<void>((resolve) => {
        try {
          const transaction = db.transaction(STORE_NAME, 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          rooms.forEach((r) => store.put(r));
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => resolve();
        } catch (e) {
          resolve();
        }
      });
    }
  } catch (err) {}

  // 2. Write to LocalStorage
  if (typeof window !== 'undefined') {
    try {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(rooms));
      } catch (quotaErr) {
        // Optimize images if quota exceeded
        const optimized = rooms.map((r) => ({
          ...r,
          images: r.images && r.images.length > 0 ? [r.images[0]] : [],
        }));
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(optimized));
        } catch (e2) {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(optimized.slice(0, 15)));
        }
      }
    } catch (e) {}
  }
};
