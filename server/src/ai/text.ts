export function sanitizeTitle(value: string) {
  return value.trim().slice(0, 100);
}

export function detectLanguage(values: string[]): "he" | "en" | "unknown" {
  const sample = values.join(" ");
  const hebrewChars = (sample.match(/[\u0590-\u05FF]/g) ?? []).length;
  const latinChars = (sample.match(/[A-Za-z]/g) ?? []).length;
  if (hebrewChars === 0 && latinChars === 0) return "unknown";
  return hebrewChars >= latinChars ? "he" : "en";
}

export function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildHashEmbedding(text: string, dimensions: number) {
  const vector = new Array<number>(dimensions).fill(0);
  const tokens = normalizeText(text).split(" ").filter(Boolean);

  for (const token of tokens) {
    let hash = 0;
    for (let i = 0; i < token.length; i += 1) {
      hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
    }
    const index = hash % dimensions;
    vector[index] += 1;
  }

  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!norm) return vector;

  return vector.map((value) => value / norm);
}

export function cosineSimilarity(a: number[], b: number[]) {
  if (!a.length || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
  }
  return dot;
}

export function chunkText(text: string, maxChunkLength = 320) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  if (normalized.length <= maxChunkLength) return [normalized];

  const sentences = normalized.split(/(?<=[.!?])\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (!current) {
      current = sentence;
      continue;
    }

    if (`${current} ${sentence}`.length <= maxChunkLength) {
      current = `${current} ${sentence}`;
      continue;
    }

    chunks.push(current);
    current = sentence;
  }

  if (current) chunks.push(current);
  return chunks.length ? chunks : [normalized.slice(0, maxChunkLength)];
}

export function looksEnglish(value: string) {
  const compact = value.replace(/\s+/g, "");
  if (!compact) return false;
  const latin = (compact.match(/[A-Za-z]/g) ?? []).length;
  return latin / compact.length >= 0.45;
}

export function hasCorruptedText(value: string) {
  return /�|׳³|ן¿½/.test(value);
}
