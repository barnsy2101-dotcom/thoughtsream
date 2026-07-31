import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { LibraryIcon, PlusIcon, XIcon, SearchIcon, CopyIcon, TrashIcon } from './icons';

const ChevronDownIcon = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const ChevronRightIcon = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

const CanvasItem = ({ s, isCurrent, theme, renameSession, openSession, duplicateSession, deleteSession, drawerTab, moveCanvasToProject, projects }) => {
  const thoughtCount = (s.nodes || []).filter(n => !n.isHub).length;
  const formattedDate = new Date(s.updated).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <div className={'group rounded-xl p-3 border transition-all duration-150 relative ' +
      (isCurrent
        ? 'bg-neutral-800/90 border-amber-500/50 shadow-lg ring-1 ring-amber-500/30'
        : 'bg-neutral-900/40 hover:bg-neutral-800/50 border-neutral-800 hover:border-neutral-700/60')}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isCurrent ? (
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.8)]" title="Currently Active" />
          ) : (
            <span className="text-xs shrink-0 opacity-60">{drawerTab === 'daily' ? '📅' : '📄'}</span>
          )}
          
          <input defaultValue={s.name}
            onBlur={e => renameSession(s.id, e.target.value.trim() || (drawerTab === 'daily' ? "Today's Stream" : "Untitled Canvas"))}
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
          
          {drawerTab === 'projects' && projects && projects.length > 0 && (
            <select 
              className="text-[10px] px-1 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700/50 outline-none"
              value={s.projectId || ''}
              onChange={e => moveCanvasToProject(s.id, e.target.value || null)}
              title="Move to Project"
            >
              <option value="">Standalone</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
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
};

export function Sidebar({
  sessionList,
  sessionsRev,
  currentWorldId,
  renameSession,
  openSession,
  duplicateSession,
  deleteSession,
  onCreateNewProject,
  renameProject,
  deleteProject,
  onCreateCanvasInProject,
  moveCanvasToProject
}) {
  const drawerOpen = useStore(s => s.drawerOpen);
  const setDrawerOpen = useStore(s => s.setDrawerOpen);
  const theme = useStore(s => s.theme);
  const drawerSearch = useStore(s => s.drawerSearch);
  const setDrawerSearch = useStore(s => s.setDrawerSearch);
  const drawerTab = useStore(s => s.drawerTab);
  const setDrawerTab = useStore(s => s.setDrawerTab);
  const projects = useStore(s => s.projects) || [];

  const [collapsedProjects, setCollapsedProjects] = useState({});

  const toggleProject = (id) => {
    setCollapsedProjects(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div data-ui className={'drawer absolute top-0 left-0 bottom-0 w-[min(380px,92vw)] z-50 flex flex-col rounded-r-2xl shadow-2xl backdrop-blur-2xl transition-transform duration-300 ' + (drawerOpen ? '' : '-translate-x-full')}
      style={{
        background: theme === 'light' ? 'rgba(255, 255, 255, 0.98)' : 'rgba(18, 18, 18, 0.98)',
        borderRight: `1px solid ${theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)'}`,
      }}
      onWheel={e => e.stopPropagation()}
      onPointerDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
      onDoubleClick={e => e.stopPropagation()}>
      
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
          }} 
          title="Create New Project Folder"
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

          if (drawerTab === 'daily') {
            if (!filteredSessions.length) {
              return (
                <div className="text-center py-10 px-4">
                  <span className="text-2xl block mb-2 opacity-50">📅</span>
                  <p className="text-xs text-neutral-400 font-medium whitespace-pre-line">
                    {drawerSearch 
                      ? `No streams found matching "${drawerSearch}"`
                      : 'No archived daily streams yet.\nDaily streams auto-archive at midnight.'}
                  </p>
                </div>
              );
            }
            return filteredSessions.map(s => <CanvasItem key={s.id} s={s} isCurrent={s.id === currentWorldId} theme={theme} renameSession={renameSession} openSession={openSession} duplicateSession={duplicateSession} deleteSession={deleteSession} drawerTab={drawerTab} moveCanvasToProject={moveCanvasToProject} projects={projects} />);
          } else {
            // Projects Tab
            const standaloneCanvases = filteredSessions.filter(s => !s.projectId);
            
            return (
              <div className="space-y-4">
                {/* Render Projects */}
                {projects.map(proj => {
                  const projCanvases = filteredSessions.filter(s => s.projectId === proj.id);
                  const isCollapsed = collapsedProjects[proj.id];
                  // If searching and this project has no matching canvases, we can optionally hide it,
                  // but let's show it if its name matches or it has matching canvases.
                  const matchesSearch = !drawerSearch.trim() || proj.name.toLowerCase().includes(drawerSearch.toLowerCase().trim()) || projCanvases.length > 0;
                  
                  if (!matchesSearch) return null;

                  return (
                    <div key={proj.id} className="bg-neutral-900/30 border border-neutral-800/80 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between p-2 hover:bg-neutral-800/40 transition-colors">
                        <div className="flex items-center gap-2 flex-1 min-w-0" onClick={() => toggleProject(proj.id)}>
                          <button className="text-neutral-400 hover:text-neutral-200 p-0.5">
                            {isCollapsed ? <ChevronRightIcon size={14} /> : <ChevronDownIcon size={14} />}
                          </button>
                          <span className="text-xs">📁</span>
                          <input 
                            defaultValue={proj.name}
                            onBlur={e => renameProject(proj.id, e.target.value.trim() || 'Untitled Project')}
                            onKeyDown={e => e.key === 'Enter' && e.target.blur()}
                            onClick={e => e.stopPropagation()}
                            className="bg-transparent text-xs font-semibold text-neutral-200 outline-none border-b border-transparent focus:border-neutral-500 w-full truncate"
                          />
                        </div>
                        <div className="flex items-center gap-1 pl-2">
                          <span className="text-[10px] text-neutral-500 font-medium px-1.5">{projCanvases.length}</span>
                          <button onClick={() => {
                            onCreateCanvasInProject(proj.id);
                            setDrawerOpen(false);
                          }} title="New Canvas in Project" className="p-1 hover:bg-neutral-700/50 rounded text-neutral-400 hover:text-neutral-200">
                            <PlusIcon size={12} />
                          </button>
                          <button onClick={() => deleteProject(proj.id)} title="Delete Project (Canvases become Standalone)" className="p-1 hover:bg-red-500/20 rounded text-neutral-500 hover:text-red-400">
                            <TrashIcon size={12} />
                          </button>
                        </div>
                      </div>
                      
                      {!isCollapsed && projCanvases.length > 0 && (
                        <div className="p-2 pt-0 space-y-1.5 border-t border-neutral-800/40 bg-neutral-900/10">
                          <div className="h-1"></div>
                          {projCanvases.map(s => (
                            <CanvasItem key={s.id} s={s} isCurrent={s.id === currentWorldId} theme={theme} renameSession={renameSession} openSession={openSession} duplicateSession={duplicateSession} deleteSession={deleteSession} drawerTab={drawerTab} moveCanvasToProject={moveCanvasToProject} projects={projects} />
                          ))}
                        </div>
                      )}
                      {!isCollapsed && projCanvases.length === 0 && (
                        <div className="p-3 pt-2 border-t border-neutral-800/40 text-center">
                          <span className="text-[11px] text-neutral-500">No canvases in this project.</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Render Standalone Canvases */}
                {(standaloneCanvases.length > 0 || projects.length === 0) && (
                  <div className="pt-2">
                    <h3 className="text-[11px] font-semibold text-neutral-500 mb-2 px-1 uppercase tracking-wider">Standalone Canvases</h3>
                    {standaloneCanvases.length === 0 && (
                      <div className="text-center py-6 px-4">
                        <span className="text-xl block mb-2 opacity-50">📄</span>
                        <p className="text-[11px] text-neutral-500 font-medium whitespace-pre-line">
                          {drawerSearch 
                            ? `No standalone canvases found matching "${drawerSearch}"`
                            : 'No standalone canvases.'}
                        </p>
                      </div>
                    )}
                    <div className="space-y-2">
                      {standaloneCanvases.map(s => (
                        <CanvasItem key={s.id} s={s} isCurrent={s.id === currentWorldId} theme={theme} renameSession={renameSession} openSession={openSession} duplicateSession={duplicateSession} deleteSession={deleteSession} drawerTab={drawerTab} moveCanvasToProject={moveCanvasToProject} projects={projects} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          }
        })()}
      </div>
    </div>
  );
}

