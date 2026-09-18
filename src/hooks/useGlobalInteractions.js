import { useEffect } from 'react';
import { clamp } from '../utils/helpers';
import { TOPIC_ACCENT } from '../utils/constants';
import { useStore } from '../store/useStore';

/**
 * Phase 4 – Interaction Controllers
 * Encapsulates the three global DOM event useEffect blocks that were
 * previously inline in App.jsx:
 *   1. wheel   – zoom on containerRef
 *   2. pointermove / pointerup – drag, pan, marquee, link-drop
 *   3. keydown – keyboard shortcuts (undo/redo, delete, escape, …)
 *
 * IMPORTANT: All dependency arrays are kept exactly as they were in
 * App.jsx.  The handlers deliberately rely on mutable refs and
 * useStore.getState() to avoid stale closures – do NOT add the passed
 * deps to the arrays.
 */
export function useGlobalInteractions({
  // Refs
  containerRef, viewRef, mouseRef, linkDragRef, marqueeStartRef,
  panRef, dragRef, worldRef, previewRef,
  // Mutators
  createLink, pushUndo, spawnBurst, confirmVacuum, undo, redo, deleteNodes,
  bump, persist,
  // Local helpers (recreated each render in App – passed via closure)
  screenToWorld, byId,
  // Zustand setters
  setMarquee, setLinkFrom, setSelIds,
  setSlashQuery, setSlashIsDouble, setStagingSuggId, setStagingNodeIds,
  setActiveLink, setModalId, setTargetId, setActiveTopic,
  setFocusedOutlineId, setActiveSorterTopicId, setVacuumTopicId,
  setVacuumSelectedIds, setReplayIdx, setDrawerOpen, setSettingsOpen,
  setExportOpen, setMenuOpen, setTopicMenuOpen, setTimerMenuOpen,
  setMoveTopicMenuOpen,
}) {

  // ── 1. Wheel → zoom ────────────────────────────────────────────────────────
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

  // ── 2. Pointermove / Pointerup → drag, pan, marquee, link-drop ────────────
  useEffect(() => {
    const onMove = (e) => {
      mouseRef.current = screenToWorld(e.clientX, e.clientY);
      
      const drawingPreview = useStore.getState().drawingPreview;
      if (drawingPreview) {
        const p = screenToWorld(e.clientX, e.clientY);
        useStore.getState().setDrawingPreview({
          ...drawingPreview,
          endX: p.x,
          endY: p.y
        });
        return;
      }

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
      const drawingPreview = useStore.getState().drawingPreview;
      if (drawingPreview) {
        if (Math.hypot(drawingPreview.endX - drawingPreview.startX, drawingPreview.endY - drawingPreview.startY) > 5) {
          pushUndo();
          if (!worldRef.current.annotations) worldRef.current.annotations = [];
          
          let { startX, startY, endX, endY } = drawingPreview;
          if (drawingPreview.tool === 'rect') {
             // normalize rect
             const minX = Math.min(startX, endX);
             const maxX = Math.max(startX, endX);
             const minY = Math.min(startY, endY);
             const maxY = Math.max(startY, endY);
             startX = minX;
             endX = maxX;
             startY = minY;
             endY = maxY;
          }

          worldRef.current.annotations.push({
            id: 'ann_' + Date.now(),
            tool: drawingPreview.tool,
            startX,
            startY,
            endX,
            endY
          });
          worldRef.current.updated = Date.now();
          bump();
          persist();
        }
        useStore.getState().setDrawingPreview(null);
        useStore.getState().setActiveDrawTool(null);
        return;
      }

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

  // ── 3. Keydown → shortcuts ─────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      const typing = /INPUT|TEXTAREA/.test(document.activeElement && document.activeElement.tagName);
      
      // Auto-focus typing mechanic: if pressing a regular character key while not typing, focus input
      if (!typing && e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        document.getElementById('thought-input')?.focus();
      }

      // Snap staging mode with Enter key
      if (e.key === 'Enter' && useStore.getState().stagingSuggId) {
        e.preventDefault();
        document.getElementById('staging-snap-btn')?.click();
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        if (useStore.getState().isPlacingMarker) {
          useStore.getState().setIsPlacingMarker(false);
        }
        if (setSlashQuery) setSlashQuery(null);
        if (setSlashIsDouble) setSlashIsDouble(false);

        // 1. Ensure we return to normal typing mode by focusing the input
        document.getElementById('thought-input')?.focus();

        // 2. Reset all interaction and selection states
        setLinkFrom(null);
        if (setStagingSuggId) setStagingSuggId(null);
        if (setStagingNodeIds) setStagingNodeIds(new Set());
        setActiveLink(null);
        setModalId(null);
        setSelIds(new Set());
        setTargetId(null);
        setActiveTopic(null);
        setFocusedOutlineId(null);
        setActiveSorterTopicId(null);
        setVacuumTopicId(null);
        setVacuumSelectedIds(new Set());
        setReplayIdx(null);

        // 3. Close all drawers, menus, and modals
        setDrawerOpen(false);
        setSettingsOpen(false);
        setMenuOpen(false);
        setTopicMenuOpen(false);

        setTimerMenuOpen(false);
        setMoveTopicMenuOpen(false);
        
        // Reset drawing tools
        const store = useStore.getState();
        store.setActiveDrawTool(null);
        store.setDrawingPreview(null);
        store.setDrawMenuOpen(false);

        // 4. Cancel any ongoing mouse drag, pan, or marquee box operations
        dragRef.current = null;
        panRef.current = null;
        marqueeStartRef.current = null;
        setMarquee(null);
        linkDragRef.current = null;
        if (previewRef.current) previewRef.current.style.display = 'none';
        useStore.getState().setDrawingPreview(null);
        useStore.getState().setActiveDrawTool(null);

        // 5. Return focus to the main input bar
        setTimeout(() => {
          document.getElementById('thought-input')?.focus();
        }, 10);

        return;
      }
      // Enter while pull/vacuum mode is active → confirm pull
      if (e.key === 'Enter' && useStore.getState().vacuumTopicId) {
        e.preventDefault();
        confirmVacuum();
        return;
      }
      if (!typing && (e.metaKey || e.ctrlKey)) {
        const key = e.key.toLowerCase();
        if (key === 'a') {
          e.preventDefault();
          const store = useStore.getState();
          store.setActiveDrawTool(store.activeDrawTool === 'arrow' ? null : 'arrow');
          return;
        }
        if (key === 'l') {
          e.preventDefault();
          const store = useStore.getState();
          store.setActiveDrawTool(store.activeDrawTool === 'line' ? null : 'line');
          return;
        }
        if (key === 's') {
          e.preventDefault();
          const store = useStore.getState();
          store.setActiveDrawTool(store.activeDrawTool === 'rect' ? null : 'rect');
          return;
        }
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

      if ((e.metaKey || e.ctrlKey) && ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        
        const w = worldRef.current;
        const v = viewRef.current;
        const store = useStore.getState();
        const topics = w.nodes.filter(n => n.isTopic || n.isHub);
        if (topics.length === 0) return;

        const selArray = Array.from(store.selIds);
        let current = null;
        if (selArray.length > 0) {
          current = w.nodes.find(n => n.id === selArray[0] && (n.isTopic || n.isHub));
        }

        let target = null;

        if (!current) {
          const splitViewOpen = store.splitViewOpen;
          const availableWidth = splitViewOpen ? window.innerWidth - 380 : window.innerWidth;
          const cx = (availableWidth / 2 - v.x) / v.s;
          const cy = (window.innerHeight / 2 - v.y) / v.s;
          
          let minD = Infinity;
          for (const t of topics) {
            const dx = t.x - cx;
            const dy = t.y - cy;
            const d = Math.sqrt(dx*dx + dy*dy);
            if (d < minD) { minD = d; target = t; }
          }
        } else {
          let minScore = Infinity;
          const { x: cx, y: cy } = current;

          for (const t of topics) {
            if (t.id === current.id) continue;
            const dx = t.x - cx;
            const dy = t.y - cy;

            let validDir = false;
            let forwardDist = 0;
            let orthoDist = 0;

            if (e.key === 'ArrowRight' && dx > 0) {
              validDir = true; forwardDist = dx; orthoDist = Math.abs(dy);
            } else if (e.key === 'ArrowLeft' && dx < 0) {
              validDir = true; forwardDist = -dx; orthoDist = Math.abs(dy);
            } else if (e.key === 'ArrowDown' && dy > 0) {
              validDir = true; forwardDist = dy; orthoDist = Math.abs(dx);
            } else if (e.key === 'ArrowUp' && dy < 0) {
              validDir = true; forwardDist = -dy; orthoDist = Math.abs(dx);
            }

            if (validDir) {
              const euclidean = Math.sqrt(forwardDist*forwardDist + orthoDist*orthoDist);
              const score = euclidean + orthoDist * 3; // Heavily penalize orthogonal distance
              if (score < minScore) {
                minScore = score;
                target = t;
              }
            }
          }
        }

        if (target) {
          store.setSelIds(new Set([target.id]));
          store.setActiveTopic(target.id);
          
          const screenX = target.x * v.s + v.x;
          const screenY = target.y * v.s + v.y;
          const splitViewOpen = store.splitViewOpen;
          const availableWidth = splitViewOpen ? window.innerWidth - 380 : window.innerWidth;
          
          const padding = 150;
          if (screenX < padding || screenX > availableWidth - padding || screenY < padding || screenY > window.innerHeight - padding) {
            v.x = (availableWidth / 2) - (target.x * v.s);
            v.y = (window.innerHeight / 2) - (target.y * v.s);
            w.updated = Date.now();
          }
        }
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── 4. Auto-save on laptop closure / tab hide / beforeunload ─────────────
  useEffect(() => {
    const handleSave = () => {
      if (typeof persist === 'function') {
        persist();
      }
    };
    window.addEventListener('visibilitychange', handleSave);
    window.addEventListener('beforeunload', handleSave);
    return () => {
      window.removeEventListener('visibilitychange', handleSave);
      window.removeEventListener('beforeunload', handleSave);
    };
  }, [persist]);
}
