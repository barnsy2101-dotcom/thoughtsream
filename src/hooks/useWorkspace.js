import { useCallback } from 'react';
import { useStore } from '../store/useStore';
import { LS_CURRENT } from '../utils/constants';
import { fitViewForNodes } from '../utils/physics';
import { uid, nodeRadius } from '../utils/helpers';
import { 
  loadStore, saveStore, blankWorld, pickNode, hydrateNode, 
  loadProjects, saveProjects 
} from '../utils/storage';

export function useWorkspace({ 
  worldRef, viewRef, undoStack, redoStack, lastAIHashRef, 
  setActiveWorldId, bump, setSessionsRev, setModalId, 
  setActiveLink, setLinkFrom, setSelIds, setReplayIdx, 
  setTargetId, setActiveTopic, setTopicMenuOpen, setMenuOpen, 
  setInput, setDrawerOpen 
}) {

  const persist = useCallback(() => {
    const w = worldRef.current;
    if (!w) return;
    const store = loadStore();
    store[w.id] = {
      id: w.id,
      projectId: w.projectId || null,
      name: w.name || 'Untitled Canvas',
      updated: w.updated || Date.now(),
      nodes: w.nodes ? w.nodes.map(pickNode) : [],
      links: w.links || [],
      rejected: w.rejected || [],
    };
    saveStore(store);
    localStorage.setItem(LS_CURRENT, w.id);
  }, [worldRef]);

  const getUniqueCanvasName = (desiredName, currentId = null) => {
    const store = loadStore();
    const existingNames = Object.values(store)
      .filter(s => s.id !== currentId)
      .map(s => s.name || '');
    if (!existingNames.includes(desiredName)) return desiredName;
    let counter = 1;
    while (existingNames.includes(`${desiredName} (${counter})`)) counter++;
    return `${desiredName} (${counter})`;
  };

  const switchWorld = (w) => {
    // Save immediately to localStorage so the Header can find it
    const store = loadStore();
    store[w.id] = {
      id: w.id,
      projectId: w.projectId || null,
      name: w.name || 'Untitled Canvas',
      updated: w.updated || Date.now(),
      nodes: w.nodes ? w.nodes.map(pickNode) : [],
      links: w.links || [],
      rejected: w.rejected || [],
    };
    saveStore(store);
    localStorage.setItem(LS_CURRENT, w.id);

    worldRef.current = w;
    viewRef.current = fitViewForNodes(w.nodes);
    undoStack.current = [];
    redoStack.current = [];
    lastAIHashRef.current = '';

    setModalId(null);
    setActiveLink(null);
    setLinkFrom(null);
    setSelIds(new Set());
    setReplayIdx(null);
    setTargetId(null);
    setActiveTopic(null);
    setTopicMenuOpen(false);
    setMenuOpen(false);
    setInput(''); // Clear draft text from bottom input bar

    // GUARANTEE IMMEDIATE REACT UI RE-RENDER:
    setActiveWorldId(w.id);
    bump();
    setSessionsRev(r => r + 1);
  };

  const newCanvas = (projectId = null) => {
    const safeProjectId = (typeof projectId === 'string') ? projectId : null;
    const newW = blankWorld();
    newW.name = 'Untitled Canvas';
    newW.projectId = safeProjectId;
    switchWorld(newW);

    setTimeout(() => {
      const titleInput = document.getElementById('canvas-title-input');
      if (titleInput) {
        titleInput.focus();
        titleInput.select();
      }
    }, 50);
  };

  const openSession = (id) => {
    const s = loadStore()[id];
    if (!s) return;
    const w = { ...blankWorld(), ...s };
    w.nodes = w.nodes.map(hydrateNode);
    w.nodes.forEach(n => { n.r = nodeRadius(n); });
    switchWorld(w);
    setDrawerOpen(false);
  };

  const renameSession = (id, name) => {
    const uniqueName = getUniqueCanvasName(name, id);
    const store = loadStore();
    if (store[id]) { store[id].name = uniqueName; saveStore(store); }
    if (worldRef.current.id === id) worldRef.current.name = uniqueName;
    setSessionsRev(r => r + 1); bump();
  };

  const duplicateSession = (id) => {
    const store = loadStore();
    const orig = store[id];
    if (!orig) return;
    const dup = {
      ...orig,
      id: uid(),
      name: `${orig.name} (Copy)`,
      updated: Date.now(),
    };
    store[dup.id] = dup;
    saveStore(store);
    setSessionsRev(r => r + 1);
    bump();
  };

  const deleteSession = (id) => {
    const store = loadStore();
    delete store[id]; saveStore(store);
    if (worldRef.current.id === id) worldRef.current = blankWorld();
    setSessionsRev(r => r + 1); bump();
  };

  const renameProject = (id, name) => {
    const projs = loadProjects();
    const p = projs.find(x => x.id === id);
    if (p) {
      p.name = name;
      saveProjects(projs);
      useStore.getState().setProjects(projs);
      bump();
    }
  };

  const deleteProjectHandler = (id) => {
    const projs = loadProjects().filter(p => p.id !== id);
    saveProjects(projs);
    useStore.getState().setProjects(projs);
    
    const store = loadStore();
    let updated = false;
    for (const key in store) {
      if (store[key].projectId === id) {
        store[key].projectId = null;
        updated = true;
      }
    }
    if (updated) {
      saveStore(store);
      setSessionsRev(r => r + 1);
    }
    bump();
  };

  const moveCanvasToProject = (canvasId, projectId) => {
    const store = loadStore();
    if (store[canvasId]) {
      store[canvasId].projectId = projectId;
      saveStore(store);
      if (worldRef.current.id === canvasId) worldRef.current.projectId = projectId;
      setSessionsRev(r => r + 1);
      bump();
    }
  };
  
  const tsSwitchToToday = () => {
    if (worldRef.current.name === "Today's Stream") return; // already there
    const store = loadStore();
    let todayId = null;
    for (const id in store) {
      if (store[id].name === "Today's Stream") { todayId = id; break; }
    }
    if (todayId) {
      openSession(todayId);
    } else {
      const newW = blankWorld();
      newW.name = "Today's Stream";
      switchWorld(newW);
    }
  };

  // Bind to window for global access (as in original App.jsx)
  if (typeof window !== 'undefined') {
    window.tsSwitchToToday = tsSwitchToToday;
  }

  return {
    persist,
    getUniqueCanvasName,
    switchWorld,
    newCanvas,
    openSession,
    renameSession,
    duplicateSession,
    deleteSession,
    renameProject,
    deleteProjectHandler,
    moveCanvasToProject,
    tsSwitchToToday
  };
}
