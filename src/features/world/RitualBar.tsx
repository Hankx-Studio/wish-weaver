'use client';

import { useEffect, useRef, useState } from 'react';

type Recognition = {
  lang: string;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getRecognition(): (new () => Recognition) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown & {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const PRESET_CHIPS = ['Bless this meal', 'Thank you for today', 'Good night'];

// Local spell input: typing, preset chips, or browser speech recognition.
// Everything resolves through local presets (local_rule); no API involved.
export default function RitualBar({ onCast }: { onCast: (text: string) => void }) {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false);
  const recRef = useRef<Recognition | null>(null);
  const castRef = useRef(onCast);
  castRef.current = onCast;

  useEffect(() => {
    setVoiceReady(getRecognition() !== null);
    return () => {
      try {
        recRef.current?.stop();
      } catch {
        // Already stopped.
      }
    };
  }, []);

  const submit = (value: string) => {
    const t = value.trim();
    if (!t) return;
    castRef.current(t);
    setText('');
  };

  const toggleVoice = () => {
    const Ctor = getRecognition();
    if (!Ctor) return;
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new Ctor();
    rec.lang = 'en-US';
    rec.onresult = (e) => {
      const said = e.results[0]?.[0]?.transcript ?? '';
      if (said.trim()) castRef.current(said.trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  const chip: React.CSSProperties = {
    padding: '0.45rem 0.8rem',
    fontSize: '0.82rem',
    borderRadius: '999px',
    border: '1px solid #2c423b',
    backgroundColor: 'transparent',
    color: '#cfc8b4',
    cursor: 'pointer',
  };
  const input: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    padding: '0.7rem 0.9rem',
    fontSize: '0.95rem',
    borderRadius: '8px',
    border: '1px solid #2c423b',
    backgroundColor: '#0d1210',
    color: '#f4efe4',
  };
  const castBtn: React.CSSProperties = {
    padding: '0.7rem 1.2rem',
    fontSize: '0.95rem',
    fontWeight: 600,
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#d9b36a',
    color: '#191510',
    cursor: 'pointer',
    minHeight: '48px',
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.6rem' }}>
        <input
          aria-label="Speak or type a spell"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit(text);
          }}
          placeholder="Speak or type a spell…"
          maxLength={120}
          style={input}
        />
        {voiceReady && (
          <button
            aria-label={listening ? 'Stop listening' : 'Speak a spell'}
            onClick={toggleVoice}
            style={{
              ...castBtn,
              backgroundColor: listening ? '#b0563f' : 'transparent',
              color: listening ? '#fff' : '#d9b36a',
              border: listening ? 'none' : '1px solid #d9b36a',
              padding: '0.7rem 0.9rem',
            }}
          >
            {listening ? '■' : '●'}
          </button>
        )}
        <button onClick={() => submit(text)} style={castBtn}>
          Cast
        </button>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
        {PRESET_CHIPS.map((c) => (
          <button key={c} onClick={() => submit(c)} style={chip}>
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
