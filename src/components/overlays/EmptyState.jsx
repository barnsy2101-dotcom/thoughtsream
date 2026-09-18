import React from 'react';
import { TEMPLATES } from '../../utils/constants';

const STEPS = [
  {
    icon: '💬',
    step: '1',
    title: 'Drop a thought',
    desc: 'Type anything in the input below and press Enter.',
  },
  {
    icon: '◆',
    step: '2',
    title: 'Group into a Topic',
    desc: 'Type / at the start to pick or create a Topic cluster.',
  },
  {
    icon: '✦',
    step: '3',
    title: 'Organise your space',
    desc: 'Drag bubbles to arrange. They snap together automatically.',
  },
];

export const EmptyState = ({ worldRef, addThought, pushUndo }) => {
  const w = worldRef.current;

  if (w.nodes.length > 0) return null;

  const seedTemplate = (name) => {
    pushUndo();
    TEMPLATES[name].forEach((t, i) => setTimeout(() => addThought(t, { skipUndo: true }), i * 320));
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="flex flex-col items-center gap-6 text-center max-w-sm px-6">

        {/* Main prompt */}
        <div>
          <div className="text-3xl mb-3 opacity-40">✦</div>
          <p className="font-display text-lg font-semibold text-neutral-400 leading-snug">
            Your canvas is empty
          </p>
          <p className="text-xs text-neutral-600 mt-1.5">
            Start with a thought — the AI handles the rest.
          </p>
        </div>

        {/* 3-step guide */}
        <div className="w-full space-y-2.5">
          {STEPS.map((s) => (
            <div
              key={s.step}
              className="flex items-start gap-3 text-left px-4 py-3 rounded-xl border border-neutral-800/60 bg-neutral-900/40"
            >
              <span className="w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-[11px] font-bold text-neutral-400 shrink-0 mt-0.5">
                {s.step}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-sm">{s.icon}</span>
                  <span className="text-xs font-semibold text-neutral-300">{s.title}</span>
                </div>
                <p className="text-[11px] text-neutral-500 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Seed templates - these need pointer events */}
        <div className="flex flex-wrap gap-2 justify-center pointer-events-auto" data-ui>
          <span className="text-[10px] w-full text-neutral-600 uppercase tracking-widest font-semibold">
            Or try a template
          </span>
          {Object.keys(TEMPLATES).map(name => (
            <button
              key={name}
              onClick={() => seedTemplate(name)}
              className="ghost-btn text-xs text-neutral-400 border border-neutral-700/40 rounded-full px-3.5 py-1.5 hover:text-neutral-200 hover:border-neutral-500 transition-colors"
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
