// SAM 3.1 wire parser + mask decoder (documented grammar; `~`=lossless,
// `!`=one_bit). Pure functions (no fetch/DOM) shared by node + browser.
// Undecodable output yields null so callers fall back to the box crop.
const FRAME_RE = /<(\d+)f(?:;[^>]*)?>/;
const RECORD_RE = /,?(\d+)((?:<\|[^|]*\|>)+)/g;
const TOKEN_RE = /<\|([A-Za-z][\w.-]*)(?:;([^|]*))?\|>/g;
const MASK_DATA_RE = /^(\d+),(\d+),([!~][\s\S]+)$/;

export function parseSamOutput(text) {
  const records = [];
  const warnings = [];
  for (const line of String(text || "").split("\n")) {
    const frame = line.match(FRAME_RE);
    if (!frame) continue;
    const rest = line.slice(frame.index + frame[0].length);
    for (const m of rest.matchAll(RECORD_RE)) {
      const rec = parseRecord(Number(m[1]), Number(frame[1]), m[2]);
      if (rec) records.push(rec);
      else warnings.push(`skip malformed record id=${m[1]}`);
    }
  }
  return { records, warnings };
}

function fieldsOf(body) {
  const out = new Map();
  for (const part of String(body || "").split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    out.set(part.slice(0, i).trim(), part.slice(i + 1).trim());
  }
  return out;
}

function parseInts(f, keys) {
  const vals = keys.map((k) => Number(f.get(k)));
  if (!vals.every((v) => Number.isInteger(v))) return null;
  return vals;
}

function parseBox(body) {
  const v = parseInts(fieldsOf(body), ["x1", "y1", "x2", "y2", "w", "h"]);
  if (!v) return null;
  const [x1, y1, x2, y2, w, h] = v;
  if (!(x2 > x1 && y2 > y1 && w > 0 && h > 0)) return null;
  const c = parseConf(fieldsOf(body).get("c"));
  return { x1, y1, x2, y2, w, h, ...(c === undefined ? {} : { c }) };
}

function parseMask(body) {
  const f = fieldsOf(body);
  const m = String(f.get("data") || "").match(MASK_DATA_RE);
  if (!m) return null;
  const h = Number(m[1]);
  const w = Number(m[2]);
  if (!Number.isSafeInteger(h) || !Number.isSafeInteger(w)) return null;
  if (h <= 0 || w <= 0 || !Number.isSafeInteger(h * w)) return null;
  const c = parseConf(f.get("c"));
  return {
    h, w,
    encoding: m[3][0] === "!" ? "one_bit" : "lossless",
    payload: m[3],
    ...(c === undefined ? {} : { c }),
  };
}

function parseConf(raw) {
  if (raw === undefined) return undefined;
  const v = Number(raw);
  return Number.isFinite(v) && v >= 0 && v <= 1 ? v : undefined;
}

function parseRecord(id, frame, chunk) {
  let box = null;
  let mask = null;
  for (const t of chunk.matchAll(TOKEN_RE)) {
    if (t[1] === "box") box = parseBox(t[2]);
    else if (t[1] === "mask") mask = parseMask(t[2]);
  }
  if (!box || !mask) return null;
  return { id, frame, box, mask };
}

export function boxArea(box) {
  return (box.x2 - box.x1) * (box.y2 - box.y1);
}

export function clampBox(box) {
  const x1 = Math.max(0, Math.min(box.x1, box.w));
  const y1 = Math.max(0, Math.min(box.y1, box.h));
  const x2 = Math.max(0, Math.min(box.x2, box.w));
  const y2 = Math.max(0, Math.min(box.y2, box.h));
  return { ...box, x1, y1, x2: Math.max(x2, x1 + 1), y2: Math.max(y2, y1 + 1) };
}

// Best record = decodable mask wins, then largest box area.
export function pickBest(records) {
  let best = null;
  for (const r of records || []) {
    const area = boxArea(r.box);
    if (!(area > 0)) continue;
    const raster = decodeMaskSafe(r.mask);
    const rank = (raster ? 1e15 : 0) + area;
    if (!best || rank > best.rank) best = { record: r, raster, rank };
  }
  if (!best) return null;
  const { record, raster } = best;
  return { id: record.id, frame: record.frame, box: record.box, mask: record.mask, raster };
}

export function decodeMaskSafe(mask) {
  try {
    return decodeMask(mask);
  } catch {
    return null;
  }
}

export function decodeMask(mask) {
  if (!mask || typeof mask.payload !== "string") throw new Error("bad mask");
  const { payload, w, h } = mask;
  if (mask.encoding === "one_bit") return decodeOneBit(payload, w, h);
  return decodeLossless(payload, w, h);
}
// FNV-1a hex of the payload: dedup key.
export function maskHash(payload) {
  let v = 0x811c9dc5;
  for (let i = 0; i < payload.length; i += 1) {
    v ^= payload.charCodeAt(i);
    v = Math.imul(v, 0x01000193) >>> 0;
  }
  return v.toString(16).padStart(8, "0");
}

export function maskPreview(payload, n = 64) {
  return String(payload || "").slice(0, n);
}

// Custom base85: 5-char length prefix, 5 chars per 4 bytes.
const B85 = (() => {
  let s = "";
  for (let c = 0x21; c <= 0x7e; c += 1) {
    const ch = String.fromCharCode(c);
    if (!'"\\,;<>|'.includes(ch)) s += ch;
  }
  return s;
})();
const B85V = new Int16Array(128).fill(-1);
for (let i = 0; i < B85.length; i += 1) B85V[B85.charCodeAt(i)] = i;

function b85d(ch) {
  const c = ch.charCodeAt(0);
  const v = c < 128 ? B85V[c] : -1;
  if (v < 0) throw new Error("bad base85 char");
  return v;
}

function b85unpack(payload) {
  if (payload.length < 5) throw new Error("short payload");
  let len = 0;
  for (let i = 0; i < 5; i += 1) len = len * 85 + b85d(payload[i]);
  const rem = len % 4;
  const want = 5 + Math.floor(len / 4) * 5 + (rem === 0 ? 0 : rem + 1);
  if (payload.length !== want) throw new Error("length mismatch");
  const out = new Uint8Array(len);
  let src = 5;
  let dst = 0;
  const full = len - rem;
  for (; dst < full; dst += 4) {
    let v = 0;
    for (let i = 0; i < 5; i += 1) v = v * 85 + b85d(payload[src + i]);
    if (v > 0xffffffff) throw new Error("group overflow");
    src += 5;
    out[dst] = (v >>> 24) & 0xff;
    out[dst + 1] = (v >>> 16) & 0xff;
    out[dst + 2] = (v >>> 8) & 0xff;
    out[dst + 3] = v & 0xff;
  }
  if (rem > 0) {
    let v = 0;
    for (let i = 0; i < 5; i += 1) {
      v = v * 85 + (i < rem + 1 ? b85d(payload[src + i]) : 84);
    }
    if (v > 0xffffffff) throw new Error("tail overflow");
    for (let i = 0; i < rem; i += 1) {
      out[dst + i] = (v >>> (24 - i * 8)) & 0xff;
    }
  }
  return out;
}
// Adaptive binary range decoder (shared by both encodings).
function makeRangeDecoder(input) {
  if (input.length < 4) throw new Error("no finalization");
  let pos = 0;
  let low = 0;
  let range = 0xffffffff;
  let code = 0;
  let scaled = 0;
  const read = () => {
    if (pos >= input.length) throw new Error("truncated stream");
    return input[pos++];
  };
  for (let i = 0; i < 4; i += 1) code = ((code << 8) | read()) >>> 0;
  function freq(total) {
    scaled = Math.floor(range / total);
    if (scaled === 0) throw new Error("bad coding state");
    const v = Math.floor(((code - low) >>> 0) / scaled);
    return v >= total ? total - 1 : v;
  }
  function decode(cum, f) {
    low = (low + scaled * cum) >>> 0;
    range = scaled * f;
    for (;;) {
      // Mirror the reference renormalize exactly: when the top bytes
      // already match, shift with NO remap (short-circuit); the underflow
      // remap applies only when they differ AND range < 2^16.
      if (((low ^ (low + range)) >>> 0) >= 1 << 24) {
        if (range >= 1 << 16) break;
        range = (-low >>> 0) & 0xffff;
      }
      code = ((code << 8) | read()) >>> 0;
      low = (low << 8) >>> 0;
      range = (range << 8) >>> 0;
    }
  }
  return { freq, decode };
}

function predictByte(out, off, x, y, mode, w) {
  const left = x > 0 ? out[off - 1] : 0;
  const up = y > 0 ? out[off - w] : 0;
  if (mode === 1) return up;
  if (mode === 2) return left;
  if (mode === 3) return (left + up) >> 1;
  const ul = x > 0 && y > 0 ? out[off - w - 1] : 0;
  if (mode === 0) {
    const e = left + up - ul;
    const dl = Math.abs(e - left);
    const du = Math.abs(e - up);
    return dl <= du && dl <= Math.abs(e - ul) ? left : du <= Math.abs(e - ul) ? up : ul;
  }
  if (ul >= Math.max(left, up)) return Math.min(left, up);
  if (ul <= Math.min(left, up)) return Math.max(left, up);
  return (left + up - ul) & 0xff;
}

const unzig = (v, p) => (p + (v & 1 ? -((v + 1) >> 1) : v >> 1)) & 0xff;

function zeroCtx(res, off, x, y, w) {
  const z = (a) => (a === 0 ? 1 : 0);
  const l = x > 0 ? z(res[off - 1]) : 1;
  const u = y > 0 ? z(res[off - w]) : 1;
  const ul = x > 0 && y > 0 ? z(res[off - w - 1]) : 1;
  const ur = y > 0 && x < w - 1 ? z(res[off - w + 1]) : 1;
  return l | (u << 1) | (ul << 2) | (ur << 3);
}

// One adaptive symbol: zero-flag, then a 3-model mixture for 1..255.
function decodeSymbol(dec, st, res, off, x, y, w) {
  const zo = zeroCtx(res, off, x, y, w) << 1;
  const z0 = st.zero[zo];
  const z1 = st.zero[zo + 1];
  const bit = dec.freq(z0 + z1) < z0 ? 0 : 1;
  dec.decode(bit === 0 ? 0 : z0, bit === 0 ? z0 : z1);
  st.zero[zo + bit] += 32;
  if (st.zero[zo] + st.zero[zo + 1] >= 16384) {
    st.zero[zo] = (st.zero[zo] >> 1) || 1;
    st.zero[zo + 1] = (st.zero[zo + 1] >> 1) || 1;
  }
  return bit === 1 ? decodeMixture(dec, st, res, off, w) : 0;
}

function decodeMixture(dec, st, res, off, w) {
  const above = off >= w ? res[off - w] : 0;
  const key = (st.prev << 8) | above;
  let second = st.two.get(key);
  if (!second) {
    second = new Uint16Array(257);
    st.two.set(key, second);
  }
  const fo = st.prev << 8;
  const found = searchSymbol(dec, st, second, fo);
  dec.decode(found.cum, found.f);
  bumpModels(st, second, fo, found.sym);
  return found.sym;
}

function searchSymbol(dec, st, second, fo) {
  const total = second[256] + st.oneT[st.prev] + st.zT
    - (second[0] + st.one[fo] + st.z[0]);
  const target = dec.freq(total);
  let cum = 0;
  let sym = 1;
  let f = second[1] + st.one[fo + 1] + st.z[1];
  while (cum + f <= target) {
    cum += f;
    sym += 1;
    if (sym >= 256) throw new Error("malformed symbol");
    f = second[sym] + st.one[fo + sym] + st.z[sym];
  }
  return { sym, cum, f };
}

function scaleTable(table, keepOne) {
  let t = 0;
  for (let v = 0; v < 256; v += 1) {
    table[v] = keepOne ? (table[v] >> 1) || 1 : table[v] >> 1;
    t += table[v];
  }
  return t;
}

function bumpModels(st, second, fo, sym) {
  second[sym] += 616;
  second[256] += 616;
  if (second[256] >= 50176) {
    let t = 0;
    for (let v = 0; v < 256; v += 1) {
      second[v] >>= 1;
      t += second[v];
    }
    second[256] = t;
  }
  st.one[fo + sym] += 56;
  st.oneT[st.prev] += 56;
  if (st.oneT[st.prev] >= 8192) {
    st.oneT[st.prev] = scaleTable(st.one.subarray(fo, fo + 256), true);
  }
  st.z[sym] += 32;
  st.zT += 32;
  if (st.zT >= 4096) st.zT = scaleTable(st.z, false);
}

function decodeLossless(payload, w, h) {
  if (!payload.startsWith("~")) throw new Error("not lossless");
  const packed = b85unpack(payload.slice(1));
  if (packed.length < 5) throw new Error("truncated");
  const mode = packed[0];
  if (mode < 0 || mode >= 5) throw new Error("bad predictor");
  const dec = makeRangeDecoder(packed.subarray(1));
  const n = w * h;
  const out = new Uint8Array(n);
  const res = new Uint8Array(n);
  const st = {
    zero: new Uint32Array(32).fill(1),
    one: new Uint16Array(65536).fill(1),
    oneT: new Int32Array(256).fill(256),
    z: new Uint16Array(256).fill(2),
    zT: 512,
    two: new Map(),
    prev: 0,
  };
  for (let off = 0; off < n; off += 1) {
    const x = off % w;
    const y = Math.floor(off / w);
    const sym = decodeSymbol(dec, st, res, off, x, y, w);
    res[off] = sym;
    out[off] = unzig(sym, predictByte(out, off, x, y, mode, w));
    st.prev = sym;
  }
  return out.map((v) => (v >= 129 ? 1 : 0));
}

function ctxAt(pad, p, prior, earlier) {
  return pad[p - 1] | (pad[p - 2] << 1) | (pad[prior - 2] << 2)
    | (pad[prior - 1] << 3) | (pad[prior] << 4) | (pad[prior + 1] << 5)
    | (pad[prior + 2] << 6) | (pad[earlier - 2] << 7)
    | (pad[earlier - 1] << 8) | (pad[earlier] << 9)
    | (pad[earlier + 1] << 10) | (pad[earlier + 2] << 11);
}

function decodeOneBit(payload, w, h) {
  if (!payload.startsWith("!")) throw new Error("not one_bit");
  const dec = makeRangeDecoder(b85unpack(payload.slice(1)));
  const counts = new Uint16Array(8192).fill(1);
  const pw = w + 4;
  const pad = new Uint8Array(pw * (h + 2));
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    const row = (y + 2) * pw + 2;
    for (let x = 0; x < w; x += 1) {
      const p = row + x;
      const ctx = ctxAt(pad, p, p - pw, p - 2 * pw);
      const off = ctx << 1;
      const z = counts[off];
      const o = counts[off + 1];
      const bit = dec.freq(z + o) < z ? 0 : 1;
      dec.decode(bit === 0 ? 0 : z, bit === 0 ? z : o);
      pad[p] = bit;
      out[y * w + x] = bit;
      counts[off + bit] += 14;
      if (counts[off] + counts[off + 1] >= 4096) {
        counts[off] = (counts[off] >> 1) || 1;
        counts[off + 1] = (counts[off + 1] >> 1) || 1;
      }
    }
  }
  return out;
}
