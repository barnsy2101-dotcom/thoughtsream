import React from 'react';
import { useStore } from '../store/useStore';
import { PlusIcon, MinusIcon, FitIcon, UndoIcon, RedoIcon, SparkIcon, ShapesIcon, SquareIcon, StraightLineIcon, FreeArrowIcon, MapPinIcon, MousePointerIcon, HandIcon, FrameIcon } from './icons';

export function Toolbar({ zoomBy, zoomToFit, undo, redo, undoStackLength, redoStackLength, runAI, nodesLength }) {
  const aiBusy = useStore(s => s.aiBusy);
  const linkFrom = useStore(s => s.linkFrom);
  const setLinkFrom = useStore(s => s.setLinkFrom);
  const activeDrawTool = useStore(s => s.activeDrawTool);
  const setActiveDrawTool = useStore(s => s.setActiveDrawTool);
  const drawMenuOpen = useStore(s => s.drawMenuOpen);
  const setDrawMenuOpen = useStore(s => s.setDrawMenuOpen);
  const isPlacingMarker = useStore(s => s.isPlacingMarker);
  const setIsPlacingMarker = useStore(s => s.setIsPlacingMarker);
  const canvasMode = useStore(s => s.canvasMode);
  const setCanvasMode = useStore(s => s.setCanvasMode);

  const isDefaultSelect = !linkFrom && !activeDrawTool && !isPlacingMarker;
  const pencilMenuRef = React.useRef(null);
  const splitViewOpen = useStore(s => s.splitViewOpen);
  const splitWidth = useStore(s => s.splitWidth);

  React.useEffect(() => {
    if (!drawMenuOpen) return;

    const handlePointerDown = (e) => {
      if (pencilMenuRef.current && !pencilMenuRef.current.contains(e.target)) {
        setDrawMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [drawMenuOpen, setDrawMenuOpen]);

  const resetTools = () => {
    setLinkFrom(null);
    setActiveDrawTool(null);
    setIsPlacingMarker(false);
    setDrawMenuOpen(false);
  };

  return (
    <div data-ui className="glass fixed top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 p-1.5 z-30 rounded-2xl transition-colors duration-200" style={{ right: splitViewOpen ? `${splitWidth + 12}px` : '12px' }}>
      {/* 1. ACTIVE TOOLS (Cursor Modes) */}
      <button 
        onClick={() => {
          if (!isDefaultSelect) {
            resetTools();
          } else {
            setCanvasMode(canvasMode === 'hand' ? 'select' : 'hand');
          }
        }} 
        title={canvasMode === 'hand' ? "Hand (Pan Mode)" : "Pointer (Select Mode)"} 
        className={`ghost-btn rounded-lg p-2 transition-all ${
          isDefaultSelect ? 'bg-indigo-600 text-white font-bold shadow-md' : 'text-neutral-300'
        }`}
      >
        {canvasMode === 'hand' ? <HandIcon size={15} /> : <MousePointerIcon size={15} />}
      </button>

      <button 
        onClick={() => {
          const next = !isPlacingMarker;
          setIsPlacingMarker(next);
          if (next) {
            setLinkFrom(null);
            setActiveDrawTool(null);
            setDrawMenuOpen(false);
          }
        }} 
        title="Drop Pin Tool" 
        className={`ghost-btn rounded-lg p-2 transition-all ${
          isPlacingMarker ? 'bg-indigo-600 text-white font-bold shadow-md' : 'text-neutral-300'
        }`}
      >
        <MapPinIcon size={15} />
      </button>

      <button 
        onClick={() => {
          const next = activeDrawTool === 'zone' ? null : 'zone';
          setActiveDrawTool(next);
          setDrawMenuOpen(false);
          if (next) {
            setLinkFrom(null);
            setIsPlacingMarker(false);
          }
        }} 
        title="Add Zone — click and drag to group bubbles into a frame" 
        className={`ghost-btn rounded-lg p-2 transition-all ${
          activeDrawTool === 'zone' ? 'bg-indigo-600 text-white font-bold shadow-md' : 'text-neutral-300'
        }`}
      >
        <FrameIcon size={15} />
      </button>

      <div ref={pencilMenuRef} className="relative flex flex-col items-center">
        <button 
          onClick={() => {
            const nextOpen = !drawMenuOpen;
            setDrawMenuOpen(nextOpen);
            if (nextOpen && !activeDrawTool) {
              setLinkFrom(null);
              setIsPlacingMarker(false);
            }
          }} 
          title="Annotations" 
          className={`ghost-btn rounded-lg p-2 transition-all ${
            (activeDrawTool && activeDrawTool !== 'zone') || drawMenuOpen ? 'bg-indigo-600/20 text-indigo-300' : 'text-neutral-300'
          }`}
        >
          <ShapesIcon size={15} />
        </button>
        {drawMenuOpen && (
          <div className="absolute right-full mr-2 top-0 flex items-center gap-1 bg-[#1E1E1E] border border-neutral-700 p-1 rounded-xl shadow-xl">
            <button 
              onClick={() => { setActiveDrawTool(activeDrawTool === 'rect' ? null : 'rect'); setDrawMenuOpen(false); setLinkFrom(null); setIsPlacingMarker(false); }}
              className={`p-2 rounded-lg transition-all ${activeDrawTool === 'rect' ? 'bg-indigo-600 text-white' : 'text-neutral-300 hover:bg-neutral-800'}`}
              title="Square (⌘S)"
            ><SquareIcon size={15} /></button>
            <button 
              onClick={() => { setActiveDrawTool(activeDrawTool === 'line' ? null : 'line'); setDrawMenuOpen(false); setLinkFrom(null); setIsPlacingMarker(false); }}
              className={`p-2 rounded-lg transition-all ${activeDrawTool === 'line' ? 'bg-indigo-600 text-white' : 'text-neutral-300 hover:bg-neutral-800'}`}
              title="Straight Line (⌘L)"
            ><StraightLineIcon size={15} /></button>
            <button 
              onClick={() => { setActiveDrawTool(activeDrawTool === 'arrow' ? null : 'arrow'); setDrawMenuOpen(false); setLinkFrom(null); setIsPlacingMarker(false); }}
              className={`p-2 rounded-lg transition-all ${activeDrawTool === 'arrow' ? 'bg-indigo-600 text-white' : 'text-neutral-300 hover:bg-neutral-800'}`}
              title="Free Arrow (⌘A)"
            ><FreeArrowIcon size={15} /></button>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="w-full h-[1px] bg-neutral-700/50 my-1" />

      {/* 2. MAGIC */}
      <button onClick={() => runAI()} title="Synthesize now"
        className={'ghost-btn rounded-lg p-2 ' + (aiBusy ? 'text-neutral-100' : 'text-neutral-300')}>
        <span className={aiBusy ? 'spin inline-flex' : 'inline-flex'}><SparkIcon size={15} /></span>
      </button>

      {/* Divider */}
      <div className="w-full h-[1px] bg-neutral-700/50 my-1" />

      {/* 3. HISTORY */}
      <button onClick={undo} title="Undo (⌘Z)" disabled={!undoStackLength}
        className="ghost-btn text-neutral-300 disabled:text-neutral-700 rounded-lg p-2"><UndoIcon size={15} /></button>
      <button onClick={redo} title="Redo (⇧⌘Z)" disabled={!redoStackLength}
        className="ghost-btn text-neutral-300 disabled:text-neutral-700 rounded-lg p-2"><RedoIcon size={15} /></button>

      {/* Divider */}
      <div className="w-full h-[1px] bg-neutral-700/50 my-1" />

      {/* 4. VIEWPORT CONTROLS */}
      <button onClick={() => zoomBy(1.25)} title="Zoom in" className="ghost-btn text-neutral-300 rounded-lg p-2"><PlusIcon size={15} /></button>
      <button onClick={() => zoomBy(0.8)} title="Zoom out" className="ghost-btn text-neutral-300 rounded-lg p-2"><MinusIcon size={15} /></button>
      <button onClick={zoomToFit} title="Zoom to fit" className="ghost-btn text-neutral-300 rounded-lg p-2"><FitIcon size={15} /></button>
    </div>
  );
}
