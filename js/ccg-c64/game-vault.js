const DB_NAME = "ccg-c64-game-vault";
const STORE_NAME = "states";
const DB_VERSION = 2;
const GAME_STORE = "gameStates";
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
        if (!db.objectStoreNames.contains(GAME_STORE)) {
          db.createObjectStore(GAME_STORE, { keyPath: "id" });
        }
      };
      request.onsuccess = () => {
        request.result.onversionchange = () => { request.result.close(); this._dbPromise = null; };
        resolve(request.result);
      };
      request.onerror = () => { this._dbPromise = null; reject(request.error || new Error("Could not open the Game Vault.")); };
      request.onblocked = () => { this._dbPromise = null; reject(new Error("Game Vault storage is blocked by another open tab.")); };
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

  // New game-specific states are stored separately; the original three
  // global slots stay untouched and remain available as legacy saves.
  async saveGame(gameKey, gameTitle, slot, payload, savedAt = Date.now()) {
    const id = gameSlotId(gameKey, slot);
    assertPayload(payload);
    const record = {
      id, gameKey, gameTitle: safeTitle(gameTitle),
      slot: assertSlot(slot), savedAt: Number.isFinite(savedAt) && savedAt > 0 ? savedAt : Date.now(),
      payload,
    };
    const db = await this._open();
    await transactionPromise(db, GAME_STORE, "readwrite", (store) => store.put(record));
    return record;
  }

  async loadGame(gameKey, slot) {
    const db = await this._open();
    return readRecord(db, GAME_STORE, gameSlotId(gameKey, slot));
  }

  async clearGame(gameKey, slot) {
    const db = await this._open();
    await transactionPromise(db, GAME_STORE, "readwrite", (store) =>
      store.delete(gameSlotId(gameKey, slot)));
  }

  async listSavedGames() {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const games = new Map();
      const tx = db.transaction(GAME_STORE, "readonly");
      const request = tx.objectStore(GAME_STORE).openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        const { gameKey, gameTitle, slot, savedAt } = cursor.value;
        const old = games.get(gameKey) || {
          gameKey, gameTitle, latestSavedAt: 0, slots: {},
        };
        old.gameTitle = gameTitle || old.gameTitle;
        old.slots[slot] = savedAt;
        old.latestSavedAt = Math.max(old.latestSavedAt, savedAt || 0);
        games.set(gameKey, old);
        cursor.continue();
      };
      tx.oncomplete = () => resolve([...games.values()].sort((a, b) =>
        b.latestSavedAt - a.latestSavedAt));
      tx.onerror = () => reject(tx.error || new Error("Could not list saved games."));
      tx.onabort = () => reject(tx.error || new Error("Saved game listing was aborted."));
    });
  }

  async listLegacySlots() {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).getAllKeys();
      request.onsuccess = () => resolve(request.result.filter((n) => VALID_SLOTS.has(n)));
      request.onerror = () => reject(request.error || new Error("Could not check legacy saves."));
    });
  }
}

function assertGameKey(value) {
  if (typeof value !== "string" || !value.trim() || value.length > 300 ||
      /[\u0000-\u001f]/.test(value)) {
    throw new Error("Invalid saved-game identity.");
  }
  return value;
}

function safeTitle(value) {
  const title = String(value || "Untitled C64 game").trim();
  return title.slice(0, 160) || "Untitled C64 game";
}

function gameSlotId(gameKey, slot) {
  return JSON.stringify([assertGameKey(gameKey), assertSlot(slot)]);
}

function assertPayload(payload) {
  if (!payload || payload.format !== "ccg-c64-vault" ||
      payload.version !== 1 || !payload.state ||
      payload.state.format !== "c64state" || payload.state.version !== 1) {
    throw new Error("Not a compatible C64 Game Vault save.");
  }
}

function transactionPromise(db, storeName, mode, operation) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    operation(tx.objectStore(storeName));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Game Vault storage failed."));
    tx.onabort = () => reject(tx.error || new Error("Game Vault storage was aborted."));
  });
}

function readRecord(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const request = tx.objectStore(storeName).get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error("Could not read Game Vault save."));
  });
}

// JSON backup files are portable across browsers: typed arrays must be encoded
// explicitly or restoring the C64 memory and media would silently fail.
const BYTE_TYPES = Object.freeze({
  Uint8Array, Uint8ClampedArray, Int8Array, Uint16Array, Int16Array,
  Uint32Array, Int32Array, Float32Array, Float64Array,
});

function bytesToBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 32768) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
  }
  return btoa(binary);
}

function base64ToBytes(encoded) {
  if (typeof encoded !== "string" || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) ||
      encoded.length % 4 !== 0) throw new Error("Corrupt Game Vault backup data.");
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function backupReplacer(_key, value) {
  if (value instanceof ArrayBuffer) {
    return { __ccgBuffer: bytesToBase64(new Uint8Array(value)) };
  }
  if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
    const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    return { __ccgType: value.constructor.name, bytes: bytesToBase64(bytes) };
  }
  return value;
}

function backupReviver(_key, value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  if (Object.hasOwn(value, "__ccgBuffer")) {
    return base64ToBytes(value.__ccgBuffer).buffer;
  }
  if (Object.hasOwn(value, "__ccgType")) {
    const Type = BYTE_TYPES[value.__ccgType];
    if (!Type) throw new Error("Unsupported saved-game memory format.");
    const bytes = base64ToBytes(value.bytes);
    if (bytes.byteLength % Type.BYTES_PER_ELEMENT !== 0) {
      throw new Error("Invalid typed-array length in backup.");
    }
    return new Type(bytes.buffer);
  }
  return value;
}

export function encodeGameVaultBackup(record) {
  if (!record) throw new Error("Choose a saved slot to back up first.");
  assertPayload(record.payload);
  return JSON.stringify({
    format: "ccg-c64-game-vault-backup", version: 1,
    gameKey: assertGameKey(record.gameKey),
    gameTitle: safeTitle(record.gameTitle),
    slot: assertSlot(record.slot),
    savedAt: record.savedAt,
    payload: record.payload,
  }, backupReplacer);
}

export function decodeGameVaultBackup(text) {
  if (typeof text !== "string" || text.length > 80_000_000) {
    throw new Error("The Game Vault backup is too large or invalid.");
  }
  let result;
  try {
    result = JSON.parse(text, backupReviver);
  } catch (error) {
    throw new Error("The selected file is not a valid Game Vault backup: " +
      (error?.message || "invalid JSON"));
  }
  if (!result || result.format !== "ccg-c64-game-vault-backup" || result.version !== 1) {
    throw new Error("Unrecognised Game Vault backup format.");
  }
  assertGameKey(result.gameKey);
  assertSlot(result.slot);
  assertPayload(result.payload);
  return {
    gameKey: result.gameKey, gameTitle: safeTitle(result.gameTitle),
    slot: result.slot, savedAt: result.savedAt, payload: result.payload,
  };
}
