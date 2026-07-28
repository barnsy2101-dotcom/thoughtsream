import { CATEGORIES, STOP } from './constants';

export const uid = () => 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const pairKey = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export const keywords = (text) => {
  const seen = new Set();
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter(w => w.length > 2 && !STOP.has(w) && !seen.has(w) && seen.add(w));
};

export const topicOf = (text) => {
  const kws = keywords(text);
  let best = null, bestN = 0;
  for (const [cat, list] of Object.entries(CATEGORIES)) {
    const n = kws.filter(k => list.includes(k)).length;
    if (n > bestN) { bestN = n; best = cat; }
  }
  return best;
};

export const nodeRadius = (n) => n.isHub ? 84 : n.isTopic ? 74 : clamp(34 + Math.min(n.text.length, 90) * 1.15, 42, 128);

export const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};
