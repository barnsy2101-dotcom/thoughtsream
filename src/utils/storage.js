import { LS_SESSIONS } from './constants';
import { uid } from './helpers';

export const loadStore = () => { 
  try { 
    return JSON.parse(localStorage.getItem(LS_SESSIONS)) || {}; 
  } catch { 
    return {}; 
  } 
};

export const saveStore = (s) => localStorage.setItem(LS_SESSIONS, JSON.stringify(s));

export const blankWorld = () => ({
  id: uid(), name: 'Untitled Stream', nodes: [], links: [], suggestions: [], rejected: [], updated: Date.now(),
});

export const pickNode = ({ id, text, notes, color, x, y, isHub, title, created, collapsed, isQuestion, pinned, isTopic, topicId, released, offsetX, offsetY }) =>
  ({ id, text, notes, color, x: Math.round(x), y: Math.round(y), isHub, title, created, collapsed, isQuestion, pinned, isTopic, topicId, released, offsetX, offsetY });

export const serializeWorld = (w) => JSON.stringify({ nodes: w.nodes.map(pickNode), links: w.links, rejected: w.rejected });

export const hydrateNode = (n, i) => ({
  notes: '', color: 0, title: undefined, collapsed: false, isQuestion: false, pinned: false, isTopic: false, topicId: null,
  released: true, offsetX: undefined, offsetY: undefined,
  ...n,
  created: n.created || i, vx: 0, vy: 0, floating: false, r: 0,
});
