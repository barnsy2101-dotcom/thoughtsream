import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { COLORS, ACCENT } from '../utils/constants';
import { nodeRadius } from '../utils/helpers';
import { applyCollisions, applyLinkForces, applyTopicGravity, integrateVelocities } from '../utils/physics';

import { 
  SparkIcon, CheckIcon, XIcon, FoldIcon, UnfoldIcon, 
  CopyIcon, MagnetIcon, PinIcon, MsgIcon, MinusIcon
} from '../components/icons';

// ── Render function ──
const renderCanvasDOM = (w, v, hidden, q, held, els) => {
  const { nodes, links } = w;
  const { worldElRef, bgRef, nodeEls, zoneEls, pathEls, hitEls, labelEls, badgeEls, linkCardRef, previewRef, threadLineRef, nodeBounds } = els;
  
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
    if (hidden.has(n.id) || n.collapsed) { zel.style.display = 'none'; continue; }

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
    let dx = b.x - a.x, dy = b.y - a.y;
    let d = Math.hypot(dx, dy) || 1;
    let mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    let off = Math.min(d * 0.14, 46);
    
    let cx = mx - (dy / d) * off;
    let cy = my + (dx / d) * off;
    
    let bx = b.x, by = b.y;

    if (isArrow !== false) {
      let tx = b.x - cx, ty = b.y - cy;
      let td = Math.hypot(tx, ty) || 1;
      let nx = tx / td, ny = ty / td;
      
      let pullback = 74;
      if (nodeBounds && nodeBounds.current[b.id]) {
        const bounds = nodeBounds.current[b.id];
        const w = Math.max(bounds.w, 30);
        const h = Math.max(bounds.h, 20);
        const absNx = Math.abs(nx) || 0.001;
        const absNy = Math.abs(ny) || 0.001;
        const r = Math.min(w / absNx, h / absNy);
        pullback = r + 10;
      } else {
        pullback = (b.r || 60) + 14;
      }
      
      if (pullback > d - 10) pullback = Math.max(0, d - 10);
      
      bx = b.x - nx * pullback;
      by = b.y - ny * pullback;
    }

    return `M ${a.x} ${a.y} Q ${cx} ${cy} ${bx} ${by}`;
  };
  const byId = (id) => nodes.find(n => n.id === id);
  for (const l of (links || [])) {
    const a = byId(l.a), b = byId(l.b);
    const vis = a && b && !hidden.has(a.id) && !hidden.has(b.id);
    const el = pathEls.current[l.id], hit = hitEls.current[l.id], lab = labelEls.current[l.id];
    if (el) { el.style.display = vis ? '' : 'none'; if (vis) el.setAttribute('d', curve(a, b, l.isArrow !== false)); }
    if (hit) { hit.style.display = vis ? '' : 'none'; if (vis) hit.setAttribute('d', curve(a, b, l.isArrow !== false)); }
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
      const mx = els.mouseRef.current.x;
      const my = els.mouseRef.current.y;
      
      let hoverTarget = null;
      for (const n of nodes) {
        if (n.id !== src.id && !hidden.has(n.id)) {
          const bounds = nodeBounds.current[n.id];
          const w = bounds ? Math.max(bounds.w, 30) : 60;
          const h = bounds ? Math.max(bounds.h, 20) : 60;
          if (Math.abs(mx - n.x) < w && Math.abs(my - n.y) < h) {
            hoverTarget = n;
            break;
          }
        }
      }
      
      if (hoverTarget) {
        previewRef.current.setAttribute('d', curve(src, hoverTarget, true));
      } else {
        const dx = mx - src.x, dy = my - src.y;
        const d = Math.hypot(dx, dy) || 1;
        const nx = dx / d, ny = dy / d;
        const px = mx - nx * 8;
        const py = my - ny * 8;
        previewRef.current.setAttribute('d', `M ${src.x} ${src.y} L ${px} ${py}`);
      }
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

export const CanvasEngine = ({
  worldRef, viewRef,
  theme, selIds, activeLink, hoveredSuggThoughtIds, vacuumTopicId, vacuumSelectedIds, activeTopic, targetId, linkFrom, activeSorterTopicId, focusedOutlineId, replayIdx,
  worldElRef, bgRef, nodeEls, zoneEls, pathEls, hitEls, labelEls, badgeEls,
  linkCardRef, previewRef, threadLineRef, nodeBounds, observedNodes, resizeObserver, mouseRef,
  pullTetherGroupRef, sourceTetherGroupRef, dragRef,
  // Interaction Callbacks
  onBubbleDown, confirmVacuum, cancelVacuum, executeManualPull, exportTopicMarkdown,
  toggleVacuumPreview, pushUndo, unlink, bump, persist, setTargetId, setModalId,
  setHoveredPullTopicId, setActiveLink, createTopic
}) => {

  const hubMembers = (hubId) => {
    const w = worldRef.current;
    return w.links.filter(l => l.a === hubId || l.b === hubId).map(l => (l.a === hubId ? l.b : l.a));
  };
  const hiddenIdSet = () => {
    const w = worldRef.current;
    const hidden = new Set();
    for (const n of w.nodes) {
      if (n.inInbox) hidden.add(n.id);
      if (n.isHub && n.collapsed) hubMembers(n.id).forEach(id => { const m = worldRef.current.nodes.find(x => x.id === id); if (m && !m.isHub) hidden.add(id); });
      
      if (n.isTopic && n.collapsed) {
        w.nodes.forEach(m => {
          if (m.topicId === n.id) hidden.add(m.id);
        });
      }
    }
    if (useStore.getState().replayIdx !== null) {
      const sorted = [...w.nodes].sort((a, b) => a.created - b.created);
      sorted.forEach((n, i) => { if (i >= useStore.getState().replayIdx) hidden.add(n.id); });
    }
    return hidden;
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
        linkCardRef, previewRef, threadLineRef, mouseRef,
        pullTetherGroupRef, sourceTetherGroupRef, nodeBounds,
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

  const w = worldRef.current;
  const byId = (id) => w.nodes.find(n => n.id === id);
  const linkCard = activeLink && w.links.find(l => l.id === activeLink);

  return (
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
          <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill={theme === 'light' ? '#1B1B1B' : '#EAEAEA'} />
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
              className="link-path" fill="none" stroke={theme === 'light' ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.45)'} strokeWidth="2.5" strokeLinecap="round" markerEnd={(l.isArrow !== false) ? "url(#arrow)" : undefined} />
            <path ref={el => { if (el) hitEls.current[l.id] = el; }}
              fill="none" stroke="transparent" strokeWidth="20" style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
              onPointerDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); setActiveLink(activeLink === l.id ? null : l.id); }} />
          </g>
        ))}

        <path ref={previewRef} fill="none" stroke="rgba(220,220,220,0.65)" strokeWidth="2"
          strokeDasharray="5 5" style={{ display: 'none', pointerEvents: 'none' }} markerEnd="url(#arrow)" />
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
        // If the node is in the inbox, do NOT render it on the main moving canvas.
        if (n.inInbox) return null;
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
                ...(focusedOutlineId === n.id ? { outline: `3px solid ${theme === 'light' ? '#3B82F6' : '#60A5FA'}`, outlineOffset: 4, boxShadow: `0 0 20px ${theme === 'light' ? 'rgba(59,130,246,0.4)' : 'rgba(96,165,250,0.4)'}` } : {}),
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
                    ◆ Topic{activeTopic === n.id ? ' · active' : ''}{n.collapsed ? ` · ${w.nodes.filter(m => m.topicId === n.id).length}` : ''}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button data-ui
                      type="button"
                      onPointerDown={e => e.stopPropagation()}
                      onClick={e => { e.stopPropagation(); pushUndo(); n.collapsed = !n.collapsed; worldRef.current.updated = Date.now(); bump(); persist(); }}
                      title={n.collapsed ? "Expand topic aura" : "Collapse topic aura"}
                      className={'p-1 rounded-md transition-colors flex items-center justify-center '
                        + (theme === 'light' ? 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/60' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/50')}>
                      {n.collapsed ? <UnfoldIcon size={13} /> : <FoldIcon size={13} />}
                    </button>
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
              {/* Link handles removed for Toolbar Arrow Mode */ }
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
  );
};
