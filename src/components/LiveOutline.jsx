import React, { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { XIcon, ChevronDownIcon } from './icons';

export function LiveOutline({ nodes, onExport, worldRef, bump, persist, addThought, deleteNodes, moveNodeAndChildrenToTopic, panToNode }) {
  const splitViewOpen = useStore(s => s.splitViewOpen);
  const setSplitViewOpen = useStore(s => s.setSplitViewOpen);
  const theme = useStore(s => s.theme);
  const focusedOutlineId = useStore(s => s.focusedOutlineId);
  const setFocusedOutlineId = useStore(s => s.setFocusedOutlineId);
  
  const [copied, setCopied] = useState(false);
  const dragRef = useRef(null);
  const [dragEnabledId, setDragEnabledId] = useState(null);
  const [dropIndicator, setDropIndicator] = useState(null);
  const [collapsedTopicIds, setCollapsedTopicIds] = useState(new Set());

  if (!splitViewOpen) return null;

  const isDark = theme !== 'light';
  const topics = nodes.filter(n => n.isTopic || n.isHub).sort((a, b) => b.created - a.created);
  const unsorted = nodes.filter(n => !n.isTopic && !n.isHub && !n.topicId && n.text?.trim());

  const toggleCollapse = (topicId) => {
    setCollapsedTopicIds(prev => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  };

  const allTopicIds = [...topics.map(t => t.id), 'unsorted'];
  const allCollapsed = topics.length > 0 && topics.every(t => collapsedTopicIds.has(t.id));

  const toggleAll = () => {
    if (allCollapsed) {
      setCollapsedTopicIds(new Set());
    } else {
      setCollapsedTopicIds(new Set(allTopicIds));
    }
  };

  /* ---- Handlers ---- */
  const handleTextChange = (nodeId, newText) => {
    const n = nodes.find(x => x.id === nodeId);
    if (n) {
      n.text = newText;
      worldRef.current.updated = Date.now();
      bump();
      persist();
    }
  };

  const handleKeyDown = (e, nodeId) => {
    if (e.key === 'Backspace' && e.target.value === '') {
      e.preventDefault();
      deleteNodes(new Set([nodeId]));
    }
  };

  const handleCopy = () => {
    let md = '';
    for (const t of topics) {
      md += `### ${t.title}\n`;
      const children = nodes.filter(n => n.topicId === t.id && !n.isTopic && !n.isHub);
      for (const c of children) {
        if (c.text.trim()) md += `- ${c.text.trim()}\n`;
      }
      md += '\n';
    }
    if (unsorted.length > 0) {
      md += `### Unsorted\n`;
      for (const u of unsorted) {
        if (u.text.trim()) md += `- ${u.text.trim()}\n`;
      }
    }
    navigator.clipboard.writeText(md.trim()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  /* ---- Drag and Drop for Reordering ---- */
  const onDragStart = (e, type, id) => {
    dragRef.current = { type, id };
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e, targetId, isThought = false) => {
    e.preventDefault();
    if (!dragRef.current) return;

    if (dragRef.current.type === 'topic' && isThought) {
      return;
    }

    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? 'before' : 'after';

    setDropIndicator(prev => {
      if (prev && prev.id === targetId && prev.position === position) return prev;
      return { id: targetId, position };
    });
  };

  const onDrop = (e, targetId, targetTopicId) => {
    e.preventDefault();
    e.stopPropagation();
    const indicator = dropIndicator;
    setDropIndicator(null);
    if (!dragRef.current || !indicator) return;

    const { type, id: sourceId } = dragRef.current;
    const w = worldRef.current;
    
    if (type === 'thought') {
      const sourceNode = w.nodes.find(n => n.id === sourceId);
      const targetTopicVal = targetTopicId === 'unsorted' ? null : targetTopicId;
      
      if (sourceNode && sourceNode.topicId !== targetTopicVal && targetTopicId !== undefined) {
        moveNodeAndChildrenToTopic(sourceId, targetTopicVal);
      }

      const sourceIdx = w.nodes.findIndex(n => n.id === sourceId);
      const targetIdx = w.nodes.findIndex(n => n.id === targetId);
      if (sourceIdx > -1 && targetIdx > -1 && sourceIdx !== targetIdx) {
        const [moved] = w.nodes.splice(sourceIdx, 1);
        const insertIdx = indicator.position === 'before' ? targetIdx : targetIdx + 1;
        w.nodes.splice(insertIdx, 0, moved);
        w.updated = Date.now();
        bump();
        persist();
      }
    } else if (type === 'topic' && sourceId !== targetId && targetId !== 'unsorted') {
      const allTopics = w.nodes.filter(n => n.isTopic || n.isHub).sort((a, b) => b.created - a.created);
      const sourceNode = allTopics.find(n => n.id === sourceId);

      if (sourceNode) {
        const topicsWithoutSource = allTopics.filter(n => n.id !== sourceId);
        const targetIndex = topicsWithoutSource.findIndex(n => n.id === targetId);

        if (targetIndex !== -1) {
          const insertIndex = indicator.position === 'before' ? targetIndex : targetIndex + 1;
          topicsWithoutSource.splice(insertIndex, 0, sourceNode);
          const baseTime = Date.now();
          topicsWithoutSource.forEach((node, idx) => {
            node.created = baseTime - (idx * 1000);
          });
          w.updated = Date.now();
          bump();
          persist();
        }
      }
    }
    dragRef.current = null;
  };

  const dropLineColor = isDark ? 'rgba(99,179,237,1)' : 'rgba(37,99,235,1)';

  return (
    <div data-ui className="fixed top-0 right-0 bottom-0 w-[min(380px,92vw)] z-50 shadow-2xl flex flex-col animate-pop-in rounded-l-2xl border-l"
         style={{ background: isDark ? 'rgba(18, 18, 18, 0.97)' : 'rgba(255, 255, 255, 0.97)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', color: isDark ? '#EAEAEA' : '#1B1B1B' }}
         onPointerDown={e => e.stopPropagation()} onWheel={e => e.stopPropagation()}>
         
      <div className="flex items-center justify-between p-4 border-b shrink-0" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
        <div className="flex items-center gap-2">
          <h2 className="font-display font-semibold text-base">Live Outline</h2>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: isDark ? '#A3A3A3' : '#666' }}>
            {topics.length} sections
          </span>
          <button type="button" onClick={toggleAll}
                  className="text-xs px-2 py-0.5 rounded-lg hover:bg-neutral-800/40 transition-colors font-medium ml-1"
                  style={{ color: isDark ? '#A3A3A3' : '#666' }}
                  title={allCollapsed ? "Expand all sections" : "Collapse all sections"}>
            {allCollapsed ? "Expand all" : "Collapse all"}
          </button>
        </div>
        <button onClick={() => setSplitViewOpen(false)} className="ghost-btn p-1.5 rounded-lg hover:bg-neutral-800/50" style={{ color: isDark ? '#A3A3A3' : '#666' }}>
          <XIcon size={18} />
        </button>
      </div>

      <div className="px-4 pt-3 pb-0">
        <p className="text-[10px]" style={{ color: isDark ? '#555' : '#bbb' }}>Drag handles to reorder • text is live editable</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {topics.map(t => {
          const children = nodes.filter(n => n.topicId === t.id && !n.isTopic && !n.isHub);
          const isCollapsed = collapsedTopicIds.has(t.id);
          return (
            <div key={t.id} className="transition-all duration-200"
                 onDragOver={(e) => onDragOver(e, t.id, false)}
                 onDragLeave={() => setDropIndicator(null)}
                 onDrop={(e) => onDrop(e, t.id, t.id)}
                 style={{
                   borderTop: dropIndicator?.id === t.id && dropIndicator?.position === 'before' ? `3px solid ${dropLineColor}` : '3px solid transparent',
                   borderBottom: dropIndicator?.id === t.id && dropIndicator?.position === 'after' ? `3px solid ${dropLineColor}` : '3px solid transparent',
                   borderRadius: '8px'
                 }}>
              
              <div className="flex items-center gap-2 mb-2 select-none group/topic">
                <span className="text-base leading-none flex-shrink-0 cursor-grab opacity-30 group-hover/topic:opacity-100 transition-opacity px-1"
                      draggable={dragEnabledId === t.id}
                      onDragStart={(e) => onDragStart(e, 'topic', t.id)}
                      onPointerDown={() => setDragEnabledId(t.id)} onPointerUp={() => setDragEnabledId(null)}
                      style={{ color: isDark ? '#888' : '#aaa' }}>
                  ≡
                </span>
                <button type="button" onClick={() => toggleCollapse(t.id)}
                        className="p-1 rounded-md hover:bg-neutral-800/40 transition-colors text-neutral-400 flex items-center justify-center">
                  <ChevronDownIcon size={14} className={`transition-transform duration-200 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} />
                </button>
                <span className="text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md cursor-pointer"
                      onClick={() => toggleCollapse(t.id)}
                      style={{ color: isDark ? '#F5C97A' : '#B07A00', background: isDark ? 'rgba(245,201,122,0.1)' : 'rgba(176,122,0,0.08)' }}>
                  # Topic
                </span>
                <span className="font-semibold text-sm truncate cursor-pointer" onClick={() => toggleCollapse(t.id)}>{t.title}</span>
                <span className="text-[10px] ml-auto tabular-nums flex-shrink-0 cursor-pointer" onClick={() => toggleCollapse(t.id)} style={{ color: isDark ? '#555' : '#aaa' }}>
                  {children.length} thought{children.length !== 1 ? 's' : ''}
                </span>
              </div>

              {!isCollapsed && (
                <div className="rounded-xl overflow-hidden border" style={{ borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)', background: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)' }}>
                  {children.length === 0 ? (
                    <div className="text-xs px-4 py-3 italic" style={{ color: isDark ? '#555' : '#bbb' }}>No thoughts in this topic.</div>
                  ) : (
                    children.map(c => (
                      <div key={c.id} draggable={dragEnabledId === c.id} onDragStart={(e) => onDragStart(e, 'thought', c.id)}
                           onDragOver={(e) => onDragOver(e, c.id, true)} onDrop={(e) => onDrop(e, c.id, t.id)}
                           className="flex items-start gap-2.5 px-3 py-1.5 text-xs transition-all group/thought"
                           style={{
                             borderTop: dropIndicator?.id === c.id && dropIndicator?.position === 'before' ? `3px solid ${dropLineColor}` : '3px solid transparent',
                             borderBottom: dropIndicator?.id === c.id && dropIndicator?.position === 'after' ? `3px solid ${dropLineColor}` : '3px solid transparent',
                             background: dropIndicator?.id === c.id ? (isDark ? 'rgba(99,179,237,0.1)' : 'rgba(37,99,235,0.08)') : 'transparent'
                           }}>
                        <span className="text-base leading-none flex-shrink-0 mt-0.5 cursor-grab opacity-0 group-hover/thought:opacity-40 hover:!opacity-100 transition-opacity"
                              onPointerDown={() => setDragEnabledId(c.id)} onPointerUp={() => setDragEnabledId(null)}
                              style={{ color: isDark ? '#888' : '#aaa' }}>
                          ≡
                        </span>
                        <textarea value={c.text} rows={1}
                          onFocus={(e) => {
                            panToNode(c.id);
                            setFocusedOutlineId(c.id);
                            e.target.style.whiteSpace = 'normal';
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          onBlur={(e) => {
                            setFocusedOutlineId(null);
                            e.target.style.whiteSpace = 'nowrap';
                            e.target.style.height = 'auto';
                          }}
                          onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                          onChange={(e) => handleTextChange(c.id, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, c.id)}
                          className="bg-transparent w-full outline-none border-b border-transparent focus:border-neutral-500/50 transition-colors leading-relaxed resize-none overflow-hidden"
                          style={{ whiteSpace: 'nowrap' }} />
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )
        })}

        {unsorted.length > 0 && (() => {
          const isUnsortedCollapsed = collapsedTopicIds.has('unsorted');
          return (
            <div className="pt-4 mt-2 transition-all duration-200"
                 onDragOver={(e) => onDragOver(e, 'unsorted', false)}
                 onDragLeave={() => setDropIndicator(null)}
                 onDrop={(e) => onDrop(e, 'unsorted', 'unsorted')}
                 style={{
                   borderTop: dropIndicator?.id === 'unsorted' && dropIndicator?.position === 'before' ? `3px solid ${dropLineColor}` : '3px solid transparent',
                   borderBottom: dropIndicator?.id === 'unsorted' && dropIndicator?.position === 'after' ? `3px solid ${dropLineColor}` : '3px solid transparent',
                   borderRadius: '8px'
                 }}>
              <div className="flex items-center gap-2 mb-2 select-none">
                <button type="button" onClick={() => toggleCollapse('unsorted')}
                        className="p-1 rounded-md hover:bg-neutral-800/40 transition-colors text-neutral-400 flex items-center justify-center">
                  <ChevronDownIcon size={14} className={`transition-transform duration-200 ${isUnsortedCollapsed ? '-rotate-90' : 'rotate-0'}`} />
                </button>
                <span className="text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md cursor-pointer"
                      onClick={() => toggleCollapse('unsorted')}
                      style={{ color: isDark ? '#888' : '#999', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}>
                  Unsorted
                </span>
                <span className="text-[10px] ml-auto tabular-nums flex-shrink-0 cursor-pointer" onClick={() => toggleCollapse('unsorted')} style={{ color: isDark ? '#555' : '#aaa' }}>
                  {unsorted.length} thought{unsorted.length !== 1 ? 's' : ''}
                </span>
              </div>
              {!isUnsortedCollapsed && (
                <div className="rounded-xl overflow-hidden border" style={{ borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }}>
                  {unsorted.map(c => (
                    <div key={c.id} draggable={dragEnabledId === c.id} onDragStart={(e) => onDragStart(e, 'thought', c.id)}
                         onDragOver={(e) => onDragOver(e, c.id, true)} onDrop={(e) => onDrop(e, c.id, 'unsorted')}
                         className="flex items-start gap-2.5 px-3 py-1.5 text-xs transition-all group/thought"
                         style={{
                           borderTop: dropIndicator?.id === c.id && dropIndicator?.position === 'before' ? `3px solid ${dropLineColor}` : '3px solid transparent',
                           borderBottom: dropIndicator?.id === c.id && dropIndicator?.position === 'after' ? `3px solid ${dropLineColor}` : '3px solid transparent',
                           background: dropIndicator?.id === c.id ? (isDark ? 'rgba(99,179,237,0.1)' : 'rgba(37,99,235,0.08)') : 'transparent'
                         }}>
                      <span className="text-base leading-none flex-shrink-0 mt-0.5 cursor-grab opacity-0 group-hover/thought:opacity-40 hover:!opacity-100 transition-opacity"
                            onPointerDown={() => setDragEnabledId(c.id)} onPointerUp={() => setDragEnabledId(null)}
                            style={{ color: isDark ? '#888' : '#aaa' }}>
                        ≡
                      </span>
                      <textarea value={c.text} rows={1}
                        onFocus={(e) => { panToNode(c.id); setFocusedOutlineId(c.id); e.target.style.whiteSpace = 'normal'; e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                        onBlur={(e) => { setFocusedOutlineId(null); e.target.style.whiteSpace = 'nowrap'; e.target.style.height = 'auto'; }}
                        onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                        onChange={(e) => handleTextChange(c.id, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, c.id)}
                        className="bg-transparent w-full outline-none border-b border-transparent focus:border-neutral-500/50 transition-colors leading-relaxed resize-none overflow-hidden"
                        style={{ whiteSpace: 'nowrap' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>


      <div className="p-4 border-t flex-shrink-0" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
        <button onClick={handleCopy} disabled={nodes.filter(n => !n.isTopic && !n.isHub).length === 0}
                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                style={{
                  background: copied ? (isDark ? 'rgba(52,211,153,0.15)' : 'rgba(5,150,105,0.1)') : (isDark ? 'rgba(245,201,122,0.15)' : 'rgba(176,122,0,0.1)'),
                  border: `1px solid ${copied ? (isDark ? 'rgba(52,211,153,0.4)' : 'rgba(5,150,105,0.3)') : (isDark ? 'rgba(245,201,122,0.35)' : 'rgba(176,122,0,0.25)')}`,
                  color: copied ? (isDark ? '#34d399' : '#059669') : (isDark ? '#F5C97A' : '#8a5e00'),
                  opacity: nodes.filter(n => !n.isTopic && !n.isHub).length === 0 ? 0.5 : 1,
                }}>
          {copied ? '✓ Copied!' : '📋 Copy to Clipboard'}
        </button>
      </div>
    </div>
  );
}
