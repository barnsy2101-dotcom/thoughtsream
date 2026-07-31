import React from 'react';
import { useStore } from '../store/useStore';
import { SparkIcon, PlusIcon } from './icons';
import { TOPIC_ACCENT } from '../utils/constants';

export function TopicMenu({ topics, nodes, createTopic }) {
  const topicMenuOpen = useStore(s => s.topicMenuOpen);
  const setTopicMenuOpen = useStore(s => s.setTopicMenuOpen);
  const activeTopic = useStore(s => s.activeTopic);
  const setActiveTopic = useStore(s => s.setActiveTopic);
  const activeSorterTopicId = useStore(s => s.activeSorterTopicId);
  const setActiveSorterTopicId = useStore(s => s.setActiveSorterTopicId);
  const newTopicName = useStore(s => s.newTopicName);
  const setNewTopicName = useStore(s => s.setNewTopicName);

  if (!topicMenuOpen) return null;

  const handleCreate = () => {
    if (newTopicName.trim()) {
      createTopic(newTopicName);
      setNewTopicName('');
      setTopicMenuOpen(false);
    }
  };

  return (
    <div className="bg-neutral-900/95 backdrop-blur-md border border-neutral-700/80 shadow-2xl absolute bottom-full mb-2 left-2 rounded-2xl p-1.5 w-64 z-50 animate-pop-in select-none pointer-events-auto" 
      onPointerDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
      onDoubleClick={e => e.stopPropagation()}>
      <button type="button" onClick={() => { setActiveTopic(null); setTopicMenuOpen(false); }}
        className={'ghost-btn w-full text-left text-[13px] rounded-xl px-3 py-2 flex items-center gap-2 ' + (!activeTopic ? 'text-neutral-100 font-semibold' : 'text-neutral-300')}>
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: activeTopic ? 'transparent' : TOPIC_ACCENT, border: '1px solid ' + TOPIC_ACCENT }} />
        No topic <span className="text-neutral-600 text-[11px]">— free-floating</span>
      </button>
      {topics.map(t => (
        <div key={t.id} className="flex items-center gap-1 w-full">
          <button type="button" onClick={() => { setActiveTopic(t.id); setTopicMenuOpen(false); }}
            className={'ghost-btn flex-1 text-left text-[13px] rounded-xl px-3 py-2 flex items-center gap-2 min-w-0 ' + (activeTopic === t.id ? 'text-neutral-100 font-semibold' : 'text-neutral-300')}>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: activeTopic === t.id ? TOPIC_ACCENT : 'transparent', border: '1px solid ' + TOPIC_ACCENT }} />
            <span className="truncate flex-1">{t.title}</span>
            <span className="text-neutral-600 text-[11px] shrink-0">{nodes.filter(n => n.topicId === t.id).length}</span>
          </button>
          <button type="button" onClick={() => { setActiveSorterTopicId(activeSorterTopicId === t.id ? null : t.id); setTopicMenuOpen(false); }}
            title={activeSorterTopicId === t.id ? "Disable Quick-Sorter" : `Enable Quick-Sorter: click bubbles to send them to "${t.title}"`}
            className={'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ' + (activeSorterTopicId === t.id ? 'text-amber-300 bg-amber-500/20 border-amber-400/40' : 'text-neutral-500 hover:text-neutral-300 border-transparent hover:bg-neutral-700/40')}>
            <SparkIcon size={12} className={activeSorterTopicId === t.id ? "animate-pulse" : ""} />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-1.5 mt-1 pt-1.5 border-t border-neutral-700/50 px-1">
        <input value={newTopicName} onChange={e => setNewTopicName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreate(); } }}
          placeholder="New topic…" autoComplete="off"
          className="flex-1 bg-neutral-800/60 border border-neutral-600/40 rounded-lg px-2.5 py-1.5 text-neutral-100 text-[13px] min-w-0" />
        <button type="button" onClick={handleCreate}
          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-neutral-100 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600">
          <PlusIcon size={15} />
        </button>
      </div>
    </div>
  );
}
