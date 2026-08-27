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
import { UIOverlay } from './components/overlays/UIOverlay';

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
  const seedTemplate = (name) => {
    pushUndo();
    TEMPLATES[name].forEach((t, i) => setTimeout(() => addThought(t, { skipUndo: true }), i * 320));
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

      <UIOverlay
        worldRef={worldRef}
        addThought={addThought}
        deleteNodes={deleteNodes}
        pushUndo={pushUndo}
        bump={bump}
        persist={persist}
        createTopic={createTopic}
        confirmVacuum={confirmVacuum}
        toggleVacuumPreview={toggleVacuumPreview}
        executeManualPull={executeManualPull}
        transferSelectedToTopic={transferSelectedToTopic}
        cancelVacuum={cancelVacuum}
        moveCanvasToProject={moveCanvasToProject}
        setSessionsRev={setSessionsRev}
        newCanvas={newCanvas}
        focusInput={focusInput}
        toggleVoice={toggleVoice}
        handleExportMarkdownOutline={handleExportMarkdownOutline}
        getUniqueCanvasName={getUniqueCanvasName}
        speechSupported={speechSupported}
        setHoveredSuggThoughtIds={setHoveredSuggThoughtIds}
      />

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
