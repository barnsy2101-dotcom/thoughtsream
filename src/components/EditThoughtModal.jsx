import React from 'react';
import { useStore } from '../store/useStore';
import { XIcon, SparkIcon, PinIcon, TrashIcon } from './icons';
import { COLORS } from '../utils/constants';
import { nodeRadius } from '../utils/helpers';

export function EditThoughtModal({ modalNode, expandThought, expandBusy, pushUndo, worldRef, bump, persist, deleteNodes, onClose }) {
  const setModalId = useStore(s => s.setModalId);
  const close = () => { setModalId(null); onClose?.(); };

  if (!modalNode) return null;

  return (
    <div data-ui className="absolute inset-0 z-40 flex items-center justify-center bg-black/45"
      onPointerDown={e => { e.stopPropagation(); if (e.target === e.currentTarget) close(); }}>
      <div className="glass rounded-2xl p-5 w-[min(430px,92vw)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-neutral-100 font-semibold">{modalNode.isHub ? 'Edit Meta-Hub' : modalNode.isTopic ? 'Edit Topic' : 'Edit Thought'}</h3>
          <button onClick={close} className="text-neutral-400 hover:text-neutral-200"><XIcon size={18} /></button>
        </div>
        <label className="text-[11px] uppercase tracking-wider text-neutral-500">{(modalNode.isHub || modalNode.isTopic) ? 'Title' : 'Thought'}</label>
        <textarea rows="2" value={(modalNode.isHub || modalNode.isTopic) ? modalNode.title : modalNode.text}
          onChange={e => {
            if (modalNode.isHub || modalNode.isTopic) { modalNode.title = e.target.value; modalNode.text = e.target.value; }
            else { modalNode.text = e.target.value; modalNode.isQuestion = /\?\s*$/.test(e.target.value); modalNode.r = nodeRadius(modalNode); }
            worldRef.current.updated = Date.now(); bump(); persist();
          }}
          className="w-full mt-1 mb-3 bg-neutral-800/60 border border-neutral-600/40 rounded-lg p-2.5 text-neutral-100 text-sm resize-none" />
        <label className="text-[11px] uppercase tracking-wider text-neutral-500">Sub-notes</label>
        <textarea rows="3" value={modalNode.notes} placeholder="Add supporting details…"
          onChange={e => { modalNode.notes = e.target.value; worldRef.current.updated = Date.now(); bump(); persist(); }}
          className="w-full mt-1 mb-3 bg-neutral-800/60 border border-neutral-600/40 rounded-lg p-2.5 text-neutral-300 text-sm resize-none" />
        <label className="text-[11px] uppercase tracking-wider text-neutral-500">Color</label>
        <div className="flex gap-2 mt-1.5 mb-4">
          {COLORS.map((c, i) => (
            <button key={i} onClick={() => { modalNode.color = i; worldRef.current.updated = Date.now(); bump(); persist(); }}
              className="w-7 h-7 rounded-full"
              style={{ background: c.dot, outline: modalNode.color === i ? '2px solid white' : 'none', outlineOffset: 2, opacity: 0.85 }}
              title={i === 0 ? 'Neutral (default)' : ''} />
          ))}
        </div>
        <div className="flex gap-2 mb-2">
          {!modalNode.isHub && (
            <button onClick={() => expandThought(modalNode)} disabled={expandBusy}
              className="flex-1 flex items-center justify-center gap-1.5 text-sm text-neutral-100 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-lg py-2 disabled:opacity-50">
              <span className={expandBusy ? 'spin inline-flex' : 'inline-flex'}><SparkIcon size={14} /></span>
              {expandBusy ? 'Expanding…' : 'Expand ideas'}
            </button>
          )}
          <button onClick={() => { pushUndo(); modalNode.pinned = !modalNode.pinned; modalNode.vx = 0; modalNode.vy = 0; worldRef.current.updated = Date.now(); bump(); persist(); }}
            className={'flex-1 flex items-center justify-center gap-1.5 text-sm rounded-lg py-2 border '
              + (modalNode.pinned ? 'text-amber-300 bg-amber-400/10 border-amber-400/40' : 'text-neutral-300 bg-neutral-700/30 border-neutral-500/30')}>
            <PinIcon size={14} /> {modalNode.pinned ? 'Pinned' : 'Pin'}
          </button>
        </div>
        <button onClick={() => deleteNodes(modalNode.id)}
          className="w-full flex items-center justify-center gap-1.5 text-sm text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-400/30 rounded-lg py-2">
          <TrashIcon size={14} /> Delete bubble
        </button>
      </div>
    </div>
  );
}
