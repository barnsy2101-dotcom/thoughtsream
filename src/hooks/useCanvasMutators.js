import { useCallback } from 'react';
import { useStore } from '../store/useStore';
import { uid, pairKey, topicOf, nodeRadius, keywords } from '../utils/helpers';
import { COLORS, CATEGORIES, TOPIC_ACCENT } from '../utils/constants';
import { hydrateNode, serializeWorld } from '../utils/storage';

export function useCanvasMutators({
  worldRef, viewRef, undoStack, redoStack, nodeBounds, bump, persist,
  callAI,
  setModalId, setActiveLink, setSelIds, setTargetId, setActiveTopic,
  setVacuumTopicId, setVacuumSelectedIds
}) {

  const screenToWorld = (sx, sy) => {
    const v = viewRef.current;
    return { x: (sx - v.x) / v.s, y: (sy - v.y) / v.s };
  };
  const byId = (id) => worldRef.current.nodes.find(n => n.id === id);

  /* ---------- undo / redo ---------- */
  const pushUndo = useCallback(() => {
    undoStack.current.push(serializeWorld(worldRef.current));
    if (undoStack.current.length > 60) undoStack.current.shift();
    redoStack.current = [];
  }, []);
  const restoreSnapshot = (snap) => {
    const data = JSON.parse(snap);
    const w = worldRef.current;
    w.nodes = data.nodes.map(hydrateNode);
    w.nodes.forEach(n => { n.r = nodeRadius(n); });
    w.links = data.links;
    w.updated = Date.now();
    setModalId(null); setActiveLink(null); setSelIds(new Set()); setTargetId(null);
    bump();
  };
  const undo = useCallback(() => {
    if (!undoStack.current.length) return;
    redoStack.current.push(serializeWorld(worldRef.current));
    restoreSnapshot(undoStack.current.pop());
  }, []);
  const redo = useCallback(() => {
    if (!redoStack.current.length) return;
    undoStack.current.push(serializeWorld(worldRef.current));
    restoreSnapshot(redoStack.current.pop());
  }, []);

  /* ---------- particle bursts ---------- */
  const spawnBurst = useCallback((x, y, opts = {}) => {
    const w = worldRef.current;
    if (!w.bursts) w.bursts = [];
    const burstId = uid();
    w.bursts.push({ id: burstId, x, y, ...opts });
    setTimeout(() => {
      const w2 = worldRef.current;
      w2.bursts = (w2.bursts || []).filter(b => b.id !== burstId);
      bump();
    }, opts.big ? 700 : 700);
    bump();
  }, []);

  /* ---------- topics (manual gravity clusters, no links) ---------- */
  const createTopic = useCallback((name) => {
    name = (name || '').trim();
    if (!name) return null;
    const w = worldRef.current;
    const existing = w.nodes.find(n => (n.isTopic || n.isHub) && n.title && n.title.toLowerCase() === name.toLowerCase());
    if (existing) return existing;
    pushUndo();
    const spawn = screenToWorld(window.innerWidth / 2 + (Math.random() * 120 - 60), window.innerHeight * 0.42);
    const t = {
      id: uid(), isTopic: true, title: name, text: name, notes: '', color: 2,
      x: spawn.x, y: spawn.y, vx: 0, vy: 0, floating: false,
      isHub: false, collapsed: false, isQuestion: false, pinned: false, topicId: null,
      created: Date.now(),
    };
    t.r = nodeRadius(t);
    w.nodes.push(t);
    setActiveTopic(t.id);
    spawnBurst(spawn.x, spawn.y, { color: TOPIC_ACCENT });
    w.updated = Date.now();
    bump();
    return t;
  }, []);

  const toggleVacuumPreview = useCallback(async (topicNode) => {
    if (useStore.getState().vacuumTopicId === topicNode.id) {
      setVacuumTopicId(null);
      setVacuumSelectedIds(new Set());
      return;
    }
    const w = worldRef.current;
    const loose = w.nodes.filter(n => !n.isTopic && !n.isHub && !n.topicId && n.text.trim());
    if (loose.length === 0) return;

    const topTitle = (topicNode.title || '').toLowerCase();
    const topKws = keywords(topicNode.title || '');
    const catKws = CATEGORIES[topicNode.title] || [];
    
    // Fast keyword & category matching
    const fastMatches = new Set();
    for (const n of loose) {
      const textLower = n.text.toLowerCase();
      const tKws = keywords(n.text);
      const assignedTopic = topicOf(n.text);
      
      const isDirectMatch = textLower.includes(topTitle) || (topTitle.length >= 3 && topTitle.includes(textLower));
      const isTopicOfMatch = assignedTopic && assignedTopic.toLowerCase() === topTitle;
      const isKwMatch = topKws.length > 0 && topKws.some(k => tKws.includes(k));
      const isCatMatch = catKws.length > 0 && catKws.some(k => tKws.some(tk => tk.includes(k) || k.includes(tk)));
      
      if (isDirectMatch || isTopicOfMatch || isKwMatch || isCatMatch) {
        fastMatches.add(n.id);
      }
    }
    
    setVacuumTopicId(topicNode.id);
    setVacuumSelectedIds(fastMatches);

    // AI Semantic Matching if API key is set and callAI is available
    const apiKey = useStore.getState().apiKey;
    if (apiKey && callAI) {
      try {
        const prompt = `Topic: "${topicNode.title}"

Analyze the following thoughts and determine which ones are semantically relevant to the topic "${topicNode.title}".

Thoughts (id: text):
${loose.map(n => `${n.id}: ${n.text}`).join('\n')}

Rules:
- Only include thought ids that actually relate to "${topicNode.title}".
- EXCLUDE completely unrelated thoughts (e.g. daily logs vs tech topics).`;

        const schema = {
          type: 'object',
          properties: {
            matchingIds: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          required: ['matchingIds'],
          additionalProperties: false
        };

        const res = await callAI(prompt, schema);
        if (res && Array.isArray(res.matchingIds)) {
          const validLooseIds = new Set(loose.map(l => l.id));
          const aiMatches = new Set(res.matchingIds.filter(id => validLooseIds.has(id)));
          setVacuumSelectedIds(aiMatches);
        }
      } catch (e) {
        console.warn('Vacuum AI semantic check failed, using keyword matches:', e);
      }
    }
  }, [callAI]);

  const confirmVacuum = useCallback(() => {
    if (!useStore.getState().vacuumTopicId) return;
    const topicId = useStore.getState().vacuumTopicId;
    const targetTopic = byId(topicId);
    const selectedIds = new Set(useStore.getState().vacuumSelectedIds || []);
    if (selectedIds.size === 0) {
      setVacuumTopicId(null);
      setVacuumSelectedIds(new Set());
      return;
    }
    pushUndo();
    const w = worldRef.current;
    const existingMembers = w.nodes.filter(m => m.topicId === topicId);
    let memberIndex = existingMembers.length;
    const totalNew = selectedIds.size + existingMembers.length;
    for (const n of w.nodes) {
      if (selectedIds.has(n.id) && !n.isTopic && !n.isHub) {
        n.topicId = topicId;
        n.sleeping = false;
        n.userMoved = false;
        const angle = (memberIndex / Math.max(1, totalNew)) * Math.PI * 2;
        const R = (targetTopic ? targetTopic.r : 74) + n.r + 65 + (memberIndex % 2) * (totalNew > 4 ? 35 : 0);
        n.offsetX = Math.round(Math.cos(angle) * R);
        n.offsetY = Math.round(Math.sin(angle) * R);
        
        if (targetTopic) {
          n.x = targetTopic.x + n.offsetX;
          n.y = targetTopic.y + n.offsetY;
          n.vx = 0;
          n.vy = 0;
        }
        
        memberIndex++;
        spawnBurst(n.x, n.y);
      }
    }
    if (targetTopic) {
      spawnBurst(targetTopic.x, targetTopic.y, { color: TOPIC_ACCENT, big: true });
    }
    w.updated = Date.now();
    setVacuumTopicId(null);
    setVacuumSelectedIds(new Set());
    bump();
    persist();
    document.getElementById('thought-input')?.focus();
  }, [pushUndo, bump]);

  const cancelVacuum = useCallback(() => {
    setVacuumTopicId(null);
    setVacuumSelectedIds(new Set());
    document.getElementById('thought-input')?.focus();
  }, []);

  const executeManualPull = useCallback((targetTopicId) => {
    const selectedIds = useStore.getState().selIds;
    if (selectedIds.size === 0) return;
    const w = worldRef.current;
    const targetTopic = w.nodes.find(n => n.id === targetTopicId);
    if (!targetTopic) return;
    
    let memberIndex = 0;
    const looseSelected = Array.from(selectedIds).map(id => w.nodes.find(n => n.id === id)).filter(n => n && !n.isTopic && !n.isHub);
    
    for (const n of looseSelected) {
      n.topicId = targetTopicId;
      n.sleeping = false;
      n.userMoved = false;
      n.pinned = false;
      const angle = Math.random() * Math.PI * 2;
      const R = targetTopic.r + n.r + 30;
      n.offsetX = Math.round(Math.cos(angle) * R);
      n.offsetY = Math.round(Math.sin(angle) * R);
      n.x = targetTopic.x + n.offsetX;
      n.y = targetTopic.y + n.offsetY;
      n.vx = 0; 
      n.vy = 0;
      
      n.isPulling = false;
    }
    
    setSelIds(new Set());
    w.updated = Date.now();
    bump();
  }, [bump]);

  /* ---------- links ---------- */
  const createLink = (a, b, skipUndo, opts = {}) => {
    const w = worldRef.current;
    if (a === b) return;
    const k = pairKey(a, b);
    if (w.links.some(l => pairKey(l.a, l.b) === k)) return;
    if (!skipUndo) pushUndo();
    w.links.push({ id: uid(), a, b, ...opts });
    w.updated = Date.now();
    bump();
  };
  const unlink = (id) => {
    pushUndo();
    const w = worldRef.current;
    w.links = w.links.filter(l => l.id !== id);
    setActiveLink(null); w.updated = Date.now(); bump(); persist();
  };
  const deleteNodes = (ids) => {
    pushUndo();
    const w = worldRef.current;
    const set = ids instanceof Set ? ids : new Set([ids]);
    if (useStore.getState().targetId && set.has(useStore.getState().targetId)) setTargetId(null);
    w.nodes.filter(n => set.has(n.id)).forEach(n => {
      const col = n.isHub ? '#EAEAEA' : (COLORS[n.color % COLORS.length].dot);
      spawnBurst(n.x, n.y, { big: true, color: col === '#737373' ? '#EAEAEA' : col, r: n.r });
    });
    w.nodes = w.nodes.filter(n => !set.has(n.id));
    w.links = w.links.filter(l => !set.has(l.a) && !set.has(l.b));
    w.nodes.forEach(n => { if (n.topicId && set.has(n.topicId)) n.topicId = null; });
    if (useStore.getState().activeTopic && set.has(useStore.getState().activeTopic)) setActiveTopic(null);

    // Clean up AI topic suggestions if underlying thoughts no longer exist
    const looseNodeIds = new Set(w.nodes.filter(n => !n.isTopic && !n.isHub && !n.topicId).map(n => n.id));
    const currentSuggs = useStore.getState().aiTopicSuggestions;
    if (currentSuggs.length > 0) {
      useStore.getState().setAiTopicSuggestions(
        currentSuggs.filter(sugg => sugg.thoughtIds && sugg.thoughtIds.some(id => looseNodeIds.has(id)))
      );
    }

    w.updated = Date.now();
    setModalId(null); setSelIds(new Set()); bump(); persist();
  };

  const moveNodeAndChildrenToTopic = useCallback((nodeId, targetTopicId) => {
    const w = worldRef.current;
    const groupIds = new Set([nodeId]);
    
    // Recursively find all downstream connected bubbles
    const addDescendants = (parentId) => {
      w.links.forEach(l => {
        if (l.a === parentId && !groupIds.has(l.b)) {
          groupIds.add(l.b);
          addDescendants(l.b);
        }
      });
    };
    addDescendants(nodeId);

    const targetTopic = targetTopicId ? w.nodes.find(n => n.id === targetTopicId) : null;
    
    w.nodes.forEach(n => {
      if (groupIds.has(n.id)) {
        n.topicId = targetTopicId || null;
        if (targetTopic) {
          // INSTANT TELEPORT
          n.sleeping = false;
          n.userMoved = false;
          n.pinned = false;
          const angle = Math.random() * Math.PI * 2;
          const R = targetTopic.r + n.r + 30;
          n.offsetX = Math.round(Math.cos(angle) * R);
          n.offsetY = Math.round(Math.sin(angle) * R);
          n.x = targetTopic.x + n.offsetX;
          n.y = targetTopic.y + n.offsetY;
          n.vx = 0; 
          n.vy = 0;
          spawnBurst(n.x, n.y);
        }
      }
    });
    w.updated = Date.now();
    bump();
    persist();
  }, [bump, persist, spawnBurst]);

  const panToNode = useCallback((nodeId) => {
    const w = worldRef.current;
    const node = w.nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    const v = viewRef.current;
    const splitViewOpen = useStore.getState().splitViewOpen;
    // Calculate the center of the visible canvas (accounting for the 380px sidebar)
    const availableWidth = splitViewOpen ? window.innerWidth - 380 : window.innerWidth;
    
    // Instantly snap the camera to center the node
    v.x = (availableWidth / 2) - (node.x * v.s);
    v.y = (window.innerHeight / 2) - (node.y * v.s);
    bump();
  }, [bump]);

  return {
    pushUndo, restoreSnapshot, undo, redo,
    spawnBurst,
    createTopic,
    toggleVacuumPreview, confirmVacuum, cancelVacuum, executeManualPull,
    createLink, unlink, deleteNodes,
    moveNodeAndChildrenToTopic, panToNode
  };
}
