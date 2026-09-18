import React from 'react';
import { useStore } from '../store/useStore';
import { PlusIcon, MinusIcon, FitIcon, UndoIcon, RedoIcon, ClockIcon, PlayIcon, SparkIcon, PencilIcon, SquareIcon, StraightLineIcon, FreeArrowIcon, MapPinIcon } from './icons';

export function Toolbar({ zoomBy, zoomToFit, undo, redo, undoStackLength, redoStackLength, runAI, nodesLength, createZone }) {
  const replayIdx = useStore(s => s.replayIdx);
  const setReplayIdx = useStore(s => s.setReplayIdx);
  const timerMenuOpen = useStore(s => s.timerMenuOpen);
  const setTimerMenuOpen = useStore(s => s.setTimerMenuOpen);
  const timerActive = useStore(s => s.timerActive);
  const aiBusy = useStore(s => s.aiBusy);
  const linkFrom = useStore(s => s.linkFrom);
  const setLinkFrom = useStore(s => s.setLinkFrom);
  const activeDrawTool = useStore(s => s.activeDrawTool);
  const setActiveDrawTool = useStore(s => s.setActiveDrawTool);
  const drawMenuOpen = useStore(s => s.drawMenuOpen);
  const setDrawMenuOpen = useStore(s => s.setDrawMenuOpen);
  const isPlacingMarker = useStore(s => s.isPlacingMarker);
  const setIsPlacingMarker = useStore(s => s.setIsPlacingMarker);

  const replaying = replayIdx !== null;

  return (
    <div data-ui className="glass absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 p-1.5 z-30 rounded-2xl">
      <button onClick={() => zoomBy(1.25)} title="Zoom in" className="ghost-btn text-neutral-300 rounded-lg p-2"><PlusIcon size={15} /></button>
      <button onClick={() => zoomBy(0.8)} title="Zoom out" className="ghost-btn text-neutral-300 rounded-lg p-2"><MinusIcon size={15} /></button>
      <button onClick={zoomToFit} title="Zoom to fit" className="ghost-btn text-neutral-300 rounded-lg p-2"><FitIcon size={15} /></button>
      <div className="w-6 h-px bg-neutral-600/40 my-1" />
      <button 
        onClick={() => setLinkFrom(linkFrom ? null : 'toolbar_active')} 
        title="Draw Arrow Tool (Click two bubbles to connect)" 
        className={`ghost-btn rounded-lg p-2 transition-all ${
          linkFrom ? 'bg-indigo-600 text-white font-bold shadow-md' : 'text-neutral-300'
        }`}
      >
        ↗
      </button>
      <div className="relative flex flex-col items-center">
        <button 
          onClick={() => setDrawMenuOpen(!drawMenuOpen)} 
          title="Drawing Tools" 
          className={`ghost-btn rounded-lg p-2 transition-all ${
            activeDrawTool || drawMenuOpen ? 'bg-indigo-600/20 text-indigo-300' : 'text-neutral-300'
          }`}
        >
          <PencilIcon size={15} />
        </button>
        {drawMenuOpen && (
          <div className="absolute right-full mr-2 top-0 flex items-center gap-1 bg-[#1E1E1E] border border-neutral-700 p-1 rounded-xl shadow-xl">
            <button 
              onClick={() => { setActiveDrawTool(activeDrawTool === 'rect' ? null : 'rect'); setDrawMenuOpen(false); }}
              className={`p-2 rounded-lg transition-all ${activeDrawTool === 'rect' ? 'bg-indigo-600 text-white' : 'text-neutral-300 hover:bg-neutral-800'}`}
              title="Square (⌘S)"
            ><SquareIcon size={15} /></button>
            <button 
              onClick={() => { setActiveDrawTool(activeDrawTool === 'line' ? null : 'line'); setDrawMenuOpen(false); }}
              className={`p-2 rounded-lg transition-all ${activeDrawTool === 'line' ? 'bg-indigo-600 text-white' : 'text-neutral-300 hover:bg-neutral-800'}`}
              title="Straight Line (⌘L)"
            ><StraightLineIcon size={15} /></button>
            <button 
              onClick={() => { setActiveDrawTool(activeDrawTool === 'arrow' ? null : 'arrow'); setDrawMenuOpen(false); }}
              className={`p-2 rounded-lg transition-all ${activeDrawTool === 'arrow' ? 'bg-indigo-600 text-white' : 'text-neutral-300 hover:bg-neutral-800'}`}
              title="Free Arrow (⌘A)"
            ><FreeArrowIcon size={15} /></button>
          </div>
        )}
      </div>
      <div className="w-6 h-px bg-neutral-600/40 my-1" />
      <button 
        onClick={() => createZone('New Zone')} 
        title="Add Zone — group bubbles into a labelled frame" 
        className="ghost-btn text-neutral-300 rounded-lg p-2"
      >
        <SquareIcon size={15} />
      </button>
      <button 
        onClick={() => setIsPlacingMarker(!isPlacingMarker)} 
        title="Drop Pin Tool" 
        className={`ghost-btn rounded-lg p-2 transition-all ${
          isPlacingMarker ? 'bg-indigo-600 text-white font-bold shadow-md' : 'text-neutral-300'
        }`}
      >
        <MapPinIcon size={15} />
      </button>
      <button onClick={undo} title="Undo (⌘Z)" disabled={!undoStackLength}
        className="ghost-btn text-neutral-300 disabled:text-neutral-700 rounded-lg p-2"><UndoIcon size={15} /></button>
      <button onClick={redo} title="Redo (⇧⌘Z)" disabled={!redoStackLength}
        className="ghost-btn text-neutral-300 disabled:text-neutral-700 rounded-lg p-2"><RedoIcon size={15} /></button>
      {/*
      <div className="w-6 h-px bg-neutral-600/40 my-1" />
      <button onClick={() => setTimerMenuOpen(!timerMenuOpen)} title="Study Timer"
        className={'ghost-btn rounded-lg p-2 relative ' + (timerActive || timerMenuOpen ? 'text-amber-300 bg-amber-500/10' : 'text-neutral-300')}>
        <ClockIcon size={15} />
        {timerActive && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
      </button>
      <div className="w-6 h-px bg-neutral-600/40 my-1" />
      <button onClick={() => { if (!replaying && nodesLength) { zoomToFit(); setReplayIdx(0); } }} title="Replay session"
        className={'ghost-btn rounded-lg p-2 ' + (replaying ? 'text-neutral-100 font-bold' : 'text-neutral-300')}><PlayIcon size={15} /></button>
      */}
      <button onClick={() => runAI()} title="Synthesize now"
        className={'ghost-btn rounded-lg p-2 ' + (aiBusy ? 'text-neutral-100' : 'text-neutral-300')}>
        <span className={aiBusy ? 'spin inline-flex' : 'inline-flex'}><SparkIcon size={15} /></span>
      </button>
    </div>
  );
}
