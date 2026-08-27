import React, { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { XIcon } from './icons';

export function LiveOutline({ nodes, onExport, worldRef, bump, persist, addThought, deleteNodes, moveNodeAndChildrenToTopic, panToNode }) {
  const splitViewOpen = useStore(s => s.splitViewOpen);
  const setSplitViewOpen = useStore(s => s.setSplitViewOpen);
  const theme = useStore(s => s.theme);
  const focusedOutlineId = useStore(s => s.focusedOutlineId);
  const setFocusedOutlineId = useStore(s => s.setFocusedOutlineId);
  
  const dragRef = useRef(null);
  const [dropIndicator, setDropIndicator] = useState(null); // { id, position: 'before'|'after'|'into' }
  const [dragEnabledId, setDragEnabledId] = useState(null);
  
  if (!splitViewOpen) return null;
  
  const topics = nodes.filter(n => n.isTopic || n.isHub).sort((a, b) => b.created - a.created);
  const unsorted = nodes.filter(n => !n.isTopic && !n.isHub && !n.topicId && n.text?.trim());
  const isDark = theme !== 'light';

  const handleTextChange = (nodeId, newText) => {
    const n = nodes.find(x => x.id === nodeId);
    if (n) { 
      n.text = newText; 
      worldRef.current.updated = Date.now(); 
      bump(); 
      persist(); 
    }
  };

  const handleKeyDown = (e, nodeId, topicId) => {
    if (e.key === 'Backspace' && e.target.value === '') {
      e.preventDefault();
      deleteNodes(new Set([nodeId]));
    }
  };

  const onDragStart = (e, type, id) => {
    dragRef.current = { type, id };
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e, topicId) => {
    e.preventDefault();
    if (!dragRef.current) return;
    
    if (topicId === 'unsorted' || topicId === null) {
      setDropIndicator({ id: 'unsorted', position: 'into' });
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? 'before' : 'after';
    
    if (dragRef.current.type === 'topic') {
      setDropIndicator({ id: topicId, position });
    } else {
      setDropIndicator({ id: topicId, position: 'into' });
    }
  };

  const onDragLeave = (e) => {
    setDropIndicator(null);
  };

  const onDrop = (e, targetTopicId) => {
    e.preventDefault();
    const indicator = dropIndicator;
    setDropIndicator(null);
    
    if (!dragRef.current) return;
    const { type, id: sourceId } = dragRef.current;
    
    if (type === 'thought') {
      moveNodeAndChildrenToTopic(sourceId, targetTopicId === 'unsorted' ? null : targetTopicId);
    } else if (type === 'topic' && sourceId !== targetTopicId && targetTopicId !== null && targetTopicId !== 'unsorted' && indicator) {
      const allTopics = nodes.filter(n => n.isTopic || n.isHub).sort((a, b) => b.created - a.created);
      const sourceNode = allTopics.find(n => n.id === sourceId);
      
      if (sourceNode) {
        const topicsWithoutSource = allTopics.filter(n => n.id !== sourceId);
        const targetIndex = topicsWithoutSource.findIndex(n => n.id === targetTopicId);
        
        if (targetIndex !== -1) {
          const insertIndex = indicator.position === 'before' ? targetIndex : targetIndex + 1;
          topicsWithoutSource.splice(insertIndex, 0, sourceNode);
          
          const baseTime = Date.now();
          topicsWithoutSource.forEach((node, idx) => {
            node.created = baseTime - (idx * 1000);
          });
          
          worldRef.current.updated = Date.now();
          bump();
          persist();
        }
      }
    }
    dragRef.current = null;
  };
  
  return (
    <div data-ui className="fixed top-0 right-0 bottom-0 w-[380px] z-50 shadow-2xl border-l flex flex-col animate-pop-in"
         style={{ background: isDark ? '#121212' : '#F9F9F7', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', color: isDark ? '#EAEAEA' : '#1B1B1B' }}
         onPointerDown={e => e.stopPropagation()} onWheel={e => e.stopPropagation()}>
         
      <div className="flex items-center justify-between p-4 border-b shrink-0" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
        <h2 className="font-display font-bold text-base">Live Outline</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => { if (onExport) onExport(); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors" style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
            Export / Reorder
          </button>
          <button onClick={() => setSplitViewOpen(false)} className="p-1.5 rounded-lg hover:bg-neutral-500/20 text-neutral-500 hover:text-neutral-300 transition-colors"><XIcon size={16} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {topics.map(t => {
          const children = nodes.filter(n => n.topicId === t.id && !n.isTopic && !n.isHub);
          return (
            <div key={t.id} className={`space-y-2 transition-all duration-200 relative ${dropIndicator?.id === t.id && dropIndicator.position === 'before' ? 'border-t-2 border-amber-400 shadow-[0_-2px_8px_rgba(251,191,36,0.5)] pt-1' : ''} ${dropIndicator?.id === t.id && dropIndicator.position === 'after' ? 'border-b-2 border-amber-400 shadow-[0_2px_8px_rgba(251,191,36,0.5)] pb-1' : ''}`}
                 onDragOver={(e) => onDragOver(e, t.id)}
                 onDragLeave={onDragLeave}
                 onDrop={(e) => onDrop(e, t.id)}
                 style={{ 
                   background: dropIndicator?.id === t.id && dropIndicator.position === 'into' ? (isDark ? 'rgba(251,191,36,0.1)' : 'rgba(251,191,36,0.1)') : 'transparent', 
                   borderRadius: '8px', 
                   padding: dropIndicator?.id === t.id && dropIndicator.position === 'into' ? '4px' : '0' 
                 }}>
                 
              <div 
                className="flex items-center gap-2 group/topic"
                draggable={dragEnabledId === t.id}
                onDragStart={(e) => onDragStart(e, 'topic', t.id)}
                onDragEnd={() => setDragEnabledId(null)}
              >
                <span 
                  className="text-neutral-500 cursor-grab opacity-50 group-hover/topic:opacity-100 px-1 select-none text-lg leading-none"
                  title="Drag to reorder topic"
                  onPointerDown={() => setDragEnabledId(t.id)}
                  onPointerUp={() => setDragEnabledId(null)}
                >
                  •
                </span>
                <h3 className="font-bold text-[11px] tracking-widest uppercase opacity-70" style={{ color: t.color ? `var(--color-${t.color})` : 'inherit' }}>
                  {t.title}
                </h3>
              </div>
              
              <div className="pl-4 space-y-1.5 opacity-90 text-[13px]">
                {children.map(c => (
                  <div 
                    key={c.id} 
                    className="flex items-start gap-2 group" 
                    draggable={dragEnabledId === c.id} 
                    onDragStart={(e) => onDragStart(e, 'thought', c.id)}
                    onDragEnd={() => setDragEnabledId(null)}
                  >
                    <span 
                      className="text-neutral-500 mt-1 cursor-grab opacity-50 group-hover:opacity-100 px-1 select-none" 
                      title="Drag to move"
                      onPointerDown={() => setDragEnabledId(c.id)}
                      onPointerUp={() => setDragEnabledId(null)}
                    >
                      •
                    </span>
                    <textarea
                      value={c.text}
                      rows={1}
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
                      onInput={(e) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                      }}
                      onChange={(e) => handleTextChange(c.id, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, c.id, t.id)}
                      className="bg-transparent w-full outline-none border-b border-transparent focus:border-neutral-500/50 transition-colors leading-relaxed resize-none overflow-hidden"
                      style={{ whiteSpace: 'nowrap' }}
                    />
                  </div>
                ))}
                
                {/* Add new thought input */}
                <div className="flex items-start gap-2 opacity-50 focus-within:opacity-100 transition-opacity">
                  <span className="text-neutral-500 mt-1">+</span>
                  <input
                    placeholder="Add thought..."
                    className="bg-transparent w-full outline-none placeholder-neutral-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        addThought(e.target.value, { topicId: t.id });
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          )
        })}
        {unsorted.length > 0 && (
          <div className="space-y-2 pt-4 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
               onDragOver={(e) => onDragOver(e, 'unsorted')} 
               onDragLeave={onDragLeave}
               onDrop={(e) => onDrop(e, null)}
               style={{ 
                 background: dropIndicator?.id === 'unsorted' && dropIndicator.position === 'into' ? (isDark ? 'rgba(251,191,36,0.1)' : 'rgba(251,191,36,0.1)') : 'transparent', 
                 borderRadius: '8px', 
                 padding: dropIndicator?.id === 'unsorted' && dropIndicator.position === 'into' ? '4px' : '0' 
               }}>
            <h3 className="font-bold text-[11px] tracking-widest uppercase text-amber-500/80">Unsorted Thoughts</h3>
            <div className="pl-4 space-y-1.5 opacity-90 text-[13px]">
              {unsorted.map(c => (
                  <div 
                    key={c.id} 
                    className="flex items-start gap-2 group" 
                    draggable={dragEnabledId === c.id} 
                    onDragStart={(e) => onDragStart(e, 'thought', c.id)}
                    onDragEnd={() => setDragEnabledId(null)}
                  >
                    <span 
                      className="text-neutral-500 mt-1 cursor-grab opacity-50 group-hover:opacity-100 px-1 select-none" 
                      title="Drag to move"
                      onPointerDown={() => setDragEnabledId(c.id)}
                      onPointerUp={() => setDragEnabledId(null)}
                    >
                      •
                    </span>
                    <textarea
                      value={c.text}
                      rows={1}
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
                      onInput={(e) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                      }}
                      onChange={(e) => handleTextChange(c.id, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, c.id, null)}
                      className="bg-transparent w-full outline-none border-b border-transparent focus:border-neutral-500/50 transition-colors leading-relaxed resize-none overflow-hidden"
                      style={{ whiteSpace: 'nowrap' }}
                    />
                  </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
