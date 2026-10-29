import OpenAI from 'openai';

// Server-only Meta client. No hardcoded model ids or URLs — all from env.
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing env ${name}`);
  return v;
}

export function metaClient(): OpenAI {
  return new OpenAI({
    baseURL: required('META_API_BASE_URL'),
    apiKey: required('META_API_KEY'),
  });
}

export function metaModel(kind: 'INTENT' | 'IMAGE' | 'SEGMENT' | 'AUDIO'): string {
  return required(`META_MODEL_${kind}`);
}
