import React from 'react';
import { TEMPLATES } from '../../utils/constants';

export const EmptyState = ({ worldRef, addThought, pushUndo }) => {
  const w = worldRef.current;
  
  if (w.nodes.length > 0) return null;

  const seedTemplate = (name) => {
    pushUndo();
    TEMPLATES[name].forEach((t, i) => setTimeout(() => addThought(t, { skipUndo: true }), i * 320));
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-center text-neutral-500 pointer-events-none">
        <div className="text-4xl mb-3 text-neutral-500/60">✦</div>
        <p className="font-display text-xl text-neutral-400">Type a thought below and press Enter.</p>
        <p className="text-sm mt-1.5 text-neutral-600">The AI weaves connections as ideas pile up.</p>
        <div className="flex gap-2 justify-center mt-5 pointer-events-auto" data-ui>
          {Object.keys(TEMPLATES).map(name => (
            <button key={name} onClick={() => seedTemplate(name)}
              className="ghost-btn text-xs text-neutral-400 border border-neutral-600/40 rounded-full px-3.5 py-1.5">
              {name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
