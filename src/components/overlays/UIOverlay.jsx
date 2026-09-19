import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { 
  XIcon, SparkIcon, ChevronDownIcon, SearchIcon, PlusIcon, 
  LibraryIcon, MicIcon, SendIcon, SidebarRightIcon, LightbulbQuestionIcon
} from '../icons';
import { TopicMenu } from '../TopicMenu';
import { HeaderMenu } from '../HeaderMenu';
import { LS_HISTORY, LS_CURRENT } from '../../utils/constants';
import { loadStore } from '../../utils/storage';

export const UIOverlay = ({
  worldRef,
  addThought,
  deleteNodes,
  pushUndo,
  bump,
  persist,
  createTopic,
  confirmVacuum,
  toggleVacuumPreview,
  executeManualPull,
  transferSelectedToTopic,
  cancelVacuum,
  moveCanvasToProject,
  setSessionsRev,
  newCanvas,
  focusInput,
  toggleVoice,
  handleExportMarkdownOutline,
  getUniqueCanvasName,
  speechSupported,
}) => {
  const theme = useStore(s => s.theme);
  const input = useStore(s => s.input);
  const setInput = useStore(s => s.setInput);
  const query = useStore(s => s.query);
  const setQuery = useStore(s => s.setQuery);
  const aiNote = useStore(s => s.aiNote);
  const setAiNote = useStore(s => s.setAiNote);
  const unexportedArchiveAlert = useStore(s => s.unexportedArchiveAlert);
  const setUnexportedArchiveAlert = useStore(s => s.setUnexportedArchiveAlert);
  const splitViewOpen = useStore(s => s.splitViewOpen);
  const setSplitViewOpen = useStore(s => s.setSplitViewOpen);
  
  const drawerOpen = useStore(s => s.drawerOpen);
  const setDrawerOpen = useStore(s => s.setDrawerOpen);
  const focusMode = useStore(s => s.focusMode);
  const selIds = useStore(s => s.selIds);
  const setSelIds = useStore(s => s.setSelIds);
  const activeSorterTopicId = useStore(s => s.activeSorterTopicId);
  const setActiveSorterTopicId = useStore(s => s.setActiveSorterTopicId);
  const linkFrom = useStore(s => s.linkFrom);
  const replaying = useStore(s => s.replayIdx !== null);
  const activeTopic = useStore(s => s.activeTopic);
  const targetId = useStore(s => s.targetId);
  const setTargetId = useStore(s => s.setTargetId);
  const listening = useStore(s => s.listening);
  const aiTopicSuggestions = useStore(s => s.aiTopicSuggestions);
  const setAiTopicSuggestions = useStore(s => s.setAiTopicSuggestions);
  const hoveredSuggId = useStore(s => s.hoveredSuggId);
  const setHoveredSuggId = useStore(s => s.setHoveredSuggId);
  const stagingSuggId = useStore(s => s.stagingSuggId);
  const setStagingSuggId = useStore(s => s.setStagingSuggId);
  const stagingNodeIds = useStore(s => s.stagingNodeIds);
  const setStagingNodeIds = useStore(s => s.setStagingNodeIds);
  const topicMenuOpen = useStore(s => s.topicMenuOpen);
  const setTopicMenuOpen = useStore(s => s.setTopicMenuOpen);

  const [slashQuery, setSlashQuery] = useState(null);
  const [slashIsDouble, setSlashIsDouble] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);
  const [moveTopicMenuOpen, setMoveTopicMenuOpen] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [canvasMenuOpen, setCanvasMenuOpen] = useState(false);
  const tipsRef = React.useRef(null);

  React.useEffect(() => {
    if (!tipsOpen) return;
    const handlePointerDown = (e) => {
      if (tipsRef.current && !tipsRef.current.contains(e.target)) {
        setTipsOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [tipsOpen]);

  React.useEffect(() => {
    if (selIds.size === 0) {
      setMoveTopicMenuOpen(false);
    }
  }, [selIds.size]);

  const w = worldRef.current;
  const byId = (id) => w.nodes.find(n => n.id === id);
  const targetNode = targetId && byId(targetId);
  const topics = w.nodes.filter(n => n.isTopic);
  const activeTopicNode = activeTopic && byId(activeTopic);

  const onPaste = (e) => {
    const text = e.clipboardData.getData('text');
    if (text && text.includes('\n')) {
      e.preventDefault();
      pushUndo();
      text.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 20)
        .forEach((l, i) => setTimeout(() => addThought(l, { skipUndo: true }), i * 280));
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);

    const doubleSlashMatch = val.match(/(?:^|\s)\/\/([^\s]*)$/);
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
      if (e.key === 'Escape') {
        e.preventDefault();
        useStore.getState().setActiveTopic(null);
        return;
      }
      
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
              const newVal = input.replace(/(?:^|\s)\/\/([^\s]*)$/, '');
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
           const newVal = input.replace(/(?:^|\s)\/([a-zA-Z0-9_-]*)$/, '');
           setInput(newVal);
           setSlashQuery(null);
           useStore.getState().setActiveTopic(selected.id);
        }
      } else if (e.key === ' ') {
        setSlashQuery(null);
      }
    }
  };

  return (
    <>
      <div className="absolute top-[72px] left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-40 pointer-events-none">
        {/* linking / replay / quick-sorter hint */}
        {(linkFrom || replaying || activeSorterTopicId) && (
          <div data-ui className="glass rounded-full px-4 py-1.5 text-sm flex items-center gap-2 pointer-events-auto shadow-md">
            {replaying && <span className="text-neutral-200">Replaying your stream of thoughts…</span>}
            {linkFrom === 'toolbar_active' && <span className="text-neutral-200"><span className="text-cyan-300 font-bold mr-1">↗ Arrow Mode:</span> Click any thought to set source (ESC to cancel)</span>}
            {linkFrom && linkFrom !== 'toolbar_active' && <span className="text-neutral-200"><span className="text-cyan-300 font-bold mr-1">↗ Arrow Mode:</span> Click a target thought to connect (ESC to cancel)</span>}
            {!replaying && !linkFrom && activeSorterTopicId && (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                <span className="text-amber-200 font-medium">Topic Collector Active:</span>
                <span className="text-neutral-200">Click any unsorted bubble to file under <span className="text-neutral-100 font-semibold">“{byId(activeSorterTopicId)?.title}”</span></span>
                <button onClick={() => setActiveSorterTopicId(null)} className="ml-2 text-neutral-400 hover:text-neutral-200 text-xs font-semibold px-2 py-0.5 rounded bg-neutral-800/80 border border-neutral-700/60 transition-colors">Cancel</button>
              </>
            )}
          </div>
        )}

        {/* unexported notes banner */}
        {unexportedArchiveAlert && (
          <div data-ui className="glass rounded-full px-4 py-2 text-[13px] flex items-center gap-3 border border-amber-500/30 bg-amber-500/10 pointer-events-auto shadow-lg">
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
      </div>

      {/* Selection Toolbar */}
      {selIds.size > 0 && !activeSorterTopicId && !linkFrom && (
        <div data-ui className="absolute bottom-[116px] left-1/2 -translate-x-1/2 flex items-center gap-2.5 bg-neutral-900/90 border border-neutral-500/50 rounded-full px-4 py-2 shadow-[0_0_20px_rgba(255,255,255,0.15)] z-[100] animate-pop-in backdrop-blur-xl pointer-events-auto select-none">
          <span className="text-neutral-300 text-sm font-medium mr-2">{selIds.size} selected</span>
          <button onClick={() => deleteNodes(selIds)} className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1.5 rounded-full font-medium transition-colors border border-red-500/20">Delete</button>
          


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

                  {/* NEW: Merged Project Select */}
                  <div className="w-full h-px bg-neutral-800 my-1.5" />
                  <div className="px-1.5 pb-1.5 pt-0.5">
                    <select
                      onChange={(e) => {
                        const targetId = e.target.value;
                        if (targetId) {
                          moveCanvasToProject(w.id, targetId);
                        }
                      }}
                      value=""
                      className="w-full appearance-none text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 px-3 py-2 rounded-lg font-medium transition-colors border border-blue-500/20 outline-none cursor-pointer text-center"
                    >
                      <option value="" disabled>Move to Project / Canvas...</option>
                      {(() => {
                        const history = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]');
                        const store = loadStore();
                        const projects = Object.values(store).filter(s => s.id !== w.id && !history.find(h => h.id === s.id));
                        return projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>);
                      })()}
                    </select>
                  </div>
                </div>
              );
            })()}
          </div>

          <button onClick={() => setSelIds(new Set())} className="text-neutral-400 hover:text-neutral-200 p-1 ml-1 rounded-full hover:bg-neutral-800 transition-colors">
            <XIcon size={14}/>
          </button>
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
          <div className="relative">
            <div 
              className="flex items-center justify-center p-1 rounded-md hover:bg-neutral-800/40 text-neutral-400 hover:text-neutral-200 cursor-pointer" 
              title="Switch Canvas"
              onClick={() => setCanvasMenuOpen(!canvasMenuOpen)}
            >
              <ChevronDownIcon size={14} />
            </div>

            {canvasMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setCanvasMenuOpen(false)} />
                <div 
                  className="absolute top-full left-0 mt-2 w-56 rounded-2xl border border-neutral-700/80 bg-neutral-900/95 backdrop-blur-md shadow-2xl py-1.5 z-50 text-neutral-100 max-h-80 overflow-y-auto animate-pop-in"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wider px-3 py-1 text-neutral-500">
                    Switch Canvas
                  </div>
                  
                  {(() => {
                     const store = loadStore();
                     const recentCanvases = Object.values(store)
                       .filter(s => s.id !== w.id)
                       .sort((a, b) => (b.updated || 0) - (a.updated || 0))
                       .slice(0, 5);
                     
                     const handleSelect = (id) => {
                       if (id) {
                         const store = loadStore();
                         if (store[id]) {
                           persist();
                           localStorage.setItem(LS_CURRENT, id);
                           window.location.reload();
                         }
                       }
                       setCanvasMenuOpen(false);
                     };

                     return (
                       <>
                         {recentCanvases.length > 0 ? (
                           <>
                             {recentCanvases.map(c => (
                               <button 
                                 key={c.id} 
                                 onClick={() => handleSelect(c.id)}
                                 className="w-full text-left px-3 py-1.5 text-[13px] text-neutral-300 hover:bg-neutral-800/60 hover:text-white transition-colors truncate"
                               >
                                 {c.name}
                               </button>
                             ))}
                           </>
                         ) : (
                           <div className="px-3 py-1.5 text-[12px] text-neutral-500 italic">No other canvases</div>
                         )}
                        </>
                     );
                  })()}
                </div>
              </>
            )}
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
          <SidebarRightIcon size={14} /> <span className="hidden lg:inline">Split View</span>
        </button>

        {/* Settings Gear Dropdown Menu */}
        <HeaderMenu />
      </header>

      {/* Left Edge Canvases Tab */}
      {!drawerOpen && (
        <div data-ui
          onClick={() => { persist(); setSessionsRev(r => r + 1); setDrawerOpen(true); }}
          title="Open Canvases"
          className="fixed left-0 top-1/2 -translate-y-1/2 z-40 glass rounded-r-xl px-1.5 py-6 flex flex-col items-center gap-3 cursor-pointer hover:bg-neutral-800/60 transition-all border-l-0 shadow-[4px_0_24px_rgba(0,0,0,0.2)] group"
        >
          <LibraryIcon size={16} className="text-neutral-400 group-hover:text-amber-400 transition-colors" />
          <span 
            className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 group-hover:text-neutral-300 transition-colors" 
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Canvases
          </span>
        </div>
      )}

      {/* AI error note */}
      {aiNote && !focusMode && (
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
        <div className="flex items-center gap-2 w-full relative z-20">
          <div ref={tipsRef} className="relative flex items-center">
            <button
              type="button"
              onClick={() => setTipsOpen(o => !o)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-400 bg-neutral-800/50 hover:bg-neutral-700/60 border border-neutral-600/40 hover:text-neutral-200 transition-all shadow-md"
              title="Quick Tips"
            >
              <LightbulbQuestionIcon size={18} />
            </button>
            {tipsOpen && (
              <>
                  <div
                  className="absolute bottom-full mb-2.5 left-0 z-50 w-80 rounded-2xl border border-neutral-700/60 bg-neutral-950/95 backdrop-blur-xl shadow-2xl overflow-hidden animate-pop-in"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="px-4 pt-3.5 pb-2 border-b border-neutral-800/60">
                    <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">How to use</p>
                  </div>
                  <div className="px-4 py-3 text-[13px] text-neutral-300 leading-relaxed space-y-2">
                    <p>
                      <strong>Thoughtstream</strong> is a spatial thinking tool. Type in the bar to create a "thought" on the canvas. Group thoughts into <strong>Topics</strong> to organize them.
                    </p>
                    <p>
                      You can move freely around the canvas, connect thoughts, and arrange them however makes sense to you.
                    </p>
                  </div>
                  <div className="px-4 py-3 bg-neutral-900 border-t border-neutral-800/60">
                    <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-2">Essential Shortcuts</p>
                    <ul className="space-y-2">
                      <li className="flex items-center justify-between gap-3">
                        <span className="text-[11px] text-neutral-400">Add a thought</span>
                        <kbd className="shrink-0 px-1.5 py-0.5 rounded border border-neutral-700 bg-neutral-800 text-[10px] font-mono font-semibold text-neutral-300">Enter</kbd>
                      </li>
                      <li className="flex items-center justify-between gap-3">
                        <span className="text-[11px] text-neutral-400">Pick a Topic (start of line)</span>
                        <kbd className="shrink-0 px-1.5 py-0.5 rounded border border-neutral-700 bg-neutral-800 text-[10px] font-mono font-semibold text-neutral-300">/</kbd>
                      </li>
                      <li className="flex items-center justify-between gap-3">
                        <span className="text-[11px] text-neutral-400">New Topic (start of line)</span>
                        <kbd className="shrink-0 px-1.5 py-0.5 rounded border border-neutral-700 bg-neutral-800 text-[10px] font-mono font-semibold text-neutral-300">//</kbd>
                      </li>
                      <li className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-neutral-800/60">
                        <span className="text-[11px] text-neutral-300 font-medium">Show all shortcuts</span>
                        <kbd className="shrink-0 px-1.5 py-0.5 rounded border border-neutral-700 bg-neutral-800 text-[10px] font-mono font-semibold text-neutral-300">?</kbd>
                      </li>
                    </ul>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className={`glass spotlight-bar flex-1 flex items-center gap-2 pl-3 pr-2 py-2 transition-all duration-200 ${
          activeSorterTopicId
            ? 'border-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
            : activeTopicNode
              ? 'border-neutral-400/60 shadow-[0_0_20px_rgba(255,255,255,0.08)]'
              : ''
        }`}>
          {activeSorterTopicId || activeTopicNode ? (
            <div
              onClick={() => setTopicMenuOpen(o => !o)}
              title={activeSorterTopicId ? `Topic Collector active for: ${byId(activeSorterTopicId)?.title}` : `Routing to: ${activeTopicNode?.title}`}
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
                        const newVal = input.replace(/(?:^|\s)\/\/([^\s]*)$/, '');
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
                         const newVal = input.replace(/(?:^|\s)\/([a-zA-Z0-9_-]*)$/, '');
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
                ? `Topic Collector active for “${byId(activeSorterTopicId)?.title}”…`
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
        </div>
      </form>

      {/* bottom-right AI Topic suggestions */}
      {(() => {
        const looseIds = new Set(w.nodes.filter(n => !n.isTopic && !n.isHub && !n.topicId).map(n => n.id));
        const activeSuggestions = aiTopicSuggestions.map(sugg => {
          const members = (sugg.thoughtIds || []).filter(id => looseIds.has(id));
          if (members.length === 0) return null;
          
          const exists = w.nodes.some(n => (n.isHub || n.isTopic) && n.title && n.title.toLowerCase() === sugg.topicName.toLowerCase());
          const minRequired = exists ? 1 : 3;
          
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

        if (focusMode || activeSuggestions.length === 0) return null;

        const cancelStaging = () => {
          setStagingSuggId(null);
          setStagingNodeIds(new Set());
        };

        const snapStaging = (sugg) => {
          const t = createTopic(sugg.topicName);
          if (t) {
            // Save state so the user can easily undo this snap operation
            pushUndo();
            
            // Move all staged nodes into the new topic
            const w = worldRef.current;
            const v = { x: 0, y: 0, s: 1 }; // not needed but kept for signature compat
            stagingNodeIds.forEach(nodeId => {
              const node = w.nodes.find(n => n.id === nodeId);
              if (node && !node.isTopic && !node.isHub) {
                node.topicId = t.id;
                node.sleeping = false;
                node.userMoved = false;
                node.pinned = false;
                const angle = Math.random() * Math.PI * 2;
                const R = t.r + node.r + 30;
                node.x = t.x + Math.round(Math.cos(angle) * R);
                node.y = t.y + Math.round(Math.sin(angle) * R);
                node.vx = 0;
                node.vy = 0;
              }
            });
            w.updated = Date.now();
            bump();
            persist();
            setAiTopicSuggestions(aiTopicSuggestions.filter(s => s.id !== sugg.id));
            cancelStaging();
          }
        };

        return (
          <div data-ui className="absolute bottom-6 right-6 z-50 flex flex-col items-end gap-2">
            {activeSuggestions.map((sugg) => {
              const isStaging = stagingSuggId === sugg.id;
              const isHovered = hoveredSuggId === sugg.id;
              return (
                <div key={sugg.id}
                     className={`glass flex items-center gap-3 px-4 py-2 rounded-full cursor-pointer border transition-all duration-200 shadow-lg animate-pop-in ${
                       isStaging
                         ? 'border-amber-400/60 bg-amber-500/10 shadow-[0_0_16px_rgba(251,191,36,0.2)]'
                         : 'border-neutral-700/50 hover:bg-white/5 hover:scale-[1.02] hover:border-amber-400/40'
                     }`}
                     onMouseEnter={() => { if (!stagingSuggId) setHoveredSuggId(sugg.id); }}
                     onMouseLeave={() => { if (!stagingSuggId) setHoveredSuggId(null); }}
                     onClick={() => {
                       if (isStaging) return; // ignore if already staging
                       setHoveredSuggId(null);
                       setStagingSuggId(sugg.id);
                       setStagingNodeIds(new Set(sugg.thoughtIds || []));
                     }}>
                  <SparkIcon size={14} className={`shrink-0 ${isStaging ? 'text-amber-400' : 'text-amber-400'}`} />
                  <span className="text-[13px] font-semibold text-neutral-100 whitespace-nowrap">
                    {isStaging
                      ? `${stagingNodeIds.size} thought${stagingNodeIds.size === 1 ? '' : 's'} staged — click bubbles to add/remove`
                      : sugg.text}
                  </span>
                  {isStaging ? (
                    <div className="flex items-center gap-1.5 ml-1" onClick={e => e.stopPropagation()}>
                      <button
                        id="staging-snap-btn"
                        className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-900 transition-colors shadow-sm shrink-0"
                        onClick={(e) => { e.stopPropagation(); snapStaging(sugg); }}
                        title="Create topic with selected bubbles">
                        Snap ✦
                      </button>
                      <button
                        className="p-1 rounded-full text-neutral-500 hover:text-neutral-200 hover:bg-neutral-700/50 transition-colors shrink-0"
                        onClick={(e) => { e.stopPropagation(); cancelStaging(); setAiTopicSuggestions(aiTopicSuggestions.filter(s => s.id !== sugg.id)); }}
                        title="Dismiss suggestion">
                        <XIcon size={11} />
                      </button>
                    </div>
                  ) : (
                    <button
                      className="p-1 ml-1 rounded-full text-neutral-500 hover:text-neutral-200 hover:bg-neutral-700/50 transition-colors shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setHoveredSuggId(null);
                        setAiTopicSuggestions(aiTopicSuggestions.filter(s => s.id !== sugg.id));
                      }}>
                      <XIcon size={11} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}
    </>
  );
};
