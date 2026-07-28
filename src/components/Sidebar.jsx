import React from 'react';
import { useStore } from '../store/useStore';
import { LibraryIcon, PlusIcon, XIcon, SearchIcon, CopyIcon, TrashIcon } from './icons';

export function Sidebar({
  sessionList,
  sessionsRev,
  currentWorldId,
  renameSession,
  openSession,
  duplicateSession,
  deleteSession,
  onCreateNewProject
}) {
  const drawerOpen = useStore(s => s.drawerOpen);
  const setDrawerOpen = useStore(s => s.setDrawerOpen);
  const theme = useStore(s => s.theme);
  const drawerSearch = useStore(s => s.drawerSearch);
  const setDrawerSearch = useStore(s => s.setDrawerSearch);
  const drawerTab = useStore(s => s.drawerTab);
  const setDrawerTab = useStore(s => s.setDrawerTab);

  return (
    <div data-ui className={'drawer absolute top-0 left-0 bottom-0 w-[min(380px,92vw)] z-50 flex flex-col rounded-r-2xl shadow-2xl backdrop-blur-2xl transition-transform duration-300 ' + (drawerOpen ? '' : '-translate-x-full')}
      style={{
        background: theme === 'light' ? 'rgba(255, 255, 255, 0.96)' : 'rgba(18, 18, 18, 0.96)',
        borderRight: `1px solid ${theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)'}`,
      }}
      onWheel={e => e.stopPropagation()}
      onPointerDown={e => e.stopPropagation()}>
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b transition-colors"
        style={{ borderColor: theme === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-2">
          <LibraryIcon size={18} className="text-amber-400" />
          <h2 className="font-display font-semibold text-base text-inherit">Saved Streams</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => {
            onCreateNewProject();
            setDrawerOpen(false);
          }} 
          title="Create New Project Canvas"
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700/60 font-medium transition-colors">
            <PlusIcon size={13} /> Project
          </button>
          <button onClick={() => setDrawerOpen(false)} className="ghost-btn p-1.5 rounded-lg text-inherit hover:bg-neutral-800/50">
            <XIcon size={18} />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative flex items-center">
          <SearchIcon size={14} className="absolute left-3 text-neutral-500 pointer-events-none" />
          <input
            value={drawerSearch}
            onChange={e => setDrawerSearch(e.target.value)}
            placeholder="Search streams..."
            className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-xl pl-8 pr-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 outline-none focus:border-amber-500/50 transition-colors"
          />
          {drawerSearch && (
            <button onClick={() => setDrawerSearch('')} className="absolute right-2.5 text-neutral-500 hover:text-neutral-300">
              <XIcon size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Segmented Control Tabs */}
      <div className="px-3 pb-2">
        <div className="flex p-1 rounded-xl bg-neutral-800/60 border border-neutral-700/40 text-xs font-medium">
          <button
            onClick={() => setDrawerTab('projects')}
            className={'flex-1 py-1.5 rounded-lg text-center transition-all flex items-center justify-center gap-1.5 ' + 
              (drawerTab === 'projects' 
                ? 'bg-neutral-700 text-white font-semibold shadow-sm border border-neutral-600/60' 
                : 'text-neutral-400 hover:text-neutral-200')}
          >
            <span>📁</span>
            <span>Projects</span>
            <span className="text-[10px] opacity-70 px-1.5 py-0.2 rounded-full bg-neutral-900/50">
              {sessionList.filter(s => !(s.name === "Today's Stream" || s.name.startsWith("Stream - ") || s.name.startsWith("Stream:"))).length}
            </span>
          </button>

          <button
            onClick={() => setDrawerTab('daily')}
            className={'flex-1 py-1.5 rounded-lg text-center transition-all flex items-center justify-center gap-1.5 ' + 
              (drawerTab === 'daily' 
                ? 'bg-neutral-700 text-white font-semibold shadow-sm border border-neutral-600/60' 
                : 'text-neutral-400 hover:text-neutral-200')}
          >
            <span>📅</span>
            <span>Daily Streams</span>
            <span className="text-[10px] opacity-70 px-1.5 py-0.2 rounded-full bg-neutral-900/50">
              {sessionList.filter(s => (s.name === "Today's Stream" || s.name.startsWith("Stream - ") || s.name.startsWith("Stream:"))).length}
            </span>
          </button>
        </div>
      </div>

      {/* Streams List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2" key={sessionsRev}>
        {(() => {
          const isDailyCategory = (name) => name === "Today's Stream" || name.startsWith("Stream - ") || name.startsWith("Stream:");
          
          const filteredSessions = sessionList.filter(s => {
            const matchesTab = drawerTab === 'daily' ? isDailyCategory(s.name) : !isDailyCategory(s.name);
            const matchesSearch = !drawerSearch.trim() || s.name.toLowerCase().includes(drawerSearch.toLowerCase().trim());
            return matchesTab && matchesSearch;
          });

          if (!filteredSessions.length) {
            return (
              <div className="text-center py-10 px-4">
                <span className="text-2xl block mb-2 opacity-50">{drawerTab === 'daily' ? '📅' : '📁'}</span>
                <p className="text-xs text-neutral-400 font-medium whitespace-pre-line">
                  {drawerSearch 
                    ? `No streams found matching "${drawerSearch}"`
                    : drawerTab === 'daily' 
                      ? 'No archived daily streams yet.\nDaily streams auto-archive at midnight.'
                      : 'No project canvases yet.\nClick "+ Project" to create one.'}
                </p>
              </div>
            );
          }

          return filteredSessions.map(s => {
            const isCurrent = s.id === currentWorldId;
            const thoughtCount = (s.nodes || []).filter(n => !n.isHub).length;
            const formattedDate = new Date(s.updated).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

            return (
              <div key={s.id}
                className={'group rounded-xl p-3 border transition-all duration-150 relative ' +
                  (isCurrent
                    ? 'bg-neutral-800/90 border-amber-500/50 shadow-lg ring-1 ring-amber-500/30'
                    : 'bg-neutral-900/40 hover:bg-neutral-800/50 border-neutral-800 hover:border-neutral-700/60')}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {isCurrent ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.8)]" title="Currently Active" />
                    ) : (
                      <span className="text-xs shrink-0 opacity-60">{drawerTab === 'daily' ? '📅' : '📁'}</span>
                    )}
                    
                    <input defaultValue={s.name}
                      onBlur={e => renameSession(s.id, e.target.value.trim() || (drawerTab === 'daily' ? "Today's Stream" : "Untitled Project"))}
                      onKeyDown={e => e.key === 'Enter' && e.target.blur()}
                      className="w-full bg-transparent text-xs font-semibold border-b border-transparent focus:border-neutral-500 outline-none truncate"
                      style={{ color: isCurrent ? '#FFFFFF' : '#EAEAEA' }}
                      spellCheck="false" 
                    />
                  </div>

                  <span className="text-[10px] text-neutral-500 shrink-0 font-medium">{formattedDate}</span>
                </div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-800/60">
                  <span className="text-[11px] text-neutral-400 font-medium flex items-center gap-1">
                    <span className="text-neutral-500">{thoughtCount}</span> thoughts
                  </span>

                  <div className="flex items-center gap-1 opacity-95 sm:opacity-75 group-hover:opacity-100 transition-opacity">
                    {!isCurrent && (
                      <button onClick={() => openSession(s.id)} title="Open Stream"
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium transition-colors">
                        Open
                      </button>
                    )}
                    
                    <button onClick={() => duplicateSession(s.id)} title="Duplicate Canvas"
                      className="p-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 border border-neutral-700/50 transition-colors">
                      <CopyIcon size={12} />
                    </button>

                    <button onClick={() => deleteSession(s.id)} title="Delete Canvas"
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors">
                      <TrashIcon size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}
