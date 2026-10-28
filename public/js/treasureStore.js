// Treasure cabinet storage (M4): IndexedDB for cutout images.
// The server never stores photos, so treasures live in the player's
// browser only. Pure builders are node-testable; the IDB fns need a browser.
const DB = "wishweaver";
const STORE = "treasures";

export function buildTreasure({ questId, title, cutoutDataUrl, maskHash, spiritLine, source }) {
  return {
    id: `${questId}:${maskHash || "box"}:${Date.now()}`,
    questId,
    title: String(title || "").slice(0, 60),
    image: cutoutDataUrl,
    maskHash: maskHash || null,
    spiritLine: String(spiritLine || "").slice(0, 60),
    source: source === "meta_live" ? "meta_live" : "fallback_fixture",
    createdAt: new Date().toISOString(),
  };
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveTreasure(t) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(t);
    tx.oncomplete = () => resolve(t);
    tx.onerror = () => reject(tx.error);
  });
}

export async function listTreasures() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const out = [];
    const req = db.transaction(STORE, "readonly").objectStore(STORE).openCursor();
    req.onsuccess = () => {
      const cur = req.result;
      if (cur) {
        out.push(cur.value);
        cur.continue();
      } else {
        out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        resolve(out);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function countTreasures() {
  return (await listTreasures()).length;
}
