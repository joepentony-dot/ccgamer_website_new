const DB_NAME = "ccg-c64-game-vault";
const STORE_NAME = "states";
const DB_VERSION = 1;
const VALID_SLOTS = new Set([1, 2, 3]);

function assertSlot(slot) {
  const n = Number(slot);
  if (!VALID_SLOTS.has(n)) throw new Error("Game Vault slot must be 1, 2 or 3.");
  return n;
}

export class GameVault {
  constructor() {
    this._dbPromise = null;
  }

  _open() {
    if (this._dbPromise) return this._dbPromise;
    if (!("indexedDB" in globalThis)) {
      return Promise.reject(new Error("IndexedDB is unavailable in this browser."));
    }

    this._dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "slot" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Could not open the Game Vault."));
      request.onblocked = () => reject(new Error("Game Vault storage is blocked by another open tab."));
    });
    return this._dbPromise;
  }

  async save(slot, payload) {
    const key = assertSlot(slot);
    const db = await this._open();
    const record = {
      slot: key,
      savedAt: Date.now(),
      payload,
    };

    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Could not save this Game Vault slot."));
      tx.onabort = () => reject(tx.error || new Error("Game Vault save was aborted."));
    });
    return record;
  }

  async load(slot) {
    const key = assertSlot(slot);
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error("Could not read this Game Vault slot."));
    });
  }

  async clear(slot) {
    const key = assertSlot(slot);
    const db = await this._open();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Could not clear this Game Vault slot."));
      tx.onabort = () => reject(tx.error || new Error("Game Vault clear was aborted."));
    });
  }
}
