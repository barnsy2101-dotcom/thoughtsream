import React from 'react';
import { useStore } from '../store/useStore';
import { XIcon } from './icons';

export function SettingsModal({ onClearLastAIHash }) {
  const settingsOpen = useStore(s => s.settingsOpen);
  const setSettingsOpen = useStore(s => s.setSettingsOpen);
  const apiKey = useStore(s => s.apiKey);
  const setApiKey = useStore(s => s.setApiKey);

  if (!settingsOpen) return null;

  return (
    <div data-ui className="absolute inset-0 z-40 flex items-center justify-center bg-black/45"
      onPointerDown={e => { e.stopPropagation(); if (e.target === e.currentTarget) setSettingsOpen(false); }}>
      <div className="glass rounded-2xl p-5 w-[min(440px,92vw)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-neutral-100 font-semibold">Settings</h3>
          <button onClick={() => setSettingsOpen(false)} className="text-neutral-400 hover:text-neutral-200"><XIcon size={18} /></button>
        </div>
        <label className="text-[11px] uppercase tracking-wider text-neutral-500">Anthropic API key</label>
        <input type="password" defaultValue={apiKey} placeholder="sk-ant-…" autoComplete="off"
          onBlur={e => {
            const k = e.target.value.trim();
            setApiKey(k);
            if (onClearLastAIHash) onClearLastAIHash();
          }}
          className="w-full mt-1 mb-2 bg-neutral-800/60 border border-neutral-600/40 rounded-lg px-2.5 py-2 text-neutral-100 text-sm" />
        <p className="text-xs text-neutral-500 leading-relaxed mb-3">
          With a key, connections, clusters, and “Expand ideas” use Claude (claude-opus-4-8) for real semantic analysis.
          Without one, a built-in keyword engine runs offline. The key is stored only in this browser and calls go
          directly to Anthropic — usage is billed to your account.
        </p>
        <div className="flex items-center gap-2 text-sm">
          <span className={'w-2 h-2 rounded-full ' + (apiKey ? 'bg-neutral-200' : 'bg-neutral-500')} />
          <span className="text-neutral-300">AI mode: {apiKey ? 'Claude API' : 'Simulated (offline)'}</span>
        </div>
      </div>
    </div>
  );
}
