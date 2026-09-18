import React from 'react';
import { useStore } from '../store/useStore';
import { GearIcon } from './icons';

export function HeaderMenu() {
  const menuOpen = useStore(s => s.menuOpen);
  const setMenuOpen = useStore(s => s.setMenuOpen);
  const theme = useStore(s => s.theme);
  const setTheme = useStore(s => s.setTheme);
  const setSettingsOpen = useStore(s => s.setSettingsOpen);

  return (
    <div className="relative ml-1 border-l border-neutral-600/30 pl-1.5">
      <button onClick={() => setMenuOpen(o => !o)} title="Settings & Options"
        className="ghost-btn flex items-center justify-center w-8 h-8 rounded-lg text-neutral-300">
        <GearIcon size={16} />
      </button>

      {menuOpen && (
        <div data-ui className={`absolute top-10 right-0 rounded-2xl p-1.5 w-52 z-50 shadow-2xl border flex flex-col gap-0.5 animate-pop-in backdrop-blur-md ${theme === 'light' ? 'bg-white/95 border-neutral-300' : 'bg-neutral-900/95 border-neutral-700/80'}`}
            onPointerDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
            onDoubleClick={e => e.stopPropagation()}>
          <div className="text-[10px] font-semibold uppercase tracking-wider px-3 py-1"
            style={{ color: theme === 'light' ? '#666666' : '#A3A3A3' }}>
            Options
          </div>

          {/* Item 1: Toggle Light/Dark Mode */}
          <button onClick={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); setMenuOpen(false); }}
            className="ghost-btn w-full flex items-center gap-2 text-left text-xs rounded-xl px-3 py-2 font-medium"
            style={{ color: theme === 'light' ? '#1B1B1B' : '#EAEAEA' }}>
            <span className="text-sm shrink-0">{theme === 'dark' ? '☀️' : '🌙'}</span>
            <span>{theme === 'dark' ? 'Toggle Light Mode' : 'Toggle Dark Mode'}</span>
          </button>

          <div className="w-full h-px my-1" style={{ background: theme === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)' }} />

          {/* Item 2: Preferences / Settings */}
          <button onClick={() => { setSettingsOpen(true); setMenuOpen(false); }}
            className="ghost-btn w-full flex items-center gap-2 text-left text-xs rounded-xl px-3 py-2 font-medium"
            style={{ color: theme === 'light' ? '#1B1B1B' : '#EAEAEA' }}>
            <GearIcon size={14} className="shrink-0" style={{ color: theme === 'light' ? '#666666' : '#A3A3A3' }} />
            <span>Preferences / Settings</span>
          </button>
        </div>
      )}
    </div>
  );
}

