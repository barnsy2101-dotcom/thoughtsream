import React, { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { XIcon } from './icons';

export function ExportSidebar() {
  const exportSidebarOpen = useStore(s => s.exportSidebarOpen);
  const setExportSidebarOpen = useStore(s => s.setExportSidebarOpen);
  const draftOutline = useStore(s => s.draftOutline);
  const setDraftOutline = useStore(s => s.setDraftOutline);
  const theme = useStore(s => s.theme);

  const [copied, setCopied] = useState(false);

  const close = () => {
    setExportSidebarOpen(false);
    requestAnimationFrame(() => document.getElementById('thought-input')?.focus());
  };

  // Drag state — use ref for the in-flight payload to avoid re-render jitter
  const dragRef = useRef(null);
  const [draggingSection, setDraggingSection] = useState(null);
  const [dragOverSection, setDragOverSection] = useState(null);
  const [draggingThought, setDraggingThought] = useState(null); // { sectionIdx, thoughtIdx }
  const [dragOverThought, setDragOverThought] = useState(null); // { sectionIdx, thoughtIdx }

  const isDark = theme !== 'light';

  /* ---- Copy ---- */
  const handleCopy = () => {
    let md = '';
    for (const section of draftOutline) {
      md += `### ${section.title}\n`;
      for (const thought of section.thoughts) {
        md += `- ${thought}\n`;
      }
      md += '\n';
    }
    navigator.clipboard.writeText(md.trim()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  /* ---- Section DnD handlers ---- */
  const onSectionDragStart = (e, sectionIdx) => {
    dragRef.current = { type: 'section', sectionIdx };
    setDraggingSection(sectionIdx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onSectionDragEnter = (e, sectionIdx) => {
    e.preventDefault();
    if (dragRef.current?.type === 'section') {
      setDragOverSection(sectionIdx);
    }
  };

  const onSectionDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onSectionDrop = (e, targetIdx) => {
    e.preventDefault();
    if (dragRef.current?.type !== 'section') return;
    const { sectionIdx: fromIdx } = dragRef.current;
    if (fromIdx === targetIdx) { clearDragState(); return; }

    const next = [...draftOutline];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(targetIdx, 0, moved);
    setDraftOutline(next);
    clearDragState();
  };

  /* ---- Thought DnD handlers ---- */
  const onThoughtDragStart = (e, sectionIdx, thoughtIdx) => {
    e.stopPropagation(); // prevent section drag from also firing
    dragRef.current = { type: 'thought', sectionIdx, thoughtIdx };
    setDraggingThought({ sectionIdx, thoughtIdx });
    e.dataTransfer.effectAllowed = 'move';
  };

  const onThoughtDragEnter = (e, sectionIdx, thoughtIdx) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragRef.current?.type === 'thought' && dragRef.current.sectionIdx === sectionIdx) {
      setDragOverThought({ sectionIdx, thoughtIdx });
    }
  };

  const onThoughtDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const onThoughtDrop = (e, targetSectionIdx, targetThoughtIdx) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragRef.current?.type !== 'thought') return;
    const { sectionIdx: fromSection, thoughtIdx: fromIdx } = dragRef.current;
    if (fromSection !== targetSectionIdx || fromIdx === targetThoughtIdx) { clearDragState(); return; }

    const next = draftOutline.map((s, si) => {
      if (si !== fromSection) return s;
      const thoughts = [...s.thoughts];
      const [moved] = thoughts.splice(fromIdx, 1);
      thoughts.splice(targetThoughtIdx, 0, moved);
      return { ...s, thoughts };
    });
    setDraftOutline(next);
    clearDragState();
  };

  const clearDragState = () => {
    dragRef.current = null;
    setDraggingSection(null);
    setDragOverSection(null);
    setDraggingThought(null);
    setDragOverThought(null);
  };

  /* ---- Colours ---- */
  const dropLineColor = isDark ? 'rgba(245,201,122,0.8)' : 'rgba(176,122,0,0.7)';
  const thoughtDropLineColor = isDark ? 'rgba(99,179,237,0.8)' : 'rgba(37,99,235,0.7)';

  return (
    <div
      data-ui
      className={'absolute top-0 right-0 bottom-0 w-[min(360px,92vw)] z-50 flex flex-col shadow-2xl backdrop-blur-2xl transition-transform duration-300 rounded-l-2xl ' +
        (exportSidebarOpen ? '' : 'translate-x-full')}
      style={{
        background: isDark ? 'rgba(18, 18, 18, 0.97)' : 'rgba(255, 255, 255, 0.97)',
        borderLeft: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
      }}
      onWheel={e => e.stopPropagation()}
      onPointerDown={e => e.stopPropagation()}
      onDragEnd={clearDragState}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 border-b flex-shrink-0"
        style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📄</span>
          <h2 className="font-display font-semibold text-base" style={{ color: isDark ? '#EAEAEA' : '#1B1B1B' }}>
            Export Outline
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: isDark ? '#A3A3A3' : '#666' }}>
            {draftOutline.length} {draftOutline.length === 1 ? 'section' : 'sections'}
          </span>
        </div>
        <button
          onClick={close}
          className="ghost-btn p-1.5 rounded-lg hover:bg-neutral-800/50"
          style={{ color: isDark ? '#A3A3A3' : '#666' }}
          title="Close"
        >
          <XIcon size={18} />
        </button>
      </div>

      {/* Hint */}
      {draftOutline.length > 0 && (
        <div className="px-4 pt-3 pb-0">
          <p className="text-[10px]" style={{ color: isDark ? '#555' : '#bbb' }}>
            ⠿ Drag sections or thoughts to reorder · changes reflect in clipboard
          </p>
        </div>
      )}

      {/* Outline list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {draftOutline.length === 0 ? (
          <div className="text-center py-12 px-4">
            <span className="text-3xl block mb-3 opacity-40">📝</span>
            <p className="text-sm font-medium" style={{ color: isDark ? '#A3A3A3' : '#666' }}>
              No content to export yet.
            </p>
            <p className="text-xs mt-1" style={{ color: isDark ? '#666' : '#999' }}>
              Add thoughts and topics to your canvas first.
            </p>
          </div>
        ) : (
          draftOutline.map((section, i) => {
            const isSectionDragging = draggingSection === i;
            const isSectionDropTarget = dragOverSection === i && draggingSection !== null && draggingSection !== i;

            return (
              <div
                key={i}
                draggable={true}
                onDragStart={e => onSectionDragStart(e, i)}
                onDragEnter={e => onSectionDragEnter(e, i)}
                onDragOver={onSectionDragOver}
                onDrop={e => onSectionDrop(e, i)}
                style={{
                  opacity: isSectionDragging ? 0.35 : 1,
                  transform: isSectionDragging ? 'scale(0.98)' : 'scale(1)',
                  transition: 'opacity 0.15s, transform 0.15s',
                  borderTop: isSectionDropTarget ? `2px solid ${dropLineColor}` : '2px solid transparent',
                  borderRadius: 12,
                  paddingTop: isSectionDropTarget ? 6 : 0,
                }}
              >
                {/* Section header */}
                <div className="flex items-center gap-2 mb-2 select-none">
                  {/* Drag handle */}
                  <span
                    className="text-base leading-none flex-shrink-0"
                    style={{ color: isDark ? '#444' : '#ccc', cursor: 'grab' }}
                    title="Drag to reorder section"
                  >
                    ⠿
                  </span>
                  <span
                    className="text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md"
                    style={{
                      color: section.isUnsorted
                        ? (isDark ? '#888' : '#999')
                        : (isDark ? '#F5C97A' : '#B07A00'),
                      background: section.isUnsorted
                        ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)')
                        : (isDark ? 'rgba(245,201,122,0.1)' : 'rgba(176,122,0,0.08)'),
                    }}
                  >
                    {section.isUnsorted ? 'Unsorted' : '# Topic'}
                  </span>
                  <span
                    className="font-semibold text-sm"
                    style={{ color: isDark ? '#EAEAEA' : '#1B1B1B' }}
                  >
                    {section.title}
                  </span>
                  <span
                    className="text-[10px] ml-auto tabular-nums flex-shrink-0"
                    style={{ color: isDark ? '#555' : '#aaa' }}
                  >
                    {section.thoughts.length} thought{section.thoughts.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Thoughts */}
                <div
                  className="rounded-xl overflow-hidden border"
                  style={{ borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }}
                >
                  {section.thoughts.length === 0 ? (
                    <div className="text-xs px-4 py-3 italic" style={{ color: isDark ? '#555' : '#bbb' }}>
                      No thoughts in this topic.
                    </div>
                  ) : (
                    section.thoughts.map((thought, j) => {
                      const isThoughtDragging = draggingThought?.sectionIdx === i && draggingThought?.thoughtIdx === j;
                      const isThoughtDropTarget = dragOverThought?.sectionIdx === i && dragOverThought?.thoughtIdx === j
                        && draggingThought?.sectionIdx === i && draggingThought?.thoughtIdx !== j;

                      return (
                        <div
                          key={j}
                          draggable={true}
                          onDragStart={e => onThoughtDragStart(e, i, j)}
                          onDragEnter={e => onThoughtDragEnter(e, i, j)}
                          onDragOver={onThoughtDragOver}
                          onDrop={e => onThoughtDrop(e, i, j)}
                          className="flex items-start gap-2.5 px-3 py-2.5 text-xs border-b last:border-b-0"
                          style={{
                            borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                            background: isThoughtDropTarget
                              ? (isDark ? 'rgba(99,179,237,0.1)' : 'rgba(37,99,235,0.06)')
                              : (j % 2 === 0
                                ? (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)')
                                : 'transparent'),
                            color: isDark ? '#D4D4D4' : '#333',
                            opacity: isThoughtDragging ? 0.3 : 1,
                            transition: 'opacity 0.15s, background 0.1s',
                            cursor: 'grab',
                            borderLeft: isThoughtDropTarget ? `3px solid ${thoughtDropLineColor}` : '3px solid transparent',
                          }}
                        >
                          {/* Drag handle */}
                          <span
                            className="text-base leading-none flex-shrink-0 mt-0.5"
                            style={{ color: isDark ? '#3a3a3a' : '#d4d4d4' }}
                          >
                            ⠿
                          </span>
                          <span style={{ color: isDark ? '#555' : '#bbb', marginTop: 1, flexShrink: 0 }}>–</span>
                          <span className="leading-relaxed">{thought}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div
        className="p-4 border-t flex-shrink-0"
        style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
      >
        <div className="text-[10px] mb-2 font-mono px-2 py-1 rounded-md truncate"
          style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', color: isDark ? '#666' : '#aaa' }}>
          {draftOutline.map(s => `### ${s.title}`).join(' · ')}
        </div>
        <button
          onClick={handleCopy}
          disabled={draftOutline.length === 0}
          className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
          style={{
            background: copied
              ? (isDark ? 'rgba(52,211,153,0.15)' : 'rgba(5,150,105,0.1)')
              : (isDark ? 'rgba(245,201,122,0.15)' : 'rgba(176,122,0,0.1)'),
            border: `1px solid ${copied
              ? (isDark ? 'rgba(52,211,153,0.4)' : 'rgba(5,150,105,0.3)')
              : (isDark ? 'rgba(245,201,122,0.35)' : 'rgba(176,122,0,0.25)')}`,
            color: copied
              ? (isDark ? '#34d399' : '#059669')
              : (isDark ? '#F5C97A' : '#8a5e00'),
            cursor: draftOutline.length === 0 ? 'not-allowed' : 'pointer',
            opacity: draftOutline.length === 0 ? 0.5 : 1,
          }}
        >
          {copied ? '✓ Copied!' : '📋 Copy to Clipboard'}
        </button>
      </div>
    </div>
  );
}
