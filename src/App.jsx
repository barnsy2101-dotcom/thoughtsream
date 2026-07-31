import React, { useState, useRef, useEffect, useCallback } from 'react';




import { COLORS, CATEGORIES, STOP, TEMPLATES, LS_SESSIONS, LS_CURRENT, LS_APIKEY, LS_HISTORY, LS_LAST_ACTIVE, ACCENT, TOPIC_ACCENT } from './utils/constants';
import { uid, pairKey, clamp, keywords, topicOf, nodeRadius, formatTime } from './utils/helpers';
import { fitViewForNodes, applyCollisions, applyLinkForces, applyTopicGravity, integrateVelocities } from './utils/physics';
import { loadStore, saveStore, blankWorld, pickNode, serializeWorld, hydrateNode, createProject, loadProjects, saveProjects } from './utils/storage';

import { 
  ZapIcon, AlarmIcon, SendIcon, PlusIcon, MinusIcon, LibraryIcon, XIcon, 
  TrashIcon, LinkIcon, CopyIcon, SparkIcon, CheckIcon, UndoIcon, RedoIcon, 
  FitIcon, SearchIcon, MicIcon, PlayIcon, GearIcon, DownloadIcon, FoldIcon, 
  UnfoldIcon, ZapIcon_, PinIcon, MsgIcon, ClockIcon, MagnetIcon, ChevronDownIcon 
} from './components/icons';

import { useStore } from './store/useStore';
import { Sidebar } from './components/Sidebar';
import { SettingsModal } from './components/SettingsModal';
import { TopicMenu } from './components/TopicMenu';
import { EditThoughtModal } from './components/EditThoughtModal';
import { Toolbar } from './components/Toolbar';
import { TimerMenu } from './components/TimerMenu';
import { HeaderMenu } from './components/HeaderMenu';
import { ExportSidebar } from './components/ExportSidebar';




const renderCanvasDOM = (w, v, hidden, q, held, els) => {
  const { nodes, links } = w;
  const { worldElRef, bgRef, nodeEls, zoneEls, pathEls, hitEls, labelEls, badgeEls, linkCardRef, previewRef, threadLineRef } = els;
  
  if (worldElRef.current) worldElRef.current.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.s})`;
  if (bgRef.current) {
    bgRef.current.style.backgroundPosition = `${v.x}px ${v.y}px`;
    bgRef.current.style.backgroundSize = `${26 * v.s}px ${26 * v.s}px`;
  }

  // Hide DOM elements for nodes that no longer exist
  const activeIds = new Set(nodes.map(n => n.id));
  for (const id in nodeEls.current) {
    if (!activeIds.has(id)) {
      if (nodeEls.current[id]) nodeEls.current[id].style.display = 'none';
      if (zoneEls.current[id]) zoneEls.current[id].style.display = 'none';
    }
  }

  // Hide DOM elements for links that no longer exist
  const activeLinkIds = new Set((links || []).map(l => l.id));
  for (const id in pathEls.current) {
    if (!activeLinkIds.has(id)) {
      if (pathEls.current[id]) pathEls.current[id].style.display = 'none';
      if (hitEls.current[id]) hitEls.current[id].style.display = 'none';
      if (labelEls.current[id]) labelEls.current[id].style.display = 'none';
      if (badgeEls.current[id]) badgeEls.current[id].style.display = 'none';
    }
  }

  const sel = useStore.getState().selIds;
  for (const n of nodes) {
    const el = nodeEls.current[n.id];
    if (!el) continue;
    el.style.display = hidden.has(n.id) ? 'none' : '';
    el.style.transform = `translate(${n.x}px, ${n.y}px) translate(-50%, -50%)`;
    let z = 10;
    if (n.isTopic) z = 5;
    if (!n.isTopic && !n.isHub) z = 15;
    if (sel.has(n.id)) z = 20;
    if (held(n)) z = 1000;
    el.style.zIndex = z;
    const match = !q || (n.text + ' ' + (n.notes || '') + ' ' + (n.title || '')).toLowerCase().includes(q);
    el.style.opacity = match ? '1' : '0.14';
  }
  
  for (const n of nodes) {
    if (!n.isTopic) continue;
    const zel = zoneEls.current[n.id];
    if (!zel) continue;
    if (hidden.has(n.id)) { zel.style.display = 'none'; continue; }

    const members = nodes.filter(m => m.topicId === n.id && !hidden.has(m.id));
    let maxMemberR = n.r + 70;
    for (const m of members) {
      const dist = Math.hypot(m.x - n.x, m.y - n.y) + m.r + 40;
      if (dist > maxMemberR) maxMemberR = dist;
    }

    zel.style.display = '';
    zel.style.width = zel.style.height = (maxMemberR * 2) + 'px';
    zel.style.transform = `translate(${n.x}px, ${n.y}px) translate(-50%, -50%)`;
  }
  const curve = (a, b, isArrow) => {
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1;
    const off = Math.min(d * 0.14, 46);

    let bx = b.x, by = b.y;
    if (isArrow) {
      // Pull the endpoint back ~38px along the straight direction so arrow sits outside node
      const pullback = 38;
      bx = b.x - (dx / d) * pullback;
      by = b.y - (dy / d) * pullback;
    }

    return `M ${a.x} ${a.y} Q ${mx - dy / d * off} ${my + dx / d * off} ${bx} ${by}`;
  };
  const byId = (id) => nodes.find(n => n.id === id);
  for (const l of (links || [])) {
    const a = byId(l.a), b = byId(l.b);
    const vis = a && b && !hidden.has(a.id) && !hidden.has(b.id);
    const el = pathEls.current[l.id], hit = hitEls.current[l.id], lab = labelEls.current[l.id];
    if (el) { el.style.display = vis ? '' : 'none'; if (vis) el.setAttribute('d', curve(a, b, l.isArrow)); }
    if (hit) { hit.style.display = vis ? '' : 'none'; if (vis) hit.setAttribute('d', curve(a, b, l.isArrow)); }
    if (lab) { lab.style.display = vis && l.label ? '' : 'none'; if (vis) lab.style.transform = `translate(${(a.x + b.x) / 2}px, ${(a.y + b.y) / 2 + 10}px) translate(-50%, -50%)`; }
  }
  if (useStore.getState().activeLink && linkCardRef.current) {
    const l = links.find(x => x.id === useStore.getState().activeLink);
    const a = l && byId(l.a), b = l && byId(l.b);
    if (a && b) linkCardRef.current.style.transform = `translate(${(a.x + b.x) / 2}px, ${(a.y + b.y) / 2 + 22}px) translate(-50%, 0)`;
  }
  if (previewRef.current) {
    const src = useStore.getState().linkFrom && byId(useStore.getState().linkFrom);
    if (src) {
      previewRef.current.setAttribute('d', `M ${src.x} ${src.y} L ${els.mouseRef.current.x} ${els.mouseRef.current.y}`);
      previewRef.current.style.display = '';
    } else previewRef.current.style.display = 'none';
  }
  if (threadLineRef.current) {
    const t = useStore.getState().targetId && byId(useStore.getState().targetId);
    if (t && !hidden.has(t.id)) {
      const p = els.screenToWorld(window.innerWidth / 2, window.innerHeight - 100);
      threadLineRef.current.setAttribute('d', `M ${t.x} ${t.y} L ${p.x} ${p.y}`);
      threadLineRef.current.style.display = '';
    } else threadLineRef.current.style.display = 'none';
  }

  if (els.pullTetherGroupRef && els.pullTetherGroupRef.current) {
    const selIds = useStore.getState().selIds;
    const hoverId = useStore.getState().hoveredPullTopicId;
    if (selIds.size > 0 && hoverId) {
      const target = byId(hoverId);
      if (target && !hidden.has(target.id)) {
        let paths = '';
        for (const id of selIds) {
          const n = byId(id);
          if (n && !hidden.has(n.id) && n.id !== hoverId) {
            paths += `<path d="M ${n.x} ${n.y} L ${target.x} ${target.y}" fill="none" stroke="rgba(200,200,200,0.6)" stroke-width="2.5" stroke-dasharray="6,6" />`;
          }
        }
        els.pullTetherGroupRef.current.innerHTML = paths;
        els.pullTetherGroupRef.current.style.display = '';
      } else {
        els.pullTetherGroupRef.current.style.display = 'none';
      }
    } else {
      els.pullTetherGroupRef.current.style.display = 'none';
    }
  }

  if (els.sourceTetherGroupRef && els.sourceTetherGroupRef.current) {
    let paths = '';
    for (const n of w.nodes) {
      if (n.topicId && !hidden.has(n.id)) {
        const t = w.nodes.find(node => node.id === n.topicId);
        if (t && !hidden.has(t.id) && t.isSourceAnchor) {
          paths += `<path d="M ${n.x} ${n.y} L ${t.x} ${t.y}" fill="none" stroke="rgba(200,200,200,0.15)" stroke-width="2" stroke-dasharray="4,4" />`;
        }
      }
    }
    els.sourceTetherGroupRef.current.innerHTML = paths;
  }
};


function App() {
  const [, setRev] = useState(0);
  const bump = useCallback(() => setRev(r => r + 1), []);
  const theme = useStore(s => s.theme);
  const setTheme = useStore(s => s.setTheme);

  const drawerOpen = useStore(s => s.drawerOpen);
  const setDrawerOpen = useStore(s => s.setDrawerOpen);
  const modalId = useStore(s => s.modalId);
  const setModalId = useStore(s => s.setModalId);
  const activeLink = useStore(s => s.activeLink);
  const setActiveLink = useStore(s => s.setActiveLink);
  const linkFrom = useStore(s => s.linkFrom);
  const setLinkFrom = useStore(s => s.setLinkFrom);
  const input = useStore(s => s.input);
  const setInput = useStore(s => s.setInput);
  const [sessionsRev, setSessionsRev] = useState(0);
  const [slashQuery, setSlashQuery] = useState(null);
  const [slashIndex, setSlashIndex] = useState(0);
  const query = useStore(s => s.query);
  const setQuery = useStore(s => s.setQuery);
  const selIds = useStore(s => s.selIds);
  const setSelIds = useStore(s => s.setSelIds);
  const marquee = useStore(s => s.marquee);
  const setMarquee = useStore(s => s.setMarquee);
  const replayIdx = useStore(s => s.replayIdx);
  const setReplayIdx = useStore(s => s.setReplayIdx);
  const listening = useStore(s => s.listening);
  const setListening = useStore(s => s.setListening);
  const settingsOpen = useStore(s => s.settingsOpen);
  const setSettingsOpen = useStore(s => s.setSettingsOpen);
  const menuOpen = useStore(s => s.menuOpen);
  const setMenuOpen = useStore(s => s.setMenuOpen);
  const exportOpen = useStore(s => s.exportOpen);
  const setExportOpen = useStore(s => s.setExportOpen);
  const exportSidebarOpen = useStore(s => s.exportSidebarOpen);
  const setExportSidebarOpen = useStore(s => s.setExportSidebarOpen);
  const setDraftOutline = useStore(s => s.setDraftOutline);
  const aiBusy = useStore(s => s.aiBusy);
  const setAiBusy = useStore(s => s.setAiBusy);
  const aiNote = useStore(s => s.aiNote);
  const setAiNote = useStore(s => s.setAiNote);
  const expandBusy = useStore(s => s.expandBusy);
  const setExpandBusy = useStore(s => s.setExpandBusy);
  const apiKey = useStore(s => s.apiKey);
  const setApiKey = useStore(s => s.setApiKey);
  const targetId = useStore(s => s.targetId);
  const setTargetId = useStore(s => s.setTargetId);
  const pureDump = useStore(s => s.pureDump);
  const setPureDump = useStore(s => s.setPureDump);
  const activeTopic = useStore(s => s.activeTopic);
  const setActiveTopic = useStore(s => s.setActiveTopic);
  const topicMenuOpen = useStore(s => s.topicMenuOpen);
  const setTopicMenuOpen = useStore(s => s.setTopicMenuOpen);
  const newTopicName = useStore(s => s.newTopicName);
  const setNewTopicName = useStore(s => s.setNewTopicName);

  // Timer State
  const timerMenuOpen = useStore(s => s.timerMenuOpen);
  const setTimerMenuOpen = useStore(s => s.setTimerMenuOpen);
  const studyTimeInput = useStore(s => s.studyTimeInput);
  const setStudyTimeInput = useStore(s => s.setStudyTimeInput);
  const breakTimeInput = useStore(s => s.breakTimeInput);
  const setBreakTimeInput = useStore(s => s.setBreakTimeInput);
  const timerActive = useStore(s => s.timerActive);
  const setTimerActive = useStore(s => s.setTimerActive);
  const timerMode = useStore(s => s.timerMode);
  const setTimerMode = useStore(s => s.setTimerMode); // 'study' or 'break'
  const timerTimeLeft = useStore(s => s.timerTimeLeft);
  const setTimerTimeLeft = useStore(s => s.setTimerTimeLeft); // in seconds
  
  useEffect(() => {
    let interval = null;
    if (timerActive && timerTimeLeft > 0) {
      interval = setInterval(() => {
        setTimerTimeLeft(t => t - 1);
      }, 1000);
    } else if (timerActive && timerTimeLeft === 0) {
      if (timerMode === 'study') {
        const breakMins = parseInt(breakTimeInput) || 5;
        setTimerMode('break');
        setTimerTimeLeft(breakMins * 60);
        new Notification('Study complete! Time for a break.');
      } else {
        const studyMins = parseInt(studyTimeInput) || 25;
        setTimerMode('study');
        setTimerTimeLeft(studyMins * 60);
        new Notification('Break over! Time to study.');
      }
    }
    return () => clearInterval(interval);
  }, [timerActive, timerTimeLeft, timerMode, studyTimeInput, breakTimeInput]);
  
  const startTimer = (minutes, mode) => {
    setTimerMode(mode.toLowerCase());
    setTimerTimeLeft(minutes * 60);
    setTimerActive(true);
    setTimerMenuOpen(false);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };
  const activeSorterTopicId = useStore(s => s.activeSorterTopicId);
  const setActiveSorterTopicId = useStore(s => s.setActiveSorterTopicId);
  const drawerTab = useStore(s => s.drawerTab);
  const setDrawerTab = useStore(s => s.setDrawerTab); // 'projects' | 'daily'
  const drawerSearch = useStore(s => s.drawerSearch);
  const setDrawerSearch = useStore(s => s.setDrawerSearch);
  const vacuumTopicId = useStore(s => s.vacuumTopicId);
  const setVacuumTopicId = useStore(s => s.setVacuumTopicId);
  const vacuumSelectedIds = useStore(s => s.vacuumSelectedIds);
  const setVacuumSelectedIds = useStore(s => s.setVacuumSelectedIds);
    useEffect(() => { useStore.getState().vacuumTopicId = vacuumTopicId; }, [vacuumTopicId]);
    useEffect(() => { useStore.getState().vacuumSelectedIds = vacuumSelectedIds; }, [vacuumSelectedIds]);

  const hoveredPullTopicId = useStore(s => s.hoveredPullTopicId);
  const setHoveredPullTopicId = useStore(s => s.setHoveredPullTopicId);
  
  const flashActive = useStore(s => s.flashActive);
  const setFlashActive = useStore(s => s.setFlashActive);
  const customTime = useStore(s => s.customTime);
  const setCustomTime = useStore(s => s.setCustomTime);

    useEffect(() => { useStore.getState().hoveredPullTopicId = hoveredPullTopicId; }, [hoveredPullTopicId]);
  const [hoveredSuggThoughtIds, setHoveredSuggThoughtIds] = useState(null);

  const [moveTopicMenuOpen, setMoveTopicMenuOpen] = useState(false);

  const transferSelectedToTopic = (targetTopicId, targetColor) => {
    const selectedIds = useStore.getState().selIds;
    w.nodes.forEach(n => {
      if (selectedIds.has(n.id) && !n.isTopic && !n.isHub) {
        n.topicId = targetTopicId || null;
        if (targetTopicId && targetColor !== undefined) {
          n.color = targetColor;
        }
      }
    });
    worldRef.current.updated = Date.now();
    bump();
    persist();
    setMoveTopicMenuOpen(false);
    setSelIds(new Set());
  };

  const pullTetherGroupRef = useRef(null);
  const sourceTetherGroupRef = useRef(null);

  const unexportedArchiveAlert = useStore(s => s.unexportedArchiveAlert);
  const setUnexportedArchiveAlert = useStore(s => s.setUnexportedArchiveAlert);

  /** Return keyboard focus to the main thought input after closing any modal/overlay. */
  const focusInput = useCallback(() => {
    requestAnimationFrame(() => {
      document.getElementById('thought-input')?.focus();
    });
  }, []);

  const worldRef = useRef(null);
  if (!worldRef.current) {
    const store = loadStore();
    let cur = localStorage.getItem(LS_CURRENT);
    const todayStr = new Date().toISOString().split('T')[0];
    const lastActive = localStorage.getItem(LS_LAST_ACTIVE);
    const ENABLE_DAILY_ROLLOVER = false;

    // Perform Daily Rollover
    if (ENABLE_DAILY_ROLLOVER && lastActive && lastActive !== todayStr) {
      if (cur && store[cur] && store[cur].nodes && store[cur].nodes.length > 0) {
        let history = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]');
        const lastDateObj = new Date(lastActive);
        const dateOpts = { month: 'short', day: 'numeric', year: 'numeric' };
        store[cur].name = `Stream - ${lastDateObj.toLocaleDateString(undefined, dateOpts)}`;
        saveStore(store);
        
        history.push({ id: cur, date: lastActive, name: store[cur].name });
        localStorage.setItem(LS_HISTORY, JSON.stringify(history));

        // Queue alert for unexported nodes (since we rolled over a non-empty stream)
        setUnexportedArchiveAlert({ id: cur, name: store[cur].name });
      }
      
      const newWorld = blankWorld();
      newWorld.name = `Today's Stream`;
      store[newWorld.id] = newWorld;
      saveStore(store);
      cur = newWorld.id;
      localStorage.setItem(LS_CURRENT, cur);
    }
    localStorage.setItem(LS_LAST_ACTIVE, todayStr);

    if (cur && store[cur]) {
      const s = store[cur];
      worldRef.current = { ...blankWorld(), ...s };
      worldRef.current.nodes = worldRef.current.nodes.map(hydrateNode);
      worldRef.current.nodes.forEach(n => { n.r = nodeRadius(n); });
    } else {
      worldRef.current = blankWorld();
      worldRef.current.name = `Today's Stream`;
      store[worldRef.current.id] = worldRef.current;
      saveStore(store);
      localStorage.setItem(LS_CURRENT, worldRef.current.id);
    }
  }

  // Explicit React state for the active world ID — ensures React re-renders Header,
  // empty state, and sidebar synchronously on every canvas switch.
  const [activeWorldId, setActiveWorldId] = useState(() =>
    worldRef.current ? worldRef.current.id : null
  );

  const viewRef = useRef(fitViewForNodes(worldRef.current ? worldRef.current.nodes : []));
  const containerRef = useRef(null);
  const worldElRef = useRef(null);
  const bgRef = useRef(null);
  const nodeEls = useRef({});
  const pathEls = useRef({});
  const hitEls = useRef({});
  const labelEls = useRef({});
  const badgeEls = useRef({});
  const suggCardRef = useRef(null);
  const linkCardRef = useRef(null);
  const previewRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef(null);
  const panRef = useRef(null);
  const marqueeStartRef = useRef(null);
    const linkDragRef = useRef(null);
                    const zoneEls = useRef({});
  const threadLineRef = useRef(null);
  
  const nodeBounds = useRef({});
  const observedNodes = useRef(new Set());
  const resizeObserver = useRef(null);

  useEffect(() => {
    resizeObserver.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const id = entry.target.dataset.id;
        if (id) {
          nodeBounds.current[id] = {
            w: entry.target.offsetWidth / 2,
            h: entry.target.offsetHeight / 2
          };
        }
      }
    });
    return () => resizeObserver.current?.disconnect();
  }, []);
      const lastAIHashRef = useRef('');
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const recRef = useRef(null);
  useEffect(() => { useStore.getState().linkFrom = linkFrom; }, [linkFrom]);
  useEffect(() => { useStore.getState().activeLink = activeLink; }, [activeLink]);
  useEffect(() => { useStore.getState().selIds = selIds; }, [selIds]);
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);
  useEffect(() => { useStore.getState().query = query.trim().toLowerCase(); }, [query]);
  useEffect(() => { useStore.getState().replayIdx = replayIdx; }, [replayIdx]);
  useEffect(() => { useStore.getState().apiKey = apiKey; }, [apiKey]);
  useEffect(() => { useStore.getState().targetId = targetId; }, [targetId]);
  useEffect(() => { useStore.getState().pureDump = pureDump; }, [pureDump]);
  useEffect(() => { useStore.getState().activeTopic = activeTopic; }, [activeTopic]);
  useEffect(() => { useStore.getState().activeSorterTopicId = activeSorterTopicId; }, [activeSorterTopicId]);

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

    // AI Semantic Matching if API key is set
    const apiKey = useStore.getState().apiKey;
    if (apiKey) {
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
  }, []);

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
      n.vx = 0; n.vy = 0;
      n.isPulling = true;
      n.offsetX = undefined;
      n.offsetY = undefined;
    }
    
    setSelIds(new Set());
    w.updated = Date.now();
    bump();
  }, [bump]);

  const exportTopicMarkdown = useCallback((topicNode) => {
    const w = worldRef.current;
    const children = w.nodes.filter(n => n.topicId === topicNode.id && !n.isTopic && !n.isHub && n.text?.trim());
    setDraftOutline([{
      id: topicNode.id,
      title: topicNode.title || topicNode.text || 'Untitled Topic',
      thoughts: children.map(n => n.text.trim()),
      isUnsorted: false,
    }]);
    setExportSidebarOpen(true);
  }, [setDraftOutline, setExportSidebarOpen]);

  const handleExportMarkdownOutline = useCallback(() => {
    const w = worldRef.current;
    const topics = w.nodes.filter(n => n.isTopic);
    const outline = [];

    // Group thoughts under their topic
    for (const topic of topics) {
      const children = w.nodes.filter(n => !n.isTopic && !n.isHub && n.topicId === topic.id && n.text?.trim());
      outline.push({
        title: topic.title || topic.text || 'Untitled Topic',
        thoughts: children.map(n => n.text.trim()),
        isUnsorted: false,
      });
    }

    // Collect unassigned thoughts
    const unsorted = w.nodes.filter(n => !n.isTopic && !n.isHub && !n.topicId && n.text?.trim());
    if (unsorted.length > 0) {
      outline.push({
        title: 'Unsorted',
        thoughts: unsorted.map(n => n.text.trim()),
        isUnsorted: true,
      });
    }

    setDraftOutline(outline);
    setExportSidebarOpen(true);
  }, [setDraftOutline, setExportSidebarOpen]);

  /* ---------- thought creation ---------- */
  const addThought = useCallback((text, opts = {}) => {
    text = text.trim();
    if (!text) return null;
    const w = worldRef.current;
    if (!opts.skipUndo) pushUndo();
    const baseSpawn = opts.at || screenToWorld(window.innerWidth / 2, window.innerHeight - 130);
    let topicId = ('topicId' in opts) ? opts.topicId : useStore.getState().activeTopic;

    let burstIndex = 0;
    let isBurstStart = false;
    let burstTimeStr = '';

    if (opts.metadata && opts.metadata.url) {
      let sourceTopic = w.nodes.find(n => n.isTopic && n.metadata && n.metadata.url === opts.metadata.url);
      const now = Date.now();
      if (!sourceTopic) {
        const title = opts.metadata.title || opts.metadata.url;
        const spawnPos = screenToWorld(window.innerWidth / 2 + (Math.random() * 200 - 100), 150 + (Math.random() * 100 - 50));
        sourceTopic = {
          id: uid(), text: title, title: title, notes: '', color: 0,
          x: spawnPos.x, y: spawnPos.y,
          vx: 0, vy: 0,
          isHub: false, created: now, collapsed: false,
          isQuestion: false,
          isTopic: true,
          isSourceAnchor: true,
          metadata: opts.metadata,
          topicId: null,
          released: true,
          lastThoughtTimestamp: now,
          currentBurstIndex: 0
        };
        sourceTopic.r = nodeRadius(sourceTopic);
        w.nodes.push(sourceTopic);
        isBurstStart = true;
        burstTimeStr = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        const timeDiff = now - (sourceTopic.lastThoughtTimestamp || 0);
        if (timeDiff > 300000) { // > 5 minutes
          sourceTopic.currentBurstIndex = (sourceTopic.currentBurstIndex || 0) + 1;
          isBurstStart = true;
          burstTimeStr = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
      }
      sourceTopic.lastThoughtTimestamp = now;
      burstIndex = sourceTopic.currentBurstIndex || 0;
      topicId = sourceTopic.id;
    }

    const n = {
      id: uid(), text, notes: '', color: 0,
      x: baseSpawn.x, y: baseSpawn.y,
      vx: 0, vy: -0.8,
      isHub: false, created: Date.now(), collapsed: false,
      isQuestion: /\?\s*$/.test(text),
      topicId,
      released: true,
      metadata: opts.metadata || null,
      targetStreamId: opts.targetStreamId || null,
      burstIndex,
      isBurstStart,
      burstTimeStr
    };
    n.r = nodeRadius(n);

    // If assigned to a topic, spawn near that topic node
    const topicNode = n.topicId && byId(n.topicId);
    if (topicNode && !opts.at) {
      n.x = topicNode.x + (Math.random() * 120 - 60);
      n.y = topicNode.y + topicNode.r + 50 + Math.random() * 30;
    } else if (!opts.at) {
      const occ = w.nodes.find(ex => !ex.isTopic && !ex.isHub && Math.hypot(ex.x - baseSpawn.x, ex.y - baseSpawn.y) < n.r + (ex.r || nodeRadius(ex)) + 10);
      if (occ) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI * 0.5); // Upward arc (-45 to +45 deg)
        const dist = n.r + (occ.r || nodeRadius(occ)) + 14;
        n.x = occ.x + Math.cos(angle) * dist;
        n.y = occ.y + Math.sin(angle) * dist;
        n.vx = (n.x - baseSpawn.x) * 0.08;
        n.vy = -1.0;
      }
    }

    w.nodes.push(n);
    const threadTarget = useStore.getState().targetId && byId(useStore.getState().targetId);
    if (threadTarget && threadTarget.id !== n.id) {
      if (!(threadTarget.isTopic && n.topicId === threadTarget.id)) {
        w.links.push({ id: uid(), a: threadTarget.id, b: n.id });
      }
    }
    // if (n.isQuestion && !useStore.getState().targetId) setTargetId(n.id);
    spawnBurst(n.x, n.y);
    w.updated = Date.now();
    bump();
    clearTimeout(addThought._t);
    addThought._t = setTimeout(() => runAI(), 8000);
    return n;
  }, []);
  useEffect(() => {
    window.tsAdd = (t) => addThought(t); window.tsWorld = () => worldRef.current;
    window.tsUndo = undo; window.tsHidden = () => [...hiddenIdSet()];
    window.tsTarget = (id) => setTargetId(id === undefined ? null : id);
    window.tsGetTarget = () => useStore.getState().targetId;
    window.tsDebug = () => ({ linkFromRef: useStore.getState().linkFrom, drag: dragRef.current && dragRef.current.node.id, activeTopic: useStore.getState().activeTopic });
    window.tsCreateTopic = (name) => createTopic(name);
    window.tsSetActiveTopic = (id) => setActiveTopic(id === undefined ? null : id);

    /*
    const handleExtensionMessage = (e) => {
      if (e.data && e.data.type === 'ADD_THOUGHT_EXTERNAL') {
        const text = e.data.payload ? e.data.payload.text : e.data.text;
        const metadata = e.data.payload ? e.data.payload.metadata : null;
        const targetStreamId = e.data.payload ? e.data.payload.targetStreamId : null;
        if (targetStreamId === 'stream_today' && window.tsSwitchToToday) window.tsSwitchToToday();
        if (text) addThought(text, { metadata, targetStreamId });
      } else if (e.data && e.data.type === 'ADD_THOUGHT_EXTERNAL_BATCH') {
        if (Array.isArray(e.data.thoughts)) {
          if (e.data.thoughts.length > 0) {
            const firstTarget = e.data.thoughts[0].targetStreamId;
            if (firstTarget === 'stream_today' && window.tsSwitchToToday) window.tsSwitchToToday();
          }
          e.data.thoughts.forEach((item, i) => {
            const text = item.text || item;
            const metadata = item.metadata || null;
            const targetStreamId = item.targetStreamId || null;
            if (text) setTimeout(() => addThought(text, { metadata, targetStreamId }), i * 150);
          });
        }
      }
    };
    window.addEventListener('message', handleExtensionMessage);
    return () => window.removeEventListener('message', handleExtensionMessage);
    */
  }, [addThought, undo]);

  /* ---------- AI engine ---------- */
  const simulateAI = () => {
    const w = worldRef.current;
    const thoughts = w.nodes.filter(n => !n.isTopic && !n.isHub && !n.topicId && n.text.trim());
    const metaHubs = [];
    const topic = new Map(thoughts.map(t => [t.id, topicOf(t.text)]));

    const byTopic = {};
    for (const t of thoughts) { const c = topic.get(t.id); if (c) (byTopic[c] = byTopic[c] || []).push(t.id); }
    for (const [cat, ids] of Object.entries(byTopic)) {
      const existingHub = w.nodes.find(n => 
        (n.isHub || n.isTopic) && n.title && n.title.toLowerCase() === cat.toLowerCase()
      );
      if (!existingHub && ids.length >= 5) {
        metaHubs.push({ topicName: cat, thoughtIds: ids });
      } else if (existingHub && ids.length >= 1) {
        metaHubs.push({ topicName: existingHub.title, thoughtIds: ids });
      }
    }
    if (metaHubs.length > 0) {
      useStore.getState().setAiTopicSuggestions(metaHubs.slice(0, 3));
    }
  };

  const callAI = async (prompt, schema, maxTokens = 2048) => {
    const apiKey = useStore.getState().apiKey;
    if (apiKey.startsWith('AIza') || apiKey.startsWith('AQ.')) {
      const cleanSchema = JSON.parse(JSON.stringify(schema));
      const removeExtra = (obj) => {
        if (obj.additionalProperties !== undefined) delete obj.additionalProperties;
        if (obj.properties) Object.values(obj.properties).forEach(removeExtra);
        if (obj.items) removeExtra(obj.items);
      };
      removeExtra(cleanSchema);

      const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];
      let lastErr = null;
      for (const model of modelsToTry) {
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: cleanSchema,
                maxOutputTokens: maxTokens,
              }
            })
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error((err.error && err.error.message) || `Gemini API error ${res.status}`);
          }
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
          return JSON.parse(text);
        } catch (err) {
          lastErr = err;
          // If model is not found or unsupported, continue to try the next model
          if (err.message && err.message.includes('not found')) continue;
          throw err;
        }
      }
      throw lastErr;
    } else {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: maxTokens,
          output_config: { format: { type: 'json_schema', schema } },
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err.error && err.error.message) || `API error ${res.status}`);
      }
      const data = await res.json();
      const text = data.content.find(b => b.type === 'text');
      return JSON.parse(text.text);
    }
  };

  const runAI = useCallback(async () => {
    if (useStore.getState().pureDump) return;
    const w = worldRef.current;
    const thoughts = w.nodes.filter(n => !n.isTopic && !n.isHub && !n.topicId && n.text.trim());
    if (thoughts.length < 2) return;
    if (!useStore.getState().apiKey) { simulateAI(); return; }
    const hash = thoughts.map(t => t.id + t.text).join('|');
    if (hash === lastAIHashRef.current || useStore.getState().aiBusy) return;
    useStore.getState().aiBusy = true; setAiBusy(true); setAiNote('');
    try {
      const hubs = w.nodes
        .filter(n => (n.isHub || n.isTopic) && n.title)
        .map(n => ({ id: n.id, title: n.title }));

      const prompt = `You are the synthesis engine inside a brainstorming canvas. Analyze these thoughts and suggest connections and thematic clusters.
Thoughts (id: text):
${thoughts.map(t => `${t.id}: ${t.text}`).join('\n')}
Existing cluster hubs:
${JSON.stringify(hubs)}

Rules:
- Suggest at most 5 new connections between genuinely related thoughts. Each reason must be one short, specific sentence (max 10 words).
- NEW TOPICS: Propose a new topic ONLY when 5 or more unassigned thoughts share a strong theme NOT already covered by an existing hub.
- EXISTING TOPICS: If 1 or more unassigned thoughts belong to an existing hub/topic title from the list above, list them under that EXACT existing title. NEVER invent a new or duplicate title for an existing topic.
- Only use thought ids from the list above. Quality over quantity - an empty list is fine.`;
      const schema = {
        type: 'object',
        properties: {
          topics: {
            type: 'array',
            items: {
              type: 'object',
              properties: { topicName: { type: 'string' }, thoughtIds: { type: 'array', items: { type: 'string' } } },
              required: ['topicName', 'thoughtIds'], additionalProperties: false,
            },
          },
        },
        required: ['topics'], additionalProperties: false,
      };
      const out = await callAI(prompt, schema);
      lastAIHashRef.current = hash;
      useStore.getState().setAiTopicSuggestions((out.topics || []).slice(0, 3));
    } catch (e) {
      setAiNote(e.message.slice(0, 80));
      simulateAI();
    } finally {
      useStore.getState().aiBusy = false; setAiBusy(false);
    }
  }, []);
  useEffect(() => {
    const t = setInterval(() => runAI(), apiKey ? 60000 : 7000);
    return () => clearInterval(t);
  }, [runAI, apiKey]);

  /* ---------- study timer ---------- */
  useEffect(() => {
    if (!timerActive) return;
    const t = setInterval(() => {
      setTimerTimeLeft(prev => {
        if (prev <= 1) {
          setTimerActive(false);
          setFlashActive(true);
          setTimeout(() => setFlashActive(false), 3000);
          
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 1.5);
          } catch (e) {
            console.error('Audio play failed', e);
          }
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [timerActive]);

  const expandThought = async (node) => {
    setExpandBusy(true);
    let ideas;
    try {
      if (useStore.getState().apiKey) {
        const out = await callAI(
          `In a brainstorming session, the thought is: "${node.text}"${node.notes ? ` (notes: ${node.notes})` : ''}.
Other thoughts on the canvas: ${worldRef.current.nodes.filter(n => !n.isHub && n.id !== node.id).slice(0, 20).map(n => n.text).join('; ')}
Generate exactly 3 short, concrete follow-on ideas that develop this thought. Each under 12 words. No numbering.`,
          { type: 'object', properties: { ideas: { type: 'array', items: { type: 'string' } } }, required: ['ideas'], additionalProperties: false },
          1024,
        );
        ideas = (out.ideas || []).slice(0, 4);
      }
    } catch (e) { setAiNote(e.message.slice(0, 80)); }
    if (!ideas || !ideas.length) {
      const stub = node.text.length > 40 ? node.text.slice(0, 40) + '…' : node.text;
      ideas = [
        `First concrete step toward: ${stub}`,
        `Biggest obstacle to: ${stub}`,
        `How do we measure: ${stub}`,
      ];
    }
    pushUndo();
    ideas.forEach((idea, i) => {
      const angle = (i / ideas.length) * Math.PI + Math.PI * 0.15;
      const child = addThought(idea, {
        at: { x: node.x + Math.cos(angle) * 240 * (i % 2 ? 1 : -1), y: node.y + 170 + Math.sin(angle) * 60 },
        skipUndo: true,
      });
      if (child) worldRef.current.links.push({ id: uid(), a: node.id, b: child.id });
    });
    setExpandBusy(false);
    setModalId(null);
    bump();
  };

  /* ---------- links ---------- */
  const createLink = (a, b, skipUndo) => {
    const w = worldRef.current;
    if (a === b) return;
    const k = pairKey(a, b);
    if (w.links.some(l => pairKey(l.a, l.b) === k)) return;
    if (!skipUndo) pushUndo();
    w.links.push({ id: uid(), a, b });
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

  /* ---------- collapse hubs ---------- */
  const hubMembers = (hubId) => {
    const w = worldRef.current;
    return w.links.filter(l => l.a === hubId || l.b === hubId).map(l => (l.a === hubId ? l.b : l.a));
  };
  const hiddenIdSet = () => {
    const w = worldRef.current;
    const hidden = new Set();
    for (const n of w.nodes) {
      if (n.isHub && n.collapsed) hubMembers(n.id).forEach(id => { const m = byId(id); if (m && !m.isHub) hidden.add(id); });
    }
    if (useStore.getState().replayIdx !== null) {
      const sorted = [...w.nodes].sort((a, b) => a.created - b.created);
      sorted.forEach((n, i) => { if (i >= useStore.getState().replayIdx) hidden.add(n.id); });
    }
    return hidden;
  };

  /* ---------- sessions ---------- */
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
  }, []);
  useEffect(() => {
    const t = setInterval(persist, 2500);
    return () => clearInterval(t);
  }, [persist]);

  // Returns a unique canvas name by appending a counter if a conflict exists
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
  
  window.tsSwitchToToday = () => {
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

  /* ---------- voice capture ---------- */
  const speechSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (listening) { recRef.current && recRef.current.stop(); setListening(false); return; }
    const r = new SR();
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          const t = e.results[i][0].transcript.trim();
          if (t) addThought(t);
        }
      }
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    r.start();
    recRef.current = r;
    setListening(true);
  };

  /* ---------- physics + paint loop ---------- */
  useEffect(() => {
    let raf;
    let lastTick = 0;
    const doTick = () => {
      lastTick = performance.now();
      const w = worldRef.current, v = viewRef.current;
      const nodes = w.nodes;
      const hidden = hiddenIdSet();
      const q = useStore.getState().query;
      const held = (n) => dragRef.current && dragRef.current.group.some(g => g.n === n);
      const fixed = (n) => n.pinned || held(n) || n.isTopic || n.isHub || n.sleeping;
      const byId = (id) => nodes.find(n => n.id === id);

      const bounds = nodeBounds.current;
      for (const n of nodes) {
        if (!bounds[n.id] && nodeEls.current[n.id]) {
          bounds[n.id] = {
            w: (nodeEls.current[n.id].offsetWidth || n.r * 2) / 2,
            h: (nodeEls.current[n.id].offsetHeight || n.r * 2) / 2
          };
        }
      }

      applyCollisions(nodes, hidden, bounds, fixed);
      applyLinkForces(w.links, byId, hidden, fixed, bounds);
      applyTopicGravity(nodes, hidden, bounds, fixed, held);
      integrateVelocities(nodes, hidden, fixed, byId);

      const els = {
        worldElRef, bgRef, nodeEls, zoneEls, pathEls, hitEls, labelEls, badgeEls, 
        suggCardRef, linkCardRef, previewRef, threadLineRef, mouseRef,
        pullTetherGroupRef, sourceTetherGroupRef,
        screenToWorld: (x, y) => ({ x: (x - v.x) / v.s, y: (y - v.y) / v.s })
      };
      
      renderCanvasDOM(w, v, hidden, q, held, els);
    };
    const safeTick = () => { try { doTick(); } catch (e) { console.error('tick:', e.message); lastTick = performance.now(); } };
    const loop = () => { safeTick(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    const watchdog = setInterval(() => { if (performance.now() - lastTick > 250) safeTick(); }, 200);
    return () => { cancelAnimationFrame(raf); clearInterval(watchdog); };
  }, []);

  /* ---------- pan / zoom / drag / marquee ---------- */
  const zoomBy = useCallback((factor) => {
    const v = viewRef.current;
    const ns = clamp(v.s * factor, 0.3, 2.5);
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    v.x = cx - (cx - v.x) * (ns / v.s);
    v.y = cy - (cy - v.y) * (ns / v.s);
    v.s = ns;
  }, []);

  const zoomToFit = useCallback(() => {
    const w = worldRef.current;
    if (!w || !w.nodes.length) return;
    viewRef.current = fitViewForNodes(w.nodes);
    bump();
  }, []);

  useEffect(() => {
    if (worldRef.current && worldRef.current.nodes.length > 0) {
      zoomToFit();
    }
  }, [zoomToFit]);
  useEffect(() => {
    const el = containerRef.current;
    const onWheel = (e) => {
      if (e.target.closest('[data-ui]') || e.target.closest('.drawer')) return;
      e.preventDefault();
      const v = viewRef.current;
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.008 : 0.0016));
      const ns = clamp(v.s * factor, 0.3, 2.5);
      v.x = e.clientX - (e.clientX - v.x) * (ns / v.s);
      v.y = e.clientY - (e.clientY - v.y) * (ns / v.s);
      v.s = ns;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      mouseRef.current = screenToWorld(e.clientX, e.clientY);
      if (linkDragRef.current && Math.hypot(e.clientX - linkDragRef.current.sx, e.clientY - linkDragRef.current.sy) > 4) {
        linkDragRef.current.moved = true;
      }
      if (marqueeStartRef.current) {
        const m = marqueeStartRef.current;
        setMarquee({
          x: Math.min(m.sx, e.clientX), y: Math.min(m.sy, e.clientY),
          w: Math.abs(e.clientX - m.sx), h: Math.abs(e.clientY - m.sy),
        });
        return;
      }
      if (panRef.current) {
        const v = viewRef.current;
        v.x = panRef.current.vx + (e.clientX - panRef.current.sx);
        v.y = panRef.current.vy + (e.clientY - panRef.current.sy);
      }
      if (dragRef.current) {
        const d = dragRef.current;
        const p = screenToWorld(e.clientX, e.clientY);
        for (const g of d.group) {
          const oldX = g.n.x;
          const oldY = g.n.y;
          const newX = p.x - g.offX;
          const newY = p.y - g.offY;
          const deltaX = newX - oldX;
          const deltaY = newY - oldY;

          g.n.x = newX;
          g.n.y = newY;
          if (g.n.sleeping) g.n.sleeping = false;

          if (g.n.isTopic) {
            const children = worldRef.current.nodes.filter(c => c.topicId === g.n.id && !d.group.some(dg => dg.n === c));
            for (const child of children) {
              if (child.sleeping) child.sleeping = false;
            }
          }
        }
        if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 5) d.moved = true;
      }
    };
    const onUp = (e) => {
      if (linkDragRef.current) {
        const from = linkDragRef.current.from;
        const moved = linkDragRef.current.moved;
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const bubbleEl = el && el.closest('[data-bubble][data-id]');
        const toId = bubbleEl && bubbleEl.getAttribute('data-id');
        linkDragRef.current = null;
        if (toId && toId !== from) {
          createLink(from, toId);
          setLinkFrom(null);
        } else if (moved) {
          setLinkFrom(null);
        }
        return;
      }
      if (marqueeStartRef.current) {
        const m = marqueeStartRef.current;
        const a = screenToWorld(Math.min(m.sx, e.clientX), Math.min(m.sy, e.clientY));
        const b = screenToWorld(Math.max(m.sx, e.clientX), Math.max(m.sy, e.clientY));
        const inside = worldRef.current.nodes
          .filter(n => n.x >= a.x && n.x <= b.x && n.y >= a.y && n.y <= b.y)
          .map(n => n.id);
        setSelIds(prev => new Set([...prev, ...inside]));
        marqueeStartRef.current = null;
        setMarquee(null);
      }
      if (dragRef.current) {
        const d = dragRef.current;
        if (!d.moved) {
          if (useStore.getState().activeSorterTopicId && !d.node.isTopic && !d.node.isHub) {
            pushUndo();
            const targetTopicId = useStore.getState().activeSorterTopicId;
            d.node.topicId = (d.node.topicId === targetTopicId) ? null : targetTopicId;
            d.node.sleeping = false;
            d.node.userMoved = false;
            spawnBurst(d.node.x, d.node.y, { color: TOPIC_ACCENT });
            worldRef.current.updated = Date.now();
            bump();
            persist();
            dragRef.current = null;
            return;
          }
          if (useStore.getState().linkFrom && useStore.getState().linkFrom !== d.node.id) {
            createLink(useStore.getState().linkFrom, d.node.id);
            setLinkFrom(null);
          } else {
            setSelIds(new Set([d.node.id]));
          }
        } else if (d.moved) {
          for (const g of d.group) {
            if (g.n.isTopic || g.n.isHub || !g.n.topicId) {
              g.n.userMoved = true;
              g.n.vx = 0;
              g.n.vy = 0;
            } else {
              g.n.userMoved = false;
              g.n.vx = 0;
              g.n.vy = 0;
              const parentTopic = byId(g.n.topicId);
              if (parentTopic) {
                g.n.offsetX = Math.round(g.n.x - parentTopic.x);
                g.n.offsetY = Math.round(g.n.y - parentTopic.y);
              }
            }
          }
          worldRef.current.updated = Date.now();
        }
        dragRef.current = null;
      }
      panRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  }, []);

  const clearAllSelections = useCallback(() => {
    setSelIds(new Set());
    setTargetId(null);
    setActiveTopic(null);
    setVacuumTopicId(null);
    setVacuumSelectedIds(new Set());
    setActiveSorterTopicId(null);
    setHoveredPullTopicId(null);
    setLinkFrom(null);

    setActiveLink(null);
    setModalId(null);
    setSettingsOpen(false);
    setExportOpen(false);
    setTopicMenuOpen(false);
    setTimerMenuOpen(false);
    setExportSidebarOpen(false);
    setSlashQuery(null);
    useStore.setState({
      selIds: new Set(),
      targetId: null,
      activeTopic: null,
      vacuumTopicId: null,
      vacuumSelectedIds: new Set(),
      activeSorterTopicId: null,
      hoveredPullTopicId: null,
      linkFrom: null,
      activeLink: null,
      modalId: null,
      settingsOpen: false,
      exportOpen: false,
    });
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      const typing = /INPUT|TEXTAREA/.test(document.activeElement && document.activeElement.tagName);
      
      // Auto-focus typing mechanic: if pressing a regular character key while not typing, focus input
      if (!typing && e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        document.getElementById('thought-input')?.focus();
      }

      if (e.key === 'Escape') {
        e.preventDefault();

        // 1. Blur any focused text input or textarea
        if (document.activeElement && typeof document.activeElement.blur === 'function') {
          document.activeElement.blur();
        }

        // 2. Reset all interaction and selection states
        setLinkFrom(null);
        setHoveredSuggThoughtIds(null);
        setActiveLink(null);
        setModalId(null);
        setSelIds(new Set());
        setTargetId(null);
        setActiveTopic(null);
        setActiveSorterTopicId(null);
        setVacuumTopicId(null);
        setVacuumSelectedIds(new Set());
        setReplayIdx(null);

        // 3. Close all drawers, menus, and modals
        setDrawerOpen(false);
        setSettingsOpen(false);
        setExportOpen(false);
        setMenuOpen(false);
        setTopicMenuOpen(false);
        setTimerMenuOpen(false);

        // 4. Cancel any ongoing mouse drag, pan, or marquee box operations
        dragRef.current = null;
        panRef.current = null;
        marqueeStartRef.current = null;
        setMarquee(null);

        return;
      }
      // Enter while pull/vacuum mode is active → confirm pull
      if (e.key === 'Enter' && useStore.getState().vacuumTopicId) {
        e.preventDefault();
        confirmVacuum();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (typing) return;
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !typing) {
        if (useStore.getState().selIds.size) { e.preventDefault(); deleteNodes(useStore.getState().selIds); }
        else if (useStore.getState().targetId) { e.preventDefault(); deleteNodes(useStore.getState().targetId); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const onBackgroundDown = (e) => {
    if (e.target.closest('[data-ui]')) {
      if (menuOpen) setMenuOpen(false);
      if (timerMenuOpen) setTimerMenuOpen(false);
      return;
    }
    setMenuOpen(false);
    setTopicMenuOpen(false);
    setTimerMenuOpen(false);
    if (e.target.closest('[data-bubble]') || e.target.closest('[data-ui]')) return;
    if (e.shiftKey) {
      marqueeStartRef.current = { sx: e.clientX, sy: e.clientY };
      return;
    }
    panRef.current = { sx: e.clientX, sy: e.clientY, vx: viewRef.current.x, vy: viewRef.current.y };
    setActiveLink(null); setLinkFrom(null); setSelIds(new Set()); setExportOpen(false); setTargetId(null); setTopicMenuOpen(false);
    setVacuumTopicId(null); setVacuumSelectedIds(new Set());
  };
  const onBubbleDown = (node) => (e) => {
    e.stopPropagation();
    if (e.metaKey || e.ctrlKey || e.shiftKey) {
      setSelIds(prev => {
        const next = new Set(prev);
        if (next.has(node.id)) next.delete(node.id);
        else next.add(node.id);
        return next;
      });
      return;
    }
    if (useStore.getState().vacuumTopicId && !node.isTopic && !node.isHub) {
      setVacuumSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(node.id)) next.delete(node.id);
        else next.add(node.id);
        return next;
      });
      return;
    }
    const p = screenToWorld(e.clientX, e.clientY);
    const groupIds = useStore.getState().selIds.has(node.id) ? useStore.getState().selIds : new Set([node.id]);
    const group = [...groupIds].map(byId).filter(Boolean).map(n => ({ n, offX: p.x - n.x, offY: p.y - n.y }));
    dragRef.current = { node, group, sx: e.clientX, sy: e.clientY, moved: false };
  };
  /* ---------- input helpers ---------- */
  const onPaste = (e) => {
    const text = e.clipboardData.getData('text');
    if (text && text.includes('\n')) {
      e.preventDefault();
      pushUndo();
      text.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 20)
        .forEach((l, i) => setTimeout(() => addThought(l, { skipUndo: true }), i * 280));
    }
  };
  const seedTemplate = (name) => {
    pushUndo();
    TEMPLATES[name].forEach((t, i) => setTimeout(() => addThought(t, { skipUndo: true }), i * 320));
  };



  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    const slashMatch = val.match(/(?:^|\s)\/([a-zA-Z0-9_-]*)$/);
    if (slashMatch) {
      setSlashQuery(slashMatch[1].toLowerCase());
      setSlashIndex(0);
    } else {
      setSlashQuery(null);
    }
  };

  const handleInputKeyDown = (e) => {

    // If the pull/vacuum mode is active, Enter confirms the pull
    if (e.key === 'Enter' && useStore.getState().vacuumTopicId) {
      e.preventDefault();
      confirmVacuum();
      return;
    }
    if (slashQuery !== null) {
      const filteredTopics = worldRef.current.nodes.filter(n => n.isTopic && n.title.toLowerCase().includes(slashQuery));
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashIndex(i => (i + 1) % filteredTopics.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashIndex(i => (i - 1 + filteredTopics.length) % filteredTopics.length);
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredTopics[slashIndex];
        if (selected) {
           const newVal = input.replace(/(?:^|\s)\/[a-zA-Z0-9_-]*$/, '');
           setInput(newVal);
           setSlashQuery(null);
           useStore.getState().setActiveTopic(selected.id);
        }
      } else if (e.key === ' ') {
        setSlashQuery(null);
      }
    }
  };

  /* ---------- render ---------- */
  const w = worldRef.current;
  const modalNode = modalId && byId(modalId);
  const targetNode = targetId && byId(targetId);
  const topics = w.nodes.filter(n => n.isTopic);
  const activeTopicNode = activeTopic && byId(activeTopic);
  const linkCard = activeLink && w.links.find(l => l.id === activeLink);
  const store = loadStore();
  const sessionList = Object.values(store).sort((a, b) => b.updated - a.updated);
  const replaying = replayIdx !== null;

  return (
    <div ref={containerRef} className={`fixed inset-0 select-none ${activeSorterTopicId ? 'cursor-crosshair' : ''}`} onPointerDown={onBackgroundDown}>
      <div id="bg-grad" />
      <div id="bg-dots" ref={bgRef} />

      {/* world layer */}
      <div ref={worldElRef} className="absolute inset-0" style={{ transformOrigin: '0 0' }}>
        {/* topic gravity zones (behind everything) */}
        {w.nodes.filter(n => n.isTopic).map(n => (
          <div key={'zone' + n.id} className="topic-zone" ref={el => { if (el) zoneEls.current[n.id] = el; }}
            style={{
              background: theme === 'light'
                ? 'radial-gradient(circle at center, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.10) 40%, rgba(0,0,0,0) 75%)'
                : 'radial-gradient(circle at center, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.08) 40%, rgba(255,255,255,0) 75%)',
              border: 'none',
              filter: 'blur(8px)',
              display: 'none'
            }} />
        ))}
        <svg className="absolute" style={{ overflow: 'visible', width: 1, height: 1 }}>
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(160,160,160,0.6)" />
            </marker>
          </defs>
          {w.links.filter(l => {
            const a = byId(l.a);
            const b = byId(l.b);
            if (!a || !b) return false;
            if (a.isTopic && b.topicId === a.id) return false;
            if (b.isTopic && a.topicId === b.id) return false;
            return true;
          }).map(l => (
            <g key={l.id}>
              <path ref={el => { if (el) pathEls.current[l.id] = el; }}
                className="link-path" fill="none" stroke="rgba(160,160,160,0.35)" strokeWidth="2" strokeLinecap="round" markerEnd={l.isArrow ? "url(#arrow)" : undefined} />
              <path ref={el => { if (el) hitEls.current[l.id] = el; }}
                fill="none" stroke="transparent" strokeWidth="20" style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); setActiveLink(activeLink === l.id ? null : l.id); }} />
            </g>
          ))}

          <path ref={previewRef} fill="none" stroke="rgba(220,220,220,0.65)" strokeWidth="2"
            strokeDasharray="5 5" style={{ display: 'none', pointerEvents: 'none' }} />
          <path ref={threadLineRef} fill="none" stroke="rgba(160,160,160,0.30)" strokeWidth="1.5"
            strokeDasharray="4 7" style={{ display: 'none', pointerEvents: 'none' }} />
          <g ref={sourceTetherGroupRef} style={{ pointerEvents: 'none' }} />
          <g ref={pullTetherGroupRef} style={{ display: 'none', pointerEvents: 'none' }} />
        </svg>

        {/* spawn / delete particle bursts */}
        {(w.bursts || []).map(b => {
          const count = b.big ? 16 : 8;
          const base = b.big ? 60 : 30;
          const spread = b.big ? 34 : 16;
          const col = b.color || 'rgba(200,200,200,0.85)';
          return (
            <div key={b.id} className="burst absolute left-0 top-0 pointer-events-none"
              style={{ transform: `translate(${b.x}px, ${b.y}px)`, zIndex: 5 }}>
              {b.big && (
                <span className="pop" style={{
                  left: -(b.r || 40) + 'px', top: -(b.r || 40) + 'px',
                  width: (b.r || 40) * 2 + 'px', height: (b.r || 40) * 2 + 'px',
                  borderRadius: '9999px', border: `2px solid ${col}`, background: 'transparent',
                  animation: 'pop-ring 0.5s ease-out forwards',
                }} />
              )}
              {Array.from({ length: count }).map((_, i) => {
                const ang = (i / count) * Math.PI * 2 + 0.4;
                const dist = base + (i % 3) * spread;
                return <span key={i} style={{
                  '--dx': Math.cos(ang) * dist + 'px', '--dy': Math.sin(ang) * dist + 'px',
                  background: i % 2 ? col : 'rgba(220,220,220,0.85)',
                }} />;
              })}
            </div>
          );
        })}

        {/* link labels */}
        {w.links.filter(l => l.label).map(l => (
          <span key={'lab' + l.id} ref={el => { if (el) labelEls.current[l.id] = el; }}
            className="absolute left-0 top-0 text-[11px] text-neutral-300/90 px-2 py-0.5 rounded-md will-change-transform pointer-events-none"
            style={{ background: 'rgba(13,21,38,0.85)', border: '1px solid rgba(148,163,184,0.2)' }}>
            {l.label}
          </span>
        ))}



        {/* link edit card */}
        {linkCard && (
          <div data-ui ref={linkCardRef} onPointerDown={e => e.stopPropagation()}
            className="glass absolute left-0 top-0 rounded-xl p-3 w-56 z-20 will-change-transform">
            <div className="text-[11px] uppercase tracking-wider text-neutral-500 mb-1">Connection label</div>
            <input defaultValue={linkCard.label || ''} placeholder="e.g. depends on…" onBlur={() => { bump(); }}
              onChange={e => { linkCard.label = e.target.value; worldRef.current.updated = Date.now(); persist(); }}
              onKeyDown={e => e.key === 'Enter' && (bump(), persist(), setActiveLink(null))}
              className="w-full bg-neutral-800/60 border border-neutral-600/40 rounded-lg px-2.5 py-1.5 text-neutral-100 text-sm mb-2" />
            <div className="flex gap-2 mb-2">
              <button onClick={() => { linkCard.isArrow = !linkCard.isArrow; worldRef.current.updated = Date.now(); bump(); persist(); }}
                className={`flex-1 text-xs border rounded-lg py-1.5 ${linkCard.isArrow ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-200' : 'bg-neutral-800/60 border-neutral-600/40 text-neutral-300 hover:bg-neutral-700'}`}>
                {linkCard.isArrow ? 'Arrow' : 'Line'}
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { bump(); setActiveLink(null); }}
                className="flex-1 text-xs bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-neutral-100 rounded-lg py-1.5">Done</button>
              <button onClick={() => unlink(linkCard.id)}
                className="flex-1 text-xs bg-red-500/10 hover:bg-red-500/25 border border-red-400/30 text-red-300 rounded-lg py-1.5">Unlink</button>
            </div>
          </div>
        )}

        {/* bubbles */}
        {w.nodes.map(n => {
          const c = COLORS[n.color % COLORS.length];
          const isSource = linkFrom === n.id;
          const isSel = selIds.has(n.id);
          const memberCount = n.isHub ? hubMembers(n.id).length : 0;
          const isSuggHighlighted = hoveredSuggThoughtIds && hoveredSuggThoughtIds.has(n.id);
          const isVacuumHighlighted = (vacuumTopicId && vacuumSelectedIds.has(n.id)) || isSuggHighlighted;
          const isVacuumTargetTopic = vacuumTopicId === n.id;
          const nodeOpacity = vacuumTopicId
            ? (isVacuumTargetTopic || isVacuumHighlighted ? 1 : (n.topicId && n.topicId !== vacuumTopicId ? 0.35 : 0.6))
            : (hoveredSuggThoughtIds ? (isSuggHighlighted ? 1 : 0.35) : undefined);
          const isAnsweredQuestion = n.isQuestion && w.links.some(l => l.a === n.id || l.b === n.id);
          const isUnansweredQuestion = n.isQuestion && !isAnsweredQuestion;
          return (
            <div key={n.id} data-bubble data-id={n.id}
              ref={el => { 
                if (el) {
                  nodeEls.current[n.id] = el;
                  if (!observedNodes.current.has(el)) {
                    resizeObserver.current?.observe(el);
                    observedNodes.current.add(el);
                    nodeBounds.current[n.id] = { w: el.offsetWidth / 2, h: el.offsetHeight / 2 };
                  }
                } else {
                  delete nodeEls.current[n.id];
                  delete nodeBounds.current[n.id];
                  // Note: resizeObserver automatically unobserves unmounted elements
                }
              }}
              onPointerDown={onBubbleDown(n)}
              onDoubleClick={e => { e.stopPropagation(); setModalId(n.id); }}
              onMouseEnter={() => { if (n.isTopic && selIds.size > 0) setHoveredPullTopicId(n.id); }}
              onMouseLeave={() => { if (n.isTopic) setHoveredPullTopicId(null); }}
              className="bubble transition-opacity duration-200"
              style={{ opacity: nodeOpacity, cursor: (activeSorterTopicId && !n.isTopic && !n.isHub) || isVacuumHighlighted ? 'pointer' : undefined }}>
                {n.isBurstStart && n.burstTimeStr && (
                  <div className="burst-pill">{n.burstTimeStr}</div>
                )}
                <div className={'bubble-core relative rounded-2xl flex flex-col items-center justify-center text-center px-5 py-3.5 '
                  + (n.isHub ? 'hub-glow' : '') + (n.isTopic ? 'topic-glow' : '') + (n.pinned ? ' pinned-core' : '') + (targetId === n.id ? ' target-ring' : '')
                  + (isVacuumHighlighted ? ' vacuum-highlight' : '') + (isSel && !n.isTopic ? ' ring-2 ring-neutral-300 ring-offset-1' : '')}
                style={{
                  background: n.isHub || n.isTopic
                    ? (theme === 'light' ? '#FFFFFF' : '#2A2A2A')
                    : (n.topicId && n.color === 0 ? 'var(--surface-bg)' : c.bg),
                  border: n.isHub || n.isTopic
                    ? `1.5px solid ${isVacuumTargetTopic || isSel || targetId === n.id || activeTopic === n.id ? (theme === 'light' ? '#000000' : '#FFFFFF') : (theme === 'light' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.20)')}`
                    : `1.5px solid ${isUnansweredQuestion ? 'rgba(239, 68, 68, 0.85)' : isSource || isSel || targetId === n.id ? (theme === 'light' ? '#000000' : '#FFFFFF') : (n.topicId && n.color === 0 ? 'var(--surface-border)' : c.border)}`,
                  color: theme === 'light' ? '#1B1B1B' : '#EAEAEA',
                  boxShadow: n.isHub || n.isTopic
                    ? (theme === 'light' ? '0 12px 32px rgba(0,0,0,0.06)' : '0 12px 32px rgba(0,0,0,0.25)')
                    : 'var(--surface-shadow)',
                  maxWidth: n.isHub ? 260 : n.isTopic ? 240 : 250,
                  minWidth: n.isHub || n.isTopic ? 170 : 0,
                  ...(isSel || isVacuumTargetTopic ? { outline: `2px solid ${theme === 'light' ? '#000000' : '#FFFFFF'}`, outlineOffset: 3 } : {}),
                }}>
                {n.isTopic && selIds.size > 0 && (
                  <div
                    className="absolute -top-3 right-0 bg-neutral-200 text-neutral-900 text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer hover:bg-white shadow border border-neutral-300 transition-colors pointer-events-auto"
                    onPointerDown={(e) => { e.stopPropagation(); executeManualPull(n.id); }}
                  >
                    Pull ({selIds.size})
                  </div>
                )}
                {isVacuumTargetTopic && (
                  <div data-ui
                    onPointerDown={e => e.stopPropagation()}
                    className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full border z-30 animate-pop-in pointer-events-auto whitespace-nowrap"
                    style={{
                      background: theme === 'light' ? '#FFFFFF' : '#2A2A2A',
                      color: theme === 'light' ? '#1B1B1B' : '#EAEAEA',
                      borderColor: theme === 'light' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.20)',
                      boxShadow: theme === 'light' ? '0 8px 24px rgba(0,0,0,0.14)' : '0 8px 24px rgba(0,0,0,0.5)',
                    }}>
                    <button type="button"
                      onClick={e => { e.stopPropagation(); confirmVacuum(); }}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                      title={`Confirm: Pull ${vacuumSelectedIds.size} thought${vacuumSelectedIds.size === 1 ? '' : 's'} into this topic`}>
                      <CheckIcon size={13} />
                      <span>Pull {vacuumSelectedIds.size}</span>
                    </button>
                    <button type="button"
                      onClick={e => { e.stopPropagation(); cancelVacuum(); }}
                      className="p-1 rounded-full text-xs font-semibold hover:bg-neutral-700/40 text-neutral-400 hover:text-neutral-200 transition-colors"
                      title="Cancel Vacuum mode">
                      <XIcon size={13} />
                    </button>
                  </div>
                )}
                {n.isHub && (
                  <span className="flex items-center gap-1 text-[11px] uppercase tracking-wider font-semibold mb-1"
                    style={{ color: theme === 'light' ? '#666666' : '#A3A3A3' }}>
                    <SparkIcon size={12} /> Meta-Hub{n.collapsed ? ` · ${memberCount}` : ''}
                  </span>
                )}
                {n.isTopic && (
                  <div className="flex items-center justify-between w-full mb-1 gap-2">
                    <span className="text-[11px] uppercase tracking-wider font-semibold truncate"
                      style={{ color: theme === 'light' ? '#666666' : '#A3A3A3' }}>
                      ◆ Topic{activeTopic === n.id ? ' · active' : ''}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button data-ui
                        type="button"
                        onPointerDown={e => e.stopPropagation()}
                        onClick={e => { e.stopPropagation(); exportTopicMarkdown(n); }}
                        title="Export Topic to Outline"
                        className={'p-1 rounded-md transition-colors flex items-center justify-center '
                          + (theme === 'light' ? 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/60' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/50')}>
                        <CopyIcon size={13} />
                      </button>
                      <button data-ui
                        type="button"
                        onPointerDown={e => e.stopPropagation()}
                        onClick={e => { e.stopPropagation(); toggleVacuumPreview(n); }}
                        title={isVacuumTargetTopic ? "Exit Smart Vacuum preview" : "Smart Vacuum: scan for matching thoughts"}
                        className={'p-1 rounded-md transition-colors flex items-center justify-center '
                          + (isVacuumTargetTopic ? (theme === 'light' ? 'bg-gray-200 text-gray-900 font-bold' : 'bg-neutral-700 text-neutral-100 font-bold') : (theme === 'light' ? 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/60' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/50'))}>
                        <MagnetIcon size={13} />
                      </button>
                    </div>
                  </div>
                )}
                <span className={n.isHub || n.isTopic ? 'font-display font-bold text-[20px] sm:text-[22px] leading-snug' : 'text-[15px] sm:text-[16px] leading-relaxed font-semibold'}
                  style={{ wordBreak: 'break-word', color: theme === 'light' ? '#1B1B1B' : '#EAEAEA' }}
                  onDoubleClick={(e) => {
                    if (n.isTopic || n.isHub) {
                      e.stopPropagation();
                      const newTitle = window.prompt("Rename Topic:", n.title);
                      if (newTitle !== null && newTitle.trim() !== '') {
                        n.title = newTitle.trim();
                        n.text = newTitle.trim();
                        worldRef.current.updated = Date.now();
                        bump();
                        persist();
                      }
                    }
                  }}>
                  {n.isHub || n.isTopic ? n.title : n.text}
                </span>
                {!n.isHub && n.notes && <span className="mt-1 w-1.5 h-1.5 rounded-full" style={{ background: c.dot === '#737373' ? ACCENT : c.dot }} title="Has notes" />}
                {n.metadata && n.metadata.url && (
                  <a href={n.metadata.url} target="_blank" rel="noopener noreferrer" 
                     className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] transition-colors overflow-hidden max-w-full"
                     style={{ 
                       background: theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.2)', 
                       border: `1px solid ${theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}`,
                       color: theme === 'light' ? '#666' : 'rgba(255,255,255,0.7)' 
                     }}
                     onPointerDown={e => e.stopPropagation()}
                     onMouseEnter={e => { e.currentTarget.style.background = theme === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.4)'; e.currentTarget.style.color = theme === 'light' ? '#000' : '#FFF'; }}
                     onMouseLeave={e => { e.currentTarget.style.background = theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.2)'; e.currentTarget.style.color = theme === 'light' ? '#666' : 'rgba(255,255,255,0.7)'; }}>
                    {n.metadata.favicon && <img src={n.metadata.favicon} alt="" className="w-3 h-3 rounded-sm opacity-80" />}
                    <span className="truncate font-semibold">{(() => { try { return new URL(n.metadata.url).hostname.replace('www.', ''); } catch(e) { return n.metadata.url; } })()}</span>
                  </a>
                )}
                <button data-ui
                  onPointerDown={e => {
                    e.stopPropagation(); e.preventDefault();
                    setLinkFrom(n.id);
                    linkDragRef.current = { from: n.id, moved: false, sx: e.clientX, sy: e.clientY };
                  }}
                  className="link-handle absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-neutral-200"
                  style={{ background: 'rgba(30,41,59,0.95)', border: '1px solid rgba(255,255,255,0.25)', opacity: isSource ? 1 : undefined, touchAction: 'none' }}
                  title={isSource ? 'Drag to a bubble to link · click again to cancel' : 'Drag to another bubble to link'}>
                  <LinkIcon size={13} />
                </button>
                <button data-ui
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); pushUndo(); n.pinned = !n.pinned; n.vx = 0; n.vy = 0; worldRef.current.updated = Date.now(); bump(); persist(); }}
                  className={'link-handle absolute -bottom-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center '
                    + (n.pinned ? 'text-amber-300' : 'text-neutral-300')}
                  style={{ background: n.pinned ? 'rgba(60,45,10,0.95)' : 'rgba(30,41,59,0.95)', border: '1px solid ' + (n.pinned ? 'rgba(251,191,36,0.6)' : 'rgba(148,163,184,0.4)'), opacity: n.pinned ? 1 : undefined, touchAction: 'none' }}
                  title={n.pinned ? 'Unpin — let it drift again' : 'Pin in place — others get pulled toward it'}>
                  <PinIcon size={12} />
                </button>
                <button data-ui
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); setTargetId(targetId === n.id ? null : n.id); }}
                  className="link-handle absolute -bottom-2 -left-2 w-7 h-7 rounded-full flex items-center justify-center text-neutral-200"
                  style={{ background: targetId === n.id ? 'rgba(255,255,255,0.25)' : 'rgba(30,41,59,0.95)', border: '1px solid rgba(255,255,255,0.25)', opacity: targetId === n.id ? 1 : undefined, touchAction: 'none' }}
                  title={targetId === n.id ? 'Replying here — click to stop' : 'Reply to this: new thoughts link here'}>
                  <MsgIcon size={12} />
                </button>
                {!n.isHub && n.isQuestion && (
                  <span className="absolute -top-2 -left-2 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold pointer-events-none transition-colors shadow-sm"
                    style={{ 
                      background: isUnansweredQuestion ? 'rgba(185, 28, 28, 0.95)' : 'rgba(16, 185, 129, 0.95)', 
                      border: isUnansweredQuestion ? '1px solid rgba(248, 113, 113, 0.8)' : '1px solid rgba(52, 211, 153, 0.8)',
                      color: '#FFFFFF'
                    }}
                    title={isUnansweredQuestion ? "Unanswered Question (connect a thought to answer)" : "Answered Question"}>
                    ?
                  </span>
                )}
                {n.topicId && !n.isTopic && !n.isHub && (
                  <button data-ui
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); pushUndo(); n.topicId = null; n.sleeping = false; const v = viewRef.current; const f = document.getElementById('main-chat-form'); if(f){ const r=f.getBoundingClientRect(); n.x = (r.left + r.width/2 - v.x)/v.s; n.y = (r.top - 40 - v.y)/v.s; } else { n.x = (window.innerWidth / 2 - v.x) / v.s; n.y = (window.innerHeight - 150 - v.y) / v.s; } n.vx = 0; n.vy = 0; worldRef.current.updated = Date.now(); bump(); persist(); }}
                    className="link-handle absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full flex items-center justify-center text-red-300 hover:bg-red-950 transition-colors"
                    style={{ background: 'rgba(30,41,59,0.95)', border: '1px solid rgba(239,68,68,0.4)', touchAction: 'none' }}
                    title="Detach from topic">
                    <MinusIcon size={14} />
                  </button>
                )}
                {n.isHub && (
                  <button data-ui
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); n.collapsed = !n.collapsed; worldRef.current.updated = Date.now(); bump(); persist(); }}
                    className="hub-toggle absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-neutral-200"
                    style={{ background: 'rgba(30,41,59,0.95)', border: '1px solid rgba(255,255,255,0.25)', opacity: n.collapsed ? 1 : undefined }}
                    title={n.collapsed ? 'Expand cluster' : 'Collapse cluster'}>
                    {n.collapsed ? <UnfoldIcon size={12} /> : <FoldIcon size={12} />}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* marquee */}
      {marquee && (
        <div className="absolute pointer-events-none z-30 rounded"
          style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.25)' }} />
      )}

      {/* empty state */}
      {!w.nodes.length && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-neutral-500 pointer-events-none">
            <div className="text-4xl mb-3 text-neutral-500/60">✦</div>
            <p className="font-display text-xl text-neutral-400">Type a thought below and press Enter.</p>
            <p className="text-sm mt-1.5 text-neutral-600">The AI weaves connections as ideas pile up.</p>
            <div className="flex gap-2 justify-center mt-5 pointer-events-auto" data-ui>
              {Object.keys(TEMPLATES).map(name => (
                <button key={name} onClick={() => seedTemplate(name)}
                  className="ghost-btn text-xs text-neutral-400 border border-neutral-600/40 rounded-full px-3.5 py-1.5">
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* linking / replay / quick-sorter hint */}
      {(linkFrom || replaying || activeSorterTopicId) && (
        <div data-ui className="glass absolute top-20 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-sm z-30 flex items-center gap-2">
          {replaying && <span className="text-neutral-200">Replaying your stream of thoughts…</span>}
          {linkFrom && <span className="text-neutral-200">Drag onto a bubble to link — or tap one · Esc to cancel</span>}
          {!replaying && !linkFrom && activeSorterTopicId && (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span className="text-amber-200 font-medium">Quick-Sorter Active:</span>
              <span className="text-neutral-200">Click any unsorted bubble to file under <span className="text-neutral-100 font-semibold">“{byId(activeSorterTopicId)?.title}”</span></span>
              <button onClick={() => setActiveSorterTopicId(null)} className="ml-2 text-neutral-400 hover:text-neutral-200 text-xs font-semibold px-2 py-0.5 rounded bg-neutral-800/80 border border-neutral-700/60 transition-colors">Cancel</button>
            </>
          )}
        </div>
      )}

      {/* Selection Toolbar */}
      {selIds.size > 0 && !activeSorterTopicId && !linkFrom && (
        <div data-ui className="absolute bottom-[116px] left-1/2 -translate-x-1/2 flex items-center gap-2.5 bg-neutral-900/90 border border-neutral-700/60 rounded-full px-4 py-2 shadow-2xl z-50 animate-pop-in backdrop-blur-xl pointer-events-auto select-none">
          <span className="text-neutral-300 text-sm font-medium mr-2">{selIds.size} selected</span>
          <button onClick={() => deleteNodes(selIds)} className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1.5 rounded-full font-medium transition-colors border border-red-500/20">Delete</button>
          
          <div className="relative">
             <select 
                onChange={(e) => {
                  const targetId = e.target.value;
                  if (targetId) {
                    moveToProject(targetId);
                  }
                }}
                value=""
                className="appearance-none text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-3 py-1.5 rounded-full font-medium transition-colors border border-blue-500/20 outline-none cursor-pointer pr-6"
             >
                <option value="" disabled>Move to Project...</option>
                {(() => {
                   const history = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]');
                   const store = loadStore();
                   const projects = Object.values(store).filter(s => s.id !== w.id && !history.find(h => h.id === s.id));
                   return projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>);
                })()}
             </select>
             <span className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-300 pointer-events-none text-[10px]">▼</span>
          </div>

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMoveTopicMenuOpen(!moveTopicMenuOpen);
              }}
              className="px-3 py-1.5 rounded-full border border-neutral-700/80 bg-neutral-800/90 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-all flex items-center gap-1.5 shadow-sm"
            >
              <span>Move to Topic...</span>
              <span className="text-[10px]">▼</span>
            </button>

            {moveTopicMenuOpen && (() => {
              const canvasTopics = w.nodes.filter(n => (n.isTopic || n.isHub) && n.title);
              return (
                <div 
                  className="absolute bottom-full left-0 mb-2 w-48 rounded-2xl border border-neutral-700/80 bg-neutral-900/95 backdrop-blur-md shadow-2xl py-1.5 z-50 text-neutral-100 max-h-60 overflow-y-auto"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={() => transferSelectedToTopic(null)}
                    className="w-full text-left px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800/80 hover:text-white flex items-center gap-2 border-b border-neutral-800"
                  >
                    <span>⏏ Remove from Topic</span>
                  </button>

                  {canvasTopics.length > 0 ? (
                    canvasTopics.map(t => (
                      <button
                        key={t.id}
                        onClick={() => transferSelectedToTopic(t.id, t.color)}
                        className="w-full text-left px-3 py-1.5 text-xs text-neutral-200 hover:bg-neutral-800/80 hover:text-white truncate flex items-center gap-2"
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color !== undefined ? `var(--color-${t.color})` : '#6366f1' }} />
                        <span className="truncate">{t.title}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-[11px] text-neutral-500 italic">No topics on canvas</div>
                  )}
                </div>
              );
            })()}
          </div>

          <button onClick={() => setSelIds(new Set())} className="text-neutral-400 hover:text-neutral-200 p-1 ml-1 rounded-full hover:bg-neutral-800 transition-colors">
            <XIcon size={14}/>
          </button>
        </div>
      )}

      {/* unexported notes banner */}
      {unexportedArchiveAlert && (
        <div data-ui className="glass absolute top-[72px] left-1/2 -translate-x-1/2 rounded-full px-4 py-2 text-[13px] z-30 flex items-center gap-3 border border-amber-500/30 bg-amber-500/10 pointer-events-auto shadow-lg">
          <span className="text-amber-200">Yesterday's stream has unexported notes.</span>
          <button onClick={() => {
             const store = loadStore();
             if (store[unexportedArchiveAlert.id]) {
               persist();
               localStorage.setItem(LS_CURRENT, unexportedArchiveAlert.id);
               window.location.reload();
             }
          }} className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 px-2 py-1 rounded font-medium transition-colors">
            View Past Stream
          </button>
          <button onClick={() => setUnexportedArchiveAlert(null)} className="text-neutral-400 hover:text-neutral-200 p-1"><XIcon size={14}/></button>
        </div>
      )}

      {/* header pill */}
      <header data-ui className="glass absolute top-3 left-1/2 -translate-x-1/2 h-12 flex items-center gap-1.5 px-3 z-40 rounded-2xl max-w-[96vw] whitespace-nowrap">
        <span className="font-display flex items-center gap-1.5 font-bold tracking-tight whitespace-nowrap pr-1 text-sm sm:text-base" style={{ color: 'var(--text-main)' }}>
          <SparkIcon size={17} style={{ color: 'var(--text-main)' }} /> ThoughtStream
        </span>
        {/* Editable Canvas Name & Quick Switcher Dropdown */}
        <div className="hidden sm:flex items-center gap-0.5">
          <input
            id="canvas-title-input"
            type="text"
            value={w.name || ''}
            onChange={(e) => {
              w.name = e.target.value;
              w.updated = Date.now();
              bump();
              persist();
              setSessionsRev(r => r + 1);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.target.blur();
                focusInput();
              }
            }}
            onBlur={(e) => {
              const uniqueName = getUniqueCanvasName(e.target.value.trim() || 'Untitled Canvas', w.id);
              if (uniqueName !== w.name) {
                w.name = uniqueName;
                w.updated = Date.now();
                bump();
                persist();
                setSessionsRev(r => r + 1);
              }
            }}
            placeholder="Canvas name..."
            title="Click to rename canvas"
            className="bg-transparent text-neutral-300 hover:text-neutral-100 focus:text-neutral-100 text-sm font-medium outline-none border-b border-transparent focus:border-neutral-500/60 px-1 py-0.5 max-w-[150px] focus:max-w-[220px] transition-all truncate"
          />
          <div className="relative flex items-center justify-center p-1 rounded-md hover:bg-neutral-800/40 text-neutral-400 hover:text-neutral-200 cursor-pointer" title="Switch Canvas">
            <ChevronDownIcon size={14} />
            <select 
              value=""
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'new_project') {
                  newCanvas();
                } else if (val) {
                  const store = loadStore();
                  if (store[val]) {
                    persist();
                    localStorage.setItem(LS_CURRENT, val);
                    window.location.reload();
                  }
                }
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            >
              <option value="" disabled hidden></option>
              {(() => {
                 const history = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]');
                 const store = loadStore();
                 const projects = Object.values(store).filter(s => s.id !== w.id && !history.find(h => h.id === s.id));
                 return (
                   <>
                     {history.length > 0 && (
                       <optgroup label="History">
                         {history.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                       </optgroup>
                     )}
                     {projects.length > 0 && (
                       <optgroup label="Projects">
                         {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                       </optgroup>
                     )}
                     <optgroup label="Actions">
                       <option value="new_project">+ New Canvas</option>
                     </optgroup>
                   </>
                 );
              })()}
            </select>
          </div>
        </div>

        {/* Find Input */}
        <div className="flex items-center gap-1.5 px-2.5 h-8 w-36 sm:w-44 rounded-lg bg-neutral-950/20 border border-neutral-700/30 focus-within:border-neutral-500/50 transition-all ml-1 shrink-0">
          <SearchIcon size={12} className="text-neutral-400 shrink-0" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a thought…"
            className="bg-transparent text-neutral-200 placeholder-neutral-500 text-xs w-full outline-none" />
          {query && <button onClick={() => setQuery('')} className="text-neutral-400 hover:text-neutral-200"><XIcon size={11} /></button>}
        </div>

        <div className="w-px h-5 bg-neutral-600/30 mx-0.5 hidden sm:block" />

        <button onClick={newCanvas} title="New Canvas"
          className="ghost-btn flex items-center gap-1.5 text-[13px] text-neutral-300 rounded-lg px-2.5 py-1.5 whitespace-nowrap">
          <PlusIcon size={14} /> <span className="hidden lg:inline">New</span>
        </button>
        <button onClick={() => { persist(); setSessionsRev(r => r + 1); setDrawerOpen(true); }} title="Saved Streams"
          className="ghost-btn flex items-center gap-1.5 text-[13px] text-neutral-300 rounded-lg px-2.5 py-1.5 whitespace-nowrap">
          <LibraryIcon size={14} /> <span className="hidden lg:inline">Streams</span>
        </button>
        {/*
        <button onClick={() => setPureDump(p => {
            const next = !p;
            if (next) { }
            else { setTimeout(() => runAI(), 250); } // batch scan on exit
            return next;
          })}
          title={pureDump ? 'Pure Dump is on — AI muted. Click to run a batch analysis.' : 'Pure Dump — mute AI suggestions while you dump thoughts'}
          className={'ghost-btn flex items-center gap-1.5 text-[13px] rounded-lg px-2.5 py-1.5 whitespace-nowrap ' + (pureDump ? 'text-amber-300 bg-amber-400/10' : 'text-neutral-300')}>
          <ZapIcon size={14} /> <span className="hidden lg:inline">Pure Dump</span>
        </button>
        */}



        {/* Settings Gear Dropdown Menu */}
        <HeaderMenu exportMarkdown={handleExportMarkdownOutline} exportPNG={() => {}} />
      </header>



      {/* Timer Menu */}
      <TimerMenu startTimer={startTimer} />

      {/* Export Staging Sidebar */}
      <ExportSidebar />

      {/* toolbar */}
      <Toolbar 
        zoomBy={zoomBy} 
        zoomToFit={zoomToFit} 
        undo={undo} 
        redo={redo} 
        undoStackLength={undoStack.current.length} 
        redoStackLength={redoStack.current.length} 
        runAI={runAI} 
        nodesLength={w.nodes.length} 
      />

      {/* AI error note */}
      {aiNote && !pureDump && (
        <div data-ui className="glass absolute bottom-24 right-3 rounded-xl px-3 py-2 text-xs text-amber-300/90 z-30 max-w-[260px]">
          AI fallback: {aiNote}
          <button onClick={() => setAiNote('')} className="ml-2 text-neutral-500 hover:text-neutral-300">✕</button>
        </div>
      )}

      {/* bottom input */}
      <form data-ui id="main-chat-form"
        onSubmit={e => {
          e.preventDefault();
          if (useStore.getState().vacuumTopicId) {
            confirmVacuum();
            return;
          }
          addThought(input);
          setInput('');
        }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-[min(580px,88vw)]">
        {targetNode && (
          <div className="glass rounded-xl flex items-center gap-2 pl-3 pr-2 py-1.5 mb-2 text-[12.5px]">
            <span className="shrink-0">💬</span>
            <span className="text-neutral-500 shrink-0">Replying to:</span>
            <span className="text-neutral-200 truncate flex-1 min-w-0 font-medium">
              “{targetNode.isHub ? targetNode.title : targetNode.text}”
            </span>
            <button type="button" onClick={() => setTargetId(null)}
              className="ghost-btn flex items-center gap-1 text-neutral-400 hover:text-neutral-200 rounded-md px-2 py-1 text-[11px] shrink-0">
              <XIcon size={11} /> Clear
            </button>
          </div>
        )}
        {/* topic dropdown menu */}
        <TopicMenu topics={topics} nodes={w.nodes} createTopic={createTopic} />
        <div className={`glass spotlight-bar flex items-center gap-2 pl-3 pr-2 py-2 transition-all duration-200 ${
          activeSorterTopicId
            ? 'border-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
            : activeTopicNode
              ? 'border-neutral-400/60 shadow-[0_0_20px_rgba(255,255,255,0.08)]'
              : ''
        }`}>
          {activeSorterTopicId || activeTopicNode ? (
            <div
              onClick={() => setTopicMenuOpen(o => !o)}
              title={activeSorterTopicId ? `Quick-Sorter active for: ${byId(activeSorterTopicId)?.title}` : `Routing to: ${activeTopicNode?.title}`}
              className={`flex items-center gap-2 shrink-0 rounded-full px-3 h-8.5 text-xs sm:text-sm transition-all duration-200 border cursor-pointer select-none ${
                activeSorterTopicId
                  ? 'bg-amber-500/20 border-amber-400/50 text-amber-300 font-semibold shadow-inner'
                  : 'bg-neutral-100 border-neutral-200 text-neutral-900 font-bold shadow-md hover:bg-white'
              }`}
            >
              <span className={`shrink-0 text-xs ${activeSorterTopicId ? 'text-amber-300' : 'text-neutral-900 font-bold'}`}>{activeSorterTopicId ? '⚡' : '◆'}</span>
              <span className={`truncate max-w-[130px] ${activeSorterTopicId ? 'font-semibold' : 'font-bold text-neutral-900'}`}>{activeSorterTopicId ? byId(activeSorterTopicId)?.title : activeTopicNode?.title}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (activeSorterTopicId) setActiveSorterTopicId(null);
                  else useStore.getState().setActiveTopic(null);
                  focusInput();
                }}
                title="Clear active topic"
                className={activeSorterTopicId
                  ? "p-0.5 -mr-1 rounded-full text-amber-300/70 hover:text-amber-200 hover:bg-amber-500/30 transition-colors shrink-0"
                  : "p-0.5 -mr-1 rounded-full text-neutral-500 hover:text-neutral-950 hover:bg-neutral-200/80 transition-colors shrink-0"
                }
              >
                <XIcon size={12} />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setTopicMenuOpen(o => !o)}
              title="Choose a topic — new thoughts drift into its cluster"
              className="flex items-center gap-1.5 shrink-0 rounded-full px-3 h-8.5 text-[13px] font-medium border max-w-[140px] transition-colors"
              style={{
                background: theme === 'light' ? '#F3F4F6' : '#2A2A2A',
                borderColor: theme === 'light' ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)',
                color: theme === 'light' ? '#1B1B1B' : '#EAEAEA'
              }}>
              <span className="shrink-0">◆</span>
              <span className="truncate">+ Topic</span>
            </button>
          )}
          
          {slashQuery !== null && (
            <div className={`absolute bottom-full mb-2 left-0 w-64 rounded-xl shadow-2xl border overflow-hidden z-50 flex flex-col max-h-48 overflow-y-auto py-1 backdrop-blur-md select-none pointer-events-auto ${theme === 'light' ? 'bg-white/95 border-neutral-300' : 'bg-neutral-900/95 border-neutral-700/80'}`}
                 onPointerDown={e => e.stopPropagation()}
                 onClick={e => e.stopPropagation()}
                 onDoubleClick={e => e.stopPropagation()}>
              {(() => {
                const filteredTopics = w.nodes.filter(n => n.isTopic && n.title.toLowerCase().includes(slashQuery));
                if (filteredTopics.length === 0) {
                  return <div className="px-3 py-2 text-[13px] text-neutral-500 italic">No matching topics...</div>;
                }
                return filteredTopics.map((topic, idx) => (
                  <div key={topic.id}
                       className="px-3 py-1.5 text-[13px] font-medium cursor-pointer transition-colors"
                       onClick={() => {
                         const newVal = input.replace(/(?:^|\s)\/[a-zA-Z0-9_-]*$/, '');
                         setInput(newVal);
                         setSlashQuery(null);
                         useStore.getState().setActiveTopic(topic.id);
                       }}
                       style={{
                         background: idx === slashIndex 
                           ? (theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)') 
                           : 'transparent',
                         color: idx === slashIndex
                           ? (theme === 'light' ? '#000' : '#FFF')
                           : (theme === 'light' ? '#444' : '#CCC')
                       }}>
                    <span className="text-neutral-500 mr-2">◆</span>
                    {topic.title}
                  </div>
                ));
              })()}
            </div>
          )}

          <input id="thought-input" autoFocus value={input} onChange={handleInputChange} onKeyDown={handleInputKeyDown} onPaste={onPaste}
            placeholder={
              activeSorterTopicId
                ? `Quick-Sorter active for “${byId(activeSorterTopicId)?.title}”…`
                : activeTopicNode
                  ? `Adding to “${activeTopicNode.title}”…`
                  : 'Drop a thought…'
            } autoComplete="off"
            className="flex-1 bg-transparent text-inherit placeholder-neutral-500 text-[15px] min-w-0 font-medium outline-none px-1" />
          {speechSupported && (
            <button type="button" onClick={toggleVoice} title={listening ? 'Stop voice capture' : 'Speak thoughts'}
              className={'w-9 h-9 rounded-full flex items-center justify-center border ' + (listening
                ? 'mic-live text-neutral-100 bg-neutral-800 border-neutral-500'
                : 'text-neutral-400 bg-neutral-700/30 border-neutral-500/30 hover:text-neutral-200')}>
              <MicIcon size={15} />
            </button>
          )}
          <button type="submit"
            className="w-9 h-9 rounded-full flex items-center justify-center text-white bg-neutral-900 hover:bg-black dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 transition-all shadow-md">
            <SendIcon size={16} />
          </button>
        </div>
        <p className="text-center text-[11px] text-neutral-500/80 mt-2 font-medium">
          Enter to add · ◆ pick a Topic to cluster thoughts · 💬 thread replies · drag 🔗 to link · 📌 pin
        </p>
      </form>

      {/* bottom-right AI Topic suggestions */}
      {(() => {
        const looseIds = new Set(w.nodes.filter(n => !n.isTopic && !n.isHub && !n.topicId).map(n => n.id));
        const activeSuggestions = useStore.getState().aiTopicSuggestions.map(sugg => {
          const members = (sugg.thoughtIds || []).filter(id => looseIds.has(id));
          if (members.length === 0) return null;
          
          const exists = w.nodes.some(n => (n.isHub || n.isTopic) && n.title && n.title.toLowerCase() === sugg.topicName.toLowerCase());
          const minRequired = exists ? 1 : 5;
          
          if (members.length >= minRequired) {
            const count = members.length;
            const title = sugg.topicName;
            const text = exists
              ? `Add ${count} thought${count > 1 ? 's' : ''} to '${title}'`
              : `Group ${count} thoughts into '${title}'`;
              
            return { ...sugg, members, text };
          }
          return null;
        }).filter(Boolean);

        if (pureDump || activeSuggestions.length === 0) return null;
        return (
          <div data-ui className="absolute bottom-6 right-6 z-50 flex flex-col items-end gap-2">
            {activeSuggestions.map((sugg) => (
              <div key={sugg.id}
                   className="glass flex items-center gap-3 px-4 py-2 rounded-full cursor-pointer border border-neutral-700/50 hover:bg-white/5 hover:scale-[1.02] hover:border-amber-400/40 transition-all duration-200 shadow-lg animate-pop-in"
                   onMouseEnter={() => setHoveredSuggThoughtIds(new Set(sugg.thoughtIds))}
                   onMouseLeave={() => setHoveredSuggThoughtIds(null)}
                   onClick={() => {
                     setHoveredSuggThoughtIds(null);
                     const t = createTopic(sugg.topicName);
                     if (t) {
                       toggleVacuumPreview(t);
                       useStore.getState().setAiTopicSuggestions(
                         useStore.getState().aiTopicSuggestions.filter(s => s.id !== sugg.id)
                       );
                     }
                   }}>
                <SparkIcon size={14} className="text-amber-400 shrink-0" />
                <span className="text-[13px] font-semibold text-neutral-100 whitespace-nowrap">{sugg.text}</span>
                <button
                  className="p-1 ml-1 rounded-full text-neutral-500 hover:text-neutral-200 hover:bg-neutral-700/50 transition-colors shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHoveredSuggThoughtIds(null);
                    useStore.getState().setAiTopicSuggestions(
                      useStore.getState().aiTopicSuggestions.filter(s => s.id !== sugg.id)
                    );
                  }}>
                  <XIcon size={11} />
                </button>
              </div>
            ))}
          </div>
        );
      })()}

      {/* edit modal */}
      <EditThoughtModal 
        modalNode={modalNode}
        expandThought={expandThought}
        expandBusy={expandBusy}
        pushUndo={pushUndo}
        worldRef={worldRef}
        bump={bump}
        persist={persist}
        deleteNodes={deleteNodes}
        onClose={focusInput}
      />

      {/* settings modal */}
      <SettingsModal onApiKeySet={() => { lastAIHashRef.current = ''; runAI(); }} onClose={focusInput} />

      <Sidebar 
        sessionList={sessionList} 
        sessionsRev={sessionsRev} 
        currentWorldId={w.id} 
        renameSession={renameSession} 
        openSession={openSession} 
        duplicateSession={duplicateSession} 
        deleteSession={deleteSession} 
        onCreateNewProject={() => { 
          createProject("New Project");
          useStore.getState().setProjects(loadProjects());
        }}
        renameProject={renameProject}
        deleteProject={deleteProjectHandler}
        onCreateCanvasInProject={newCanvas}
        moveCanvasToProject={moveCanvasToProject}
      />
    </div>
  );
}

export default App;
