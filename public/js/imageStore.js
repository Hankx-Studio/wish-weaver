// IndexedDB store for evolved fairy images + stories (M3).
// The server never keeps player images; the browser owns them.
const DB_NAME = "spirit-quest";
const STORE = "evolve-images";
const PID_KEY = "wishweaver.pid";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "key" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function stageKey(playerId, stage) {
  return `${playerId}:stage${stage}`;
}

export function getPlayerId(storage = localStorage) {
  let pid = null;
  try {
    pid = storage.getItem(PID_KEY);
  } catch { /* private mode */ }
  if (!pid) {
    pid = `p-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
    try {
      storage.setItem(PID_KEY, pid);
    } catch { /* keep memory-only */ }
  }
  return pid;
}

export async function saveStageImage({ key, b64, story, family, stage }) {
  const db = await openDb();
  const rec = { key, b64, story, family, stage, ts: new Date().toISOString() };
  await tx(db, "readwrite", (s) => s.put(rec));
  db.close();
  return key;
}

export async function getStageImage(key) {
  const db = await openDb();
  const rec = await tx(db, "readonly", (s) => s.get(key));
  db.close();
  return rec || null;
}

export async function listStageImages() {
  const db = await openDb();
  const recs = await tx(db, "readonly", (s) => s.getAll());
  db.close();
  return (recs || []).sort((a, b) => a.stage - b.stage);
}
