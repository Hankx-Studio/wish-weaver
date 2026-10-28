// Voice wish: record (MediaRecorder) → mono 16-bit 24kHz WAV → /api/transcribe.
// The transcript fills the wish box for player confirmation; nothing
// auto-sends. Empty transcripts are a normal, friendly retry — not an error.
import { MAX_WISH_LEN } from './config.js';

export const VOICE_MAX_SEC = 30;

export function voiceSupported() {
  return Boolean(navigator?.mediaDevices?.getUserMedia && window?.MediaRecorder);
}

// Records until stop() is called or VOICE_MAX_SEC elapses. Resolves {blob, stop}.
export async function startRecording({ maxSec = VOICE_MAX_SEC } = {}) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
  const done = new Promise((resolve) => { rec.onstop = () => resolve(); });
  rec.start();
  const timer = setTimeout(() => { if (rec.state !== 'inactive') rec.stop(); }, maxSec * 1000);
  return {
    stop: async () => {
      clearTimeout(timer);
      if (rec.state !== 'inactive') rec.stop();
      await done;
      stream.getTracks().forEach((t) => t.stop());
      return new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
    },
  };
}

// Pure PCM → WAV encoder (node-testable; no browser APIs).
export function encodeWavMono16(samples, sampleRate) {
  const n = samples.length;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const ascii = (o, s) => { for (let i = 0; i < s.length; i += 1) v.setUint8(o + i, s.charCodeAt(i)); };
  ascii(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); ascii(8, 'WAVE');
  ascii(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, 1, true); v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  ascii(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buf;
}

function mixMono(data, rate, target = 24000) {
  const chs = data.numberOfChannels;
  const len = data.length;
  const mono = new Float32Array(len);
  for (let c = 0; c < chs; c += 1) {
    const d = data.getChannelData(c);
    for (let i = 0; i < len; i += 1) mono[i] += d[i] / chs;
  }
  if (rate === target) return mono;
  const outLen = Math.floor((len * target) / rate);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i += 1) {
    const pos = (i * len) / outLen;
    const lo = Math.floor(pos);
    const frac = pos - lo;
    out[i] = mono[lo] * (1 - frac) + (mono[Math.min(len - 1, lo + 1)] * frac);
  }
  return out;
}

// Browser-only: decode any recorded blob, resample to 24kHz mono WAV.
export async function blobToWav24k(blob) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ac = new AC();
  try {
    const decoded = await ac.decodeAudioData(await blob.arrayBuffer());
    const mono = mixMono(decoded, decoded.sampleRate);
    const trimmed = mono.slice(0, VOICE_MAX_SEC * 24000);
    return new Blob([encodeWavMono16(trimmed, 24000)], { type: 'audio/wav' });
  } finally {
    ac.close().catch(() => {});
  }
}

export async function sendVoice(wavBlob, { fetchImpl = fetch, timeoutMs = 30000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const form = new FormData();
    form.set('audio', wavBlob, 'wish.wav');
    const res = await fetchImpl('/api/transcribe', { method: 'POST', body: form, signal: ctrl.signal });
    if (!res.ok && res.status !== 200) throw new Error(`http ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

export function applyTranscriptToBox(textarea, count, text) {
  const t = (text || '').slice(0, MAX_WISH_LEN);
  textarea.value = t;
  if (count) count.textContent = String(t.length);
  return t;
}
