// User-supplied C64 media. Media bytes never leave this browser or reach CCG.
const DB_NAME = "ccg-c64-local-media-library";
const DB_VERSION = 1;
const STORE_NAME = "media";
const MAX_MEDIA_BYTES = 16 * 1024 * 1024;
const SUPPORTED_FORMATS = new Set(["prg", "d64", "d71", "d81", "g64", "tap", "t64", "crt"]);

export function localMediaFormat(filename) {
  const match = String(filename || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  return match && SUPPORTED_FORMATS.has(match[1]) ? match[1] : null;
}

export function localMediaId(filename) {
  const name = String(filename || "").replace(/\.[^.]+$/, "");
  return `custom:${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100) || "game"}`;
}

function checkMedia(id, filename, type, bytes) {
  if (typeof id !== "string" || !/^(?:preset|custom):[a-z0-9][a-z0-9-]{0,119}$/.test(id)) {
    throw new Error("Invalid game library identifier.");
  }
  if (typeof filename !== "string" || !filename || filename.length > 255 ||
      filename.includes("/") || filename.includes("\\")) {
    throw new Error("Invalid C64 media filename.");
  }
  if (!SUPPORTED_FORMATS.has(type) || localMediaFormat(filename) !== type) {
    throw new Error("Select a supported C64 disk, tape, program or cartridge.");
  }
  if (!(bytes instanceof Uint8Array) || bytes.length < 3 || bytes.length > MAX_MEDIA_BYTES) {
    throw new Error("Game media must be between 3 bytes and 16 MiB.");
  }
}

export class LocalMediaLibrary {
  constructor() {
    this._dbPromise = null;
  }

  _open() {
    if (this._dbPromise) return this._dbPromise;
    if (!("indexedDB" in globalThis)) {
      return Promise.reject(new Error("Local game storage is unavailable in this browser."));
    }

    this._dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Local game storage could not be opened."));
      request.onblocked = () => reject(new Error("Close other emulator tabs and try again."));
    }).catch((error) => {
      this._dbPromise = null;
      throw error;
    });
    return this._dbPromise;
  }

  async save({ id, title, filename, type, bytes }) {
    checkMedia(id, filename, type, bytes);
    const db = await this._open();
    const record = {
      id,
      title: String(title || filename).slice(0, 150),
      filename,
      type,
      bytes: bytes.slice().buffer,
      addedAt: Date.now(),
    };
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error("Could not save the game to this browser."));
      tx.onabort = () => reject(tx.error || new Error("Browser game storage was interrupted."));
    });
    return { id: record.id, title: record.title, filename: record.filename, type: record.type };
  }

  async get(id) {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(id);
      request.onsuccess = () => {
        const record = request.result;
        resolve(record ? {
          id: record.id,
          title: record.title,
          filename: record.filename,
          type: record.type,
          bytes: new Uint8Array(record.bytes),
        } : null);
      };
      request.onerror = () => reject(request.error || new Error("Could not read the selected game."));
    });
  }

  async list() {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const entries = [];
      const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          resolve(entries.sort((a, b) => a.title.localeCompare(b.title)));
          return;
        }
        const { id, title, filename, type, addedAt } = cursor.value;
        entries.push({ id, title, filename, type, addedAt });
        cursor.continue();
      };
      request.onerror = () => reject(request.error || new Error("Could not list saved C64 games."));
    });
  }

  async remove(id) {
    const db = await this._open();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error("Could not remove the saved game."));
      tx.onabort = () => reject(tx.error || new Error("Removing this game was interrupted."));
    });
  }
}
