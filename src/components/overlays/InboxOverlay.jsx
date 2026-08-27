import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store/useStore';

export const InboxOverlay = ({ worldRef }) => {
  const theme = useStore(s => s.theme);
  const w = worldRef.current;
  const inboxNodes = w.nodes.filter(n => n.inInbox);
  
  const [inboxHeight, setInboxHeight] = useState(() => {
    return parseInt(localStorage.getItem('ts_inboxHeight') || '180', 10);
  });
  const isDraggingInboxRef = useRef(false);

  useEffect(() => {
    const handleMove = (e) => {
      if (!isDraggingInboxRef.current) return;
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight >= 60 && newHeight <= window.innerHeight * 0.8) {
        setInboxHeight(newHeight);
      }
    };
    const handleUp = () => {
      if (isDraggingInboxRef.current) {
        isDraggingInboxRef.current = false;
        document.body.style.cursor = '';
      }
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('ts_inboxHeight', inboxHeight);
  }, [inboxHeight]);

  return (
    <>
      {/* --- THE HORIZON LINE --- */}
      <div 
        className="fixed left-0 right-0 z-20 cursor-ns-resize flex items-center justify-center group"
        style={{ bottom: `${inboxHeight - 10}px`, height: '20px' }}
        onPointerDown={(e) => {
          e.stopPropagation();
          isDraggingInboxRef.current = true;
          document.body.style.cursor = 'ns-resize';
        }}
      >
        <div className="w-full border-b-[2px] border-dotted border-neutral-500/30 group-hover:border-neutral-400" />
      </div>

      {/* --- THE STATIC INBOX CANVAS --- */}
      <div 
        className="fixed left-0 right-0 bottom-0 z-10 p-6 pb-24 flex flex-wrap content-start gap-4 overflow-y-auto"
        style={{ height: `${inboxHeight}px`, background: theme === 'light' ? 'rgba(249, 249, 247, 0.4)' : 'rgba(18, 18, 18, 0.4)', backdropFilter: 'blur(4px)' }}
      >
        {inboxNodes.map(n => (
          <div
            key={n.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('application/json', JSON.stringify({ type: 'inbox-thought', id: n.id }));
            }}
            className="px-4 py-2.5 rounded-full cursor-grab active:cursor-grabbing shadow-md transition-transform hover:scale-105 flex items-center justify-center font-medium"
            style={{
              background: theme === 'light' ? '#FFFFFF' : '#2A2A2A',
              borderColor: theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
              borderWidth: '1px',
              color: theme === 'light' ? '#1B1B1B' : '#EAEAEA',
              fontSize: '13px',
              maxWidth: '300px',
              wordBreak: 'break-word'
            }}
          >
            {n.text}
          </div>
        ))}
      </div>
    </>
  );
};
