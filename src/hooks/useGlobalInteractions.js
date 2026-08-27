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
  setSlashQuery, setSlashIsDouble, setHoveredSuggThoughtIds,
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

  // ── 3. Keydown → shortcuts ─────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      const typing = /INPUT|TEXTAREA/.test(document.activeElement && document.activeElement.tagName);
      
      // Auto-focus typing mechanic: if pressing a regular character key while not typing, focus input
      if (!typing && e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        document.getElementById('thought-input')?.focus();
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setSlashQuery(null);
        setSlashIsDouble(false);

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
        setFocusedOutlineId(null);
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
        setMoveTopicMenuOpen(false);

        // 4. Cancel any ongoing mouse drag, pan, or marquee box operations
        dragRef.current = null;
        panRef.current = null;
        marqueeStartRef.current = null;
        setMarquee(null);
        linkDragRef.current = null;
        if (previewRef.current) previewRef.current.style.display = 'none';

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
  }, []);
}
