import React from 'react';
import { useStore } from '../store/useStore';
import { XIcon } from './icons';

export function SettingsModal({ onApiKeySet, onClose }) {
  const settingsOpen = useStore(s => s.settingsOpen);
  const setSettingsOpen = useStore(s => s.setSettingsOpen);
  const apiKey = useStore(s => s.apiKey);
  const setApiKey = useStore(s => s.setApiKey);
  const close = () => { setSettingsOpen(false); onClose?.(); };

  if (!settingsOpen) return null;

  const isGemini = apiKey && (apiKey.startsWith('AIza') || apiKey.startsWith('AQ.'));
  const isClaude = apiKey && apiKey.startsWith('sk-ant-');
  const isKnownKey = isGemini || isClaude;

  return (
    <div data-ui className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-200"
      onPointerDown={e => { e.stopPropagation(); if (e.target === e.currentTarget) close(); }}>
      <div className="glass rounded-2xl p-6 w-[min(420px,92vw)] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] border border-neutral-700/50 animate-pop-in flex flex-col gap-4">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-display text-neutral-100 font-semibold text-base tracking-tight">Settings</h3>
            {apiKey ? (
              <span className={'text-[11px] px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1.5 border transition-colors ' +
                (isKnownKey ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30')}>
                <span className={'w-1.5 h-1.5 rounded-full animate-pulse ' + (isKnownKey ? 'bg-emerald-400' : 'bg-amber-400')} />
                {isGemini ? 'Gemini 2.5 Flash' : isClaude ? 'Claude 3.5 Sonnet' : 'Custom Key'}
              </span>
            ) : (
              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1.5 border bg-neutral-800/80 text-neutral-400 border-neutral-700/60">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
                Offline Mode
              </span>
            )}
          </div>
          <button onClick={close} className="text-neutral-400 hover:text-neutral-100 p-1.5 rounded-lg hover:bg-neutral-800/60 transition-colors">
            <XIcon size={16} />
          </button>
        </div>

        {/* Label & Tooltip */}
        <div className="flex flex-col gap-1.5">
          <div className="relative group flex items-center justify-between">
            <div className="flex items-center gap-1.5 cursor-pointer">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">API Key</label>
              <span className="w-3.5 h-3.5 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-400 group-hover:text-neutral-200 group-hover:border-neutral-500 text-[9px] font-mono font-semibold flex items-center justify-center transition-colors">
                i
              </span>
            </div>
            
            {/* Tooltip */}
            <div className="absolute left-0 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50 bg-neutral-900/95 border border-neutral-700/80 p-3 rounded-xl text-[11px] text-neutral-300 w-72 shadow-2xl backdrop-blur-md leading-relaxed">
              Paste an Anthropic key (<code className="text-amber-300 font-mono">sk-ant-...</code>) or Gemini key (<code className="text-amber-300 font-mono">AIza...</code> / <code className="text-amber-300 font-mono">AQ....</code>). Without a key, the app runs in offline simulated mode.
            </div>
          </div>

          {/* Input Box */}
          <div className="relative flex items-center">
            <input 
              type="password" 
              defaultValue={apiKey} 
              placeholder="sk-ant-… or AIza… or AQ.…" 
              autoComplete="off"
              onBlur={e => {
                const k = e.target.value.trim();
                setApiKey(k);
                if (onApiKeySet) onApiKeySet();
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const k = e.target.value.trim();
                  setApiKey(k);
                  if (onApiKeySet) onApiKeySet();
                  e.target.blur();
                  close();
                }
              }}
              className="w-full h-10 bg-neutral-900/90 border border-neutral-700/70 focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20 rounded-xl px-3.5 text-neutral-100 text-sm outline-none transition-all duration-150 placeholder:text-neutral-600 font-mono overflow-hidden leading-normal" 
            />
          </div>
        </div>

        {/* Footer info note */}
        <p className="text-[11px] text-neutral-500/80 text-right font-medium -mt-1">
          Press <kbd className="px-1.5 py-0.5 text-[10px] bg-neutral-800 border border-neutral-700 rounded text-neutral-300 font-mono">Enter</kbd> to save
        </p>

      </div>
    </div>
  );
}
