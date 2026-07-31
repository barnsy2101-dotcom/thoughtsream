import { LS_SESSIONS, LS_PROJECTS } from './constants';
import { uid } from './helpers';

export const loadStore = () => { 
  try { 
    return JSON.parse(localStorage.getItem(LS_SESSIONS)) || {}; 
  } catch { 
    return {}; 
  } 
};

export const saveStore = (s) => localStorage.setItem(LS_SESSIONS, JSON.stringify(s));

export const loadProjects = () => {
  try {
    return JSON.parse(localStorage.getItem(LS_PROJECTS)) || [];
  } catch {
    return [];
  }
};

export const saveProjects = (projects) => localStorage.setItem(LS_PROJECTS, JSON.stringify(projects));

export const createProject = (name) => {
  const newProject = { id: uid(), name, created: Date.now() };
  const projects = loadProjects();
  projects.push(newProject);
  saveProjects(projects);
  return newProject;
};

export const blankWorld = (projectId = null, name = 'Untitled Canvas') => ({
  id: uid(),
  projectId,
  name,
  nodes: [],
  links: [],
  suggestions: [],
  rejected: [],
  updated: Date.now(),
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
