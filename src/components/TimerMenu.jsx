import React from 'react';
import { useStore } from '../store/useStore';
import { XIcon } from './icons';

function formatTime(s) {
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return `${m}:${rs < 10 ? '0' : ''}${rs}`;
}

export function TimerMenu({ startTimer }) {
  const timerMenuOpen = useStore(s => s.timerMenuOpen);
  const setTimerMenuOpen = useStore(s => s.setTimerMenuOpen);
  const timerActive = useStore(s => s.timerActive);
  const setTimerActive = useStore(s => s.setTimerActive);
  const timerTimeLeft = useStore(s => s.timerTimeLeft);
  const timerMode = useStore(s => s.timerMode);
  const [customTime, setCustomTime] = React.useState('');

  if (!timerMenuOpen) return null;

  return (
    <div data-ui className="bg-neutral-900/95 backdrop-blur-md border border-neutral-700/80 shadow-2xl absolute right-14 top-1/2 -translate-y-1/2 p-3 z-50 rounded-2xl w-48 animate-pop-in" 
      onPointerDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
      onDoubleClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-display font-semibold text-neutral-200 text-sm">Study Timer</h3>
        <button onClick={() => setTimerMenuOpen(false)} className="text-neutral-500 hover:text-neutral-300"><XIcon size={14}/></button>
      </div>
      
      {timerActive ? (
        <div className="text-center py-2">
          <div className="text-xs uppercase text-neutral-400 font-semibold mb-1">{timerMode}</div>
          <div className="text-3xl font-display font-bold text-neutral-100 mb-3 font-mono">{formatTime(timerTimeLeft)}</div>
          <button onClick={() => { setTimerActive(false); setTimerMenuOpen(false); }} className="w-full py-1.5 rounded-lg bg-red-500/20 text-red-300 text-sm font-semibold hover:bg-red-500/30 transition-colors border border-red-500/30">Stop Timer</button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <button onClick={() => startTimer(25, 'Study')} className="text-left text-sm text-neutral-200 hover:bg-neutral-700/50 px-2 py-1.5 rounded-lg transition-colors border border-transparent hover:border-neutral-600/50">📚 25m Focus</button>
          <button onClick={() => startTimer(50, 'Study')} className="text-left text-sm text-neutral-200 hover:bg-neutral-700/50 px-2 py-1.5 rounded-lg transition-colors border border-transparent hover:border-neutral-600/50">📚 50m Deep Work</button>
          <div className="w-full h-px bg-neutral-700/50 my-0.5" />
          <button onClick={() => startTimer(5, 'Break')} className="text-left text-sm text-neutral-200 hover:bg-neutral-700/50 px-2 py-1.5 rounded-lg transition-colors border border-transparent hover:border-neutral-600/50">☕ 5m Short Break</button>
          <button onClick={() => startTimer(15, 'Break')} className="text-left text-sm text-neutral-200 hover:bg-neutral-700/50 px-2 py-1.5 rounded-lg transition-colors border border-transparent hover:border-neutral-600/50">☕ 15m Long Break</button>
          <div className="w-full h-px bg-neutral-700/50 my-0.5" />
          <div className="flex items-center gap-1.5 mt-1">
            <input 
              type="number" 
              min="1" 
              value={customTime} 
              onChange={e => setCustomTime(e.target.value)} 
              className="w-12 bg-neutral-900/50 border border-neutral-600/50 rounded-md px-1 py-1 text-xs text-neutral-200 text-center focus:outline-none focus:border-amber-500/50 placeholder-neutral-500"
              placeholder="m"
            />
            <button onClick={() => startTimer(parseInt(customTime, 10) || 5, 'Study')} className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-[11px] font-semibold rounded-md py-1 transition-colors uppercase tracking-wider">Study</button>
            <button onClick={() => startTimer(parseInt(customTime, 10) || 5, 'Break')} className="flex-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 text-[11px] font-semibold rounded-md py-1 transition-colors uppercase tracking-wider">Break</button>
          </div>
        </div>
      )}
    </div>
  );
}
