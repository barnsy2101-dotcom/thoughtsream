import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useGlobalInteractions } from './hooks/useGlobalInteractions';
import { CanvasEngine } from './engine/CanvasEngine';

import { COLORS, CATEGORIES, STOP, TEMPLATES, LS_SESSIONS, LS_CURRENT, LS_APIKEY, LS_HISTORY, LS_LAST_ACTIVE, ACCENT, TOPIC_ACCENT } from './utils/constants';
import { uid, pairKey, clamp, keywords, topicOf, nodeRadius, formatTime } from './utils/helpers';
import { fitViewForNodes, applyCollisions, applyLinkForces, applyTopicGravity, integrateVelocities } from './utils/physics';
import { loadStore, saveStore, blankWorld, pickNode, serializeWorld, hydrateNode, createProject, loadProjects, saveProjects } from './utils/storage';

import { 
  ZapIcon, AlarmIcon, SendIcon, PlusIcon, MinusIcon, LibraryIcon, XIcon, 
  TrashIcon, LinkIcon, CopyIcon, SparkIcon, CheckIcon, UndoIcon, RedoIcon, 
  FitIcon, SearchIcon, MicIcon, PlayIcon, GearIcon, DownloadIcon, FoldIcon, 
  UnfoldIcon, ZapIcon_, PinIcon, MsgIcon, ClockIcon, MagnetIcon, ChevronDownIcon, ArrowUpRightIcon 
} from './components/icons';

import { useStore } from './store/useStore';
import { LiveOutline } from './components/LiveOutline';
import { Sidebar } from './components/Sidebar';
import { SettingsModal } from './components/SettingsModal';
import { TopicMenu } from './components/TopicMenu';
import { EditThoughtModal } from './components/EditThoughtModal';
import { Toolbar } from './components/Toolbar';
import { TimerMenu } from './components/TimerMenu';
import { HeaderMenu } from './components/HeaderMenu';
import { ExportSidebar } from './components/ExportSidebar';

import { useCanvasRefs } from './hooks/useCanvasRefs';
import { useWorkspace } from './hooks/useWorkspace';
import { useAI } from './hooks/useAI';
import { useCanvasMutators } from './hooks/useCanvasMutators';








function App() {
  const [, setRev] = useState(0);
  const bump = useCallback(() => setRev(r => r + 1), []);
  const [inboxHeight, setInboxHeight] = useState(() => {
    return parseInt(localStorage.getItem('ts_inboxHeight') || '180', 10);
  });
  const isDraggingInboxRef = useRef(false);

  useEffect(() => {
    const handleMove = (e) => {
      if (!isDraggingInboxRef.current) return;
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight >= 60 && newHeight <= window.innerHeight * 0.8) {
        setInboxHeight(newHeight);
      }
    };
    const handleUp = () => {
      if (isDraggingInboxRef.current) {
        isDraggingInboxRef.current = false;
        document.body.style.cursor = '';
      }
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('ts_inboxHeight', inboxHeight);
  }, [inboxHeight]);

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
  const [slashIsDouble, setSlashIsDouble] = useState(false);
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
  const splitViewOpen = useStore(s => s.splitViewOpen);
  const focusedOutlineId = useStore(s => s.focusedOutlineId);
  const setFocusedOutlineId = useStore(s => s.setFocusedOutlineId);
  const setSplitViewOpen = useStore(s => s.setSplitViewOpen);
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

  useEffect(() => {
    setMoveTopicMenuOpen(false);
  }, [selIds]);

  const transferSelectedToTopic = (targetTopicId, targetColor) => {
    const selectedIds = useStore.getState().selIds;
    if (selectedIds.size === 0) return;
    const w = worldRef.current;
    
    let targetTopic = null;
    if (targetTopicId) {
      targetTopic = w.nodes.find(node => node.id === targetTopicId);
    }
    
    w.nodes.forEach(n => {
      if (selectedIds.has(n.id) && !n.isTopic && !n.isHub) {
        n.topicId = targetTopicId || null;
        if (targetColor !== undefined) n.color = targetColor;
        
        if (targetTopic) {
          // INSTANT TELEPORT: Place them perfectly into the aura
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
    worldRef.current.updated = Date.now();
    bump();
    persist();
    setMoveTopicMenuOpen(false);
    setSelIds(new Set());
  };


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

  // Local helpers — used throughout App.jsx and passed to renderCanvasDOM
  const byId = (id) => worldRef.current.nodes.find(n => n.id === id);
  const screenToWorld = (sx, sy) => { const v = viewRef.current; return { x: (sx - v.x) / v.s, y: (sy - v.y) / v.s }; };

  // ── Phase 1: DOM & interaction refs (must come before useEffects that reference them) ──
  const {
    containerRef, worldElRef, bgRef, nodeEls, pathEls, hitEls, labelEls, badgeEls,
    suggCardRef, linkCardRef, previewRef, mouseRef, dragRef, panRef, marqueeStartRef,
    linkDragRef, zoneEls, threadLineRef, nodeBounds, observedNodes, resizeObserver,
    lastAIHashRef, undoStack, redoStack, recRef, pullTetherGroupRef, sourceTetherGroupRef
  } = useCanvasRefs();

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

  // ── Phase 2: Workspace management ─────────────────────────────────────────
  const {
    persist, getUniqueCanvasName, switchWorld, newCanvas,
    openSession, renameSession, duplicateSession, deleteSession,
    renameProject, deleteProjectHandler, moveCanvasToProject, tsSwitchToToday
  } = useWorkspace({
    worldRef, viewRef, undoStack, redoStack, lastAIHashRef,
    setActiveWorldId, bump, setSessionsRev, setModalId,
    setActiveLink, setLinkFrom, setSelIds, setReplayIdx,
    setTargetId, setActiveTopic, setTopicMenuOpen, setMenuOpen,
    setInput, setDrawerOpen
  });

  // ── Phase 3: Graph mutation functions ─────────────────────────────────────
  const {
    spawnBurst, pushUndo, restoreSnapshot, undo, redo,
    createTopic, toggleVacuumPreview, confirmVacuum, cancelVacuum,
    executeManualPull, createLink, unlink, deleteNodes,
    moveNodeAndChildrenToTopic, panToNode
  } = useCanvasMutators({
    worldRef, viewRef, undoStack, redoStack, nodeBounds, bump, persist,
    callAI: null, // provided via useAI below; vacuum AI fallback handles null gracefully
    setModalId, setActiveLink, setSelIds, setTargetId, setActiveTopic,
    setVacuumTopicId, setVacuumSelectedIds
  });

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


  /* ---------- undo / redo ---------- */

  /* ---------- particle bursts ---------- */

  /* ---------- topics (manual gravity clusters, no links) ---------- */





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
    useStore.getState().setSplitViewOpen(false);
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
      inInbox: !topicId,
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
    addThought._t = setTimeout(() => {
      if (useStore.getState().autoAIEnabled) runAI();
    }, 8000);
    return n;
  }, []);

  // ── Phase 2: AI functions (needs addThought from above) ──────────────────
  const { simulateAI, callAI, runAI, expandThought } = useAI({
    worldRef, lastAIHashRef, bump, addThought, pushUndo,
    setAiBusy, setAiNote, setExpandBusy, setModalId
  });

  // ── Phase 4: Global interaction controllers ────────────────────────────────
  useGlobalInteractions({
    // Refs
    containerRef, viewRef, mouseRef, linkDragRef, marqueeStartRef,
    panRef, dragRef, worldRef, previewRef,
    // Mutators
    createLink, pushUndo, spawnBurst, confirmVacuum, undo, redo, deleteNodes,
    bump, persist,
    // Local helpers
    screenToWorld, byId,
    // Zustand setters
    setMarquee, setLinkFrom, setSelIds,
    setSlashQuery, setSlashIsDouble, setHoveredSuggThoughtIds,
    setActiveLink, setModalId, setTargetId, setActiveTopic,
    setFocusedOutlineId, setActiveSorterTopicId, setVacuumTopicId,
    setVacuumSelectedIds, setReplayIdx, setDrawerOpen, setSettingsOpen,
    setExportOpen, setMenuOpen, setTopicMenuOpen, setTimerMenuOpen,
    setMoveTopicMenuOpen,
  });

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
  // simulateAI, callAI, runAI, expandThought are provided by useAI hook (instantiated below)

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


  /* ---------- links ---------- */



  /* ---------- sessions ---------- */



  // Returns a unique canvas name by appending a counter if a conflict exists





  
  // tsSwitchToToday is provided by useWorkspace hook (bound to window.tsSwitchToToday inside that hook)

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
  // ── Wheel, pointermove/pointerup, keydown → moved to useGlobalInteractions (Phase 4)



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

  // ── keydown → moved to useGlobalInteractions (Phase 4)

  const onBackgroundDown = (e) => {
    if (e.target.closest('[data-ui]')) {
      if (menuOpen) setMenuOpen(false);
      if (timerMenuOpen) setTimerMenuOpen(false);
      return;
    }
    setMenuOpen(false);
    setTopicMenuOpen(false);
    setTimerMenuOpen(false);
    setMoveTopicMenuOpen(false);
    
    // NEW: Instantly close the Streams sidebar when clicking the canvas
    setDrawerOpen(false); 

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
    const currentState = useStore.getState();
    if (currentState.linkFrom === 'toolbar_active') {
      setLinkFrom(node.id);
      return;
    }
    if (currentState.linkFrom && currentState.linkFrom !== 'toolbar_active' && currentState.linkFrom !== node.id) {
      const exists = worldRef.current.links.some(l => 
        (l.a === currentState.linkFrom && l.b === node.id) || (l.a === node.id && l.b === currentState.linkFrom)
      );
      if (!exists) {
        createLink(currentState.linkFrom, node.id, false, { isArrow: true });
      }
      setLinkFrom(null);
      return;
    }
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
    const baseGroupIds = useStore.getState().selIds.has(node.id) 
      ? new Set(useStore.getState().selIds) 
      : new Set([node.id]);
    
    // CONSTELLATION DRAG: Recursively find all downstream connected bubbles
    const w = worldRef.current;
    const groupIds = new Set(baseGroupIds);
    
    const addDescendants = (parentId) => {
      // 1. Grab link descendants (arrows)
      w.links.forEach(l => {
        if (l.a === parentId && !groupIds.has(l.b)) {
          groupIds.add(l.b);
          addDescendants(l.b); // Traverse deeper
        }
      });
      
      // 2. Grab topic descendants (bubbles inside the topic's aura)
      w.nodes.forEach(n => {
        if (n.topicId === parentId && !groupIds.has(n.id)) {
          groupIds.add(n.id);
          addDescendants(n.id); // Traverse deeper in case they have linked arrows
        }
      });
    };
    
    // Start traversal for all explicitly selected/clicked nodes
    const initialIds = [...groupIds];
    initialIds.forEach(id => addDescendants(id));
    
    const group = [...groupIds].map(byId).filter(Boolean).map(n => ({ 
      n, 
      offX: p.x - n.x, 
      offY: p.y - n.y 
    }));
    
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

    const doubleSlashMatch = val.match(/(?:^|\s)\/\/(.*)$/);
    if (doubleSlashMatch) {
      setSlashQuery(doubleSlashMatch[1]);
      setSlashIsDouble(true);
      setSlashIndex(0);
      return;
    }

    const slashMatch = val.match(/(?:^|\s)\/([a-zA-Z0-9_-]*)$/);
    if (slashMatch) {
      setSlashQuery(slashMatch[1].toLowerCase());
      setSlashIsDouble(false);
      setSlashIndex(0);
      return;
    }

    setSlashQuery(null);
    setSlashIsDouble(false);
  };

  const handleInputKeyDown = (e) => {
    // If the pull/vacuum mode is active, Enter confirms the pull
    if (e.key === 'Enter' && useStore.getState().vacuumTopicId) {
      e.preventDefault();
      confirmVacuum();
      return;
    }

    if (activeTopic) {
      const isArrow = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key);
      
      // Trigger if input is empty OR if Option/Alt is held down
      if (isArrow && (input === '' || e.altKey)) {
        e.preventDefault();
        const currentTopicNode = worldRef.current.nodes.find(n => n.id === activeTopic);
        if (!currentTopicNode) return;

        // Filter to only other topics
        const otherTopics = worldRef.current.nodes.filter(n => n.isTopic && n.id !== activeTopic);
        if (otherTopics.length === 0) return;

        let candidates = [];
        if (e.key === 'ArrowRight') candidates = otherTopics.filter(n => n.x > currentTopicNode.x);
        if (e.key === 'ArrowLeft') candidates = otherTopics.filter(n => n.x < currentTopicNode.x);
        if (e.key === 'ArrowDown') candidates = otherTopics.filter(n => n.y > currentTopicNode.y);
        if (e.key === 'ArrowUp') candidates = otherTopics.filter(n => n.y < currentTopicNode.y);

        if (candidates.length > 0) {
          // Find the closest candidate in that direction
          let closest = candidates[0];
          let minTargetDist = Infinity;
          
          for (const c of candidates) {
            const dist = Math.hypot(c.x - currentTopicNode.x, c.y - currentTopicNode.y);
            if (dist < minTargetDist) {
              minTargetDist = dist;
              closest = c;
            }
          }
          
          useStore.getState().setActiveTopic(closest.id);
        }
        return;
      }
    }
    if (slashQuery !== null) {
      if (slashIsDouble) {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (slashQuery.trim()) {
            const t = createTopic(slashQuery.trim());
            if (t) {
              const newVal = input.replace(/(?:^|\s)\/\/.*$/, '');
              setInput(newVal);
              setSlashQuery(null);
              setSlashIsDouble(false);
            }
          }
        }
        return;
      }

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
    <>
      <div ref={containerRef} className={`fixed top-0 left-0 bottom-0 select-none ${activeSorterTopicId ? 'cursor-crosshair' : ''}`} 
           style={{ right: splitViewOpen ? '380px' : '0', transition: 'right 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }} 
           onPointerDown={onBackgroundDown}
           onDragOver={(e) => e.preventDefault()}
           onDrop={(e) => {
             e.preventDefault();
             const dataStr = e.dataTransfer.getData('application/json');
             if (!dataStr) return;
             try {
               const data = JSON.parse(dataStr);
               if (data.type === 'inbox-thought') {
                 const w = worldRef.current;
                 const v = viewRef.current;
                 const node = w.nodes.find(n => n.id === data.id);
                 if (node) {
                   node.inInbox = false; // Remove from inbox
                   // Teleport to the exact canvas coordinate where dropped
                   node.x = (e.clientX - v.x) / v.s;
                   node.y = (e.clientY - v.y) / v.s;
                   node.vx = 0; 
                   node.vy = 0;
                   node.sleeping = false;
                   w.updated = Date.now();
                   bump();
                   persist();
                 }
               }
             } catch (err) {}
           }}>
      <div id="bg-grad" />
      <div id="bg-dots" ref={bgRef} />

      {/* world layer */}
      <CanvasEngine
        worldRef={worldRef}
        viewRef={viewRef}
        theme={theme}
        selIds={selIds}
        activeLink={activeLink}
        hoveredSuggThoughtIds={hoveredSuggThoughtIds}
        vacuumTopicId={vacuumTopicId}
        vacuumSelectedIds={vacuumSelectedIds}
        activeTopic={activeTopic}
        targetId={targetId}
        linkFrom={linkFrom}
        activeSorterTopicId={activeSorterTopicId}
        focusedOutlineId={focusedOutlineId}
        replayIdx={replayIdx}
        worldElRef={worldElRef}
        bgRef={bgRef}
        nodeEls={nodeEls}
        zoneEls={zoneEls}
        pathEls={pathEls}
        hitEls={hitEls}
        labelEls={labelEls}
        badgeEls={badgeEls}
        linkCardRef={linkCardRef}
        previewRef={previewRef}
        threadLineRef={threadLineRef}
        nodeBounds={nodeBounds}
        observedNodes={observedNodes}
        resizeObserver={resizeObserver}
        mouseRef={mouseRef}
        pullTetherGroupRef={pullTetherGroupRef}
        sourceTetherGroupRef={sourceTetherGroupRef}
        dragRef={dragRef}
        onBubbleDown={onBubbleDown}
        confirmVacuum={confirmVacuum}
        cancelVacuum={cancelVacuum}
        executeManualPull={executeManualPull}
        exportTopicMarkdown={exportTopicMarkdown}
        toggleVacuumPreview={toggleVacuumPreview}
        pushUndo={pushUndo}
        unlink={unlink}
        bump={bump}
        persist={persist}
        setTargetId={setTargetId}
        setModalId={setModalId}
        setHoveredPullTopicId={setHoveredPullTopicId}
        setActiveLink={setActiveLink}
        createTopic={createTopic}
      />

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
          {linkFrom === 'toolbar_active' && <span className="text-neutral-200"><span className="text-cyan-300 font-bold mr-1">↗ Arrow Mode:</span> Click any thought to set source (ESC to cancel)</span>}
          {linkFrom && linkFrom !== 'toolbar_active' && <span className="text-neutral-200"><span className="text-cyan-300 font-bold mr-1">↗ Arrow Mode:</span> Click a target thought to connect (ESC to cancel)</span>}
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


        <div className="w-px h-5 bg-neutral-600/30 mx-1 hidden sm:block" />
        <button onClick={() => setSplitViewOpen(!splitViewOpen)} title="Toggle Live Outline"
          className={`ghost-btn flex items-center gap-1.5 text-[13px] rounded-lg px-2.5 py-1.5 whitespace-nowrap transition-colors ${splitViewOpen ? 'bg-neutral-200 text-neutral-900 font-bold hover:bg-white' : 'text-neutral-300'}`}>
          <span className="hidden lg:inline">Split View</span>
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

      {/* Left Edge Streams Tab */}
      {!drawerOpen && (
        <div data-ui
          onClick={() => { persist(); setSessionsRev(r => r + 1); setDrawerOpen(true); }}
          title="Open Streams"
          className="fixed left-0 top-1/2 -translate-y-1/2 z-40 glass rounded-r-xl px-1.5 py-6 flex flex-col items-center gap-3 cursor-pointer hover:bg-neutral-800/60 transition-all border-l-0 shadow-[4px_0_24px_rgba(0,0,0,0.2)] group"
        >
          <LibraryIcon size={16} className="text-neutral-400 group-hover:text-amber-400 transition-colors" />
          <span 
            className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 group-hover:text-neutral-300 transition-colors" 
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Streams
          </span>
        </div>
      )}



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
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[min(580px,88vw)]">
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
              {slashIsDouble ? (
                <div
                  className="px-3 py-2 text-[13px] font-medium cursor-pointer transition-colors hover:bg-indigo-600/20"
                  style={{ color: theme === 'light' ? '#1B1B1B' : '#EAEAEA' }}
                  onClick={() => {
                    if (slashQuery.trim()) {
                      const t = createTopic(slashQuery.trim());
                      if (t) {
                        const newVal = input.replace(/(?:^|\s)\/\/.*$/, '');
                        setInput(newVal);
                        setSlashQuery(null);
                        setSlashIsDouble(false);
                      }
                    }
                  }}
                >
                  <span className="text-indigo-500 mr-2 font-bold">+</span>
                  Create topic: <span className="font-bold">"{slashQuery || '...'}"</span>
                  <div className="text-[10px] opacity-60 mt-0.5 ml-5">Press Enter to create</div>
                </div>
              ) : (
                (() => {
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
              })())}
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

      {/* --- THE HORIZON LINE --- */}
      <div 
        className="fixed left-0 right-0 z-20 cursor-ns-resize flex items-center justify-center group"
        style={{ bottom: `${inboxHeight - 10}px`, height: '20px' }}
        onPointerDown={(e) => {
          e.stopPropagation();
          isDraggingInboxRef.current = true;
          document.body.style.cursor = 'ns-resize';
        }}
      >
        <div className="w-full border-b-[2px] border-dotted border-neutral-500/30 group-hover:border-neutral-400" />
      </div>

      {/* --- THE STATIC INBOX CANVAS --- */}
      <div 
        className="fixed left-0 right-0 bottom-0 z-10 p-6 pb-24 flex flex-wrap content-start gap-4 overflow-y-auto"
        style={{ height: `${inboxHeight}px`, background: theme === 'light' ? 'rgba(249, 249, 247, 0.4)' : 'rgba(18, 18, 18, 0.4)', backdropFilter: 'blur(4px)' }}
      >
        {w.nodes.filter(n => n.inInbox).map(n => (
          <div
            key={n.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('application/json', JSON.stringify({ type: 'inbox-thought', id: n.id }));
            }}
            className="px-4 py-2.5 rounded-full cursor-grab active:cursor-grabbing shadow-md transition-transform hover:scale-105 flex items-center justify-center font-medium"
            style={{
              background: theme === 'light' ? '#FFFFFF' : '#2A2A2A',
              borderColor: theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
              borderWidth: '1px',
              color: theme === 'light' ? '#1B1B1B' : '#EAEAEA',
              fontSize: '13px',
              maxWidth: '300px',
              wordBreak: 'break-word'
            }}
          >
            {n.text}
          </div>
        ))}
      </div>
    </div>

    <LiveOutline 
      nodes={w.nodes} 
      onExport={handleExportMarkdownOutline} 
      worldRef={worldRef}
      bump={bump}
      persist={persist}
      addThought={addThought}
      deleteNodes={deleteNodes}
      moveNodeAndChildrenToTopic={moveNodeAndChildrenToTopic}
      panToNode={panToNode}
    />
  </>
  );
}

export default App;
