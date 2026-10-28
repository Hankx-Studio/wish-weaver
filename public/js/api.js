import { WISH_TIMEOUT_MS } from './config.js';

export class ApiError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind;
  }
}

export function friendlyMessage(err) {
  if (err instanceof ApiError) {
    if (err.kind === 'offline') return '連不上精靈花庭。請檢查網路後再試一次。';
    if (err.kind === 'timeout') return '精靈回應得有點慢，再試一次好嗎？';
    if (err.kind === 'rate') return '心意送得太快了，精靈請你稍等一下再試。';
    if (err.kind === 'bad') return '這句心意好像有點問題，換句話再試試。';
  }
  return '發生了一點小狀況，再試一次好嗎？';
}

async function postJson(path, body, { timeoutMs = WISH_TIMEOUT_MS, fetchImpl = fetch } = {}) {
  const ctrl = new AbortController();
  let onTimeout;
  const timeoutP = new Promise((_, reject) => {
    onTimeout = setTimeout(() => {
      ctrl.abort();
      reject(new ApiError('timeout', 'timeout'));
    }, timeoutMs);
  });
  let res;
  try {
    res = await Promise.race([
      fetchImpl(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      }),
      timeoutP,
    ]);
  } catch (e) {
    if (e?.name === 'AbortError') throw new ApiError('timeout', 'timeout');
    if (e instanceof ApiError) throw e;
    throw new ApiError('offline', 'offline');
  } finally {
    clearTimeout(onTimeout);
  }
  if (res.status === 429) throw new ApiError('rate', 'rate limited');
  if (res.status === 400 || res.status === 413) throw new ApiError('bad', `bad ${res.status}`);
  if (!res.ok) throw new ApiError('offline', `http ${res.status}`);
  return res.json();
}

export function sendWish(ritual, wish, opts = {}) {
  return postJson('/api/wish', { ritual, wish }, opts);
}

export async function getHealth({ fetchImpl = fetch } = {}) {
  try {
    const res = await fetchImpl('/api/health');
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
