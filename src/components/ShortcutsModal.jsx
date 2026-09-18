import React from 'react';
import { XIcon } from './icons';

const SHORTCUTS = [
  {
    section: 'Canvas',
    items: [
      { keys: ['?'], description: 'Show this shortcuts menu' },
      { keys: ['Cmd/Ctrl', 'Z'], description: 'Undo' },
      { keys: ['Cmd/Ctrl', 'Shift', 'Z'], description: 'Redo' },
      { keys: ['Cmd/Ctrl', '↑ ↓ ← →'], description: 'Navigate between Topics' },
      { keys: ['Shift', 'Click / Drag'], description: 'Multi-select thoughts' },
      { keys: ['Del / Backspace'], description: 'Delete selected thoughts' },
    ],
  },
  {
    section: 'Input Bar',
    items: [
      { keys: ['Enter'], description: 'Add thought / confirm AI suggestion' },
      { keys: ['/'], description: 'Pick an existing Topic (at line start)' },
      { keys: ['//'], description: 'Create a new Topic (at line start)' },
    ],
  },
];

export function ShortcutsModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative z-10 w-[min(520px,90vw)] rounded-2xl border border-neutral-700/60 bg-neutral-950/95 shadow-2xl overflow-hidden backdrop-blur-xl animate-pop-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-neutral-800/60">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">⌨️</span>
            <h2 className="font-display font-bold text-base text-neutral-100 tracking-tight">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
          >
            <XIcon size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-5">
          {SHORTCUTS.map(section => (
            <div key={section.section}>
              <h3 className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-2.5">
                {section.section}
              </h3>
              <div className="space-y-1">
                {section.items.map(item => (
                  <div
                    key={item.description}
                    className="flex items-center justify-between gap-4 py-1.5 px-3 rounded-lg hover:bg-neutral-800/40 transition-colors"
                  >
                    <span className="text-sm text-neutral-300">{item.description}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((k, i) => (
                        <React.Fragment key={k}>
                          {i > 0 && <span className="text-neutral-600 text-[10px]">+</span>}
                          <kbd className="inline-flex items-center px-2 py-0.5 rounded-md border border-neutral-700 bg-neutral-800 text-[11px] font-mono font-semibold text-neutral-200 shadow-sm">
                            {k}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-2 border-t border-neutral-800/60">
          <p className="text-[11px] text-neutral-500 text-center">
            Press <kbd className="px-1 py-0.5 rounded text-[10px] border border-neutral-700 bg-neutral-800 font-mono">Esc</kbd> or click outside to close
          </p>
        </div>
      </div>
    </div>
  );
}
