import React, { useState, useRef, cloneElement } from 'react';

export function Tooltip({ text, delay = 1000, children, position = 'top' }) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef(null);

  const handleMouseEnter = (e) => {
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
    if (children.props?.onMouseEnter) children.props.onMouseEnter(e);
  };

  const handleMouseLeave = (e) => {
    clearTimeout(timeoutRef.current);
    setIsVisible(false);
    if (children.props?.onMouseLeave) children.props.onMouseLeave(e);
  };

  const positions = {
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
  };

  const tooltipElement = isVisible && (
    <div className={`absolute z-[9999] px-2 py-1 text-[11px] font-medium text-white bg-[#2A2A2A] border border-[#3A3A3A] rounded shadow-xl whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-95 duration-200 ${positions[position]}`}>
      {text}
    </div>
  );

  const isVoidElement = typeof children.type === 'string' && ['input', 'img', 'br', 'hr', 'area', 'base', 'col', 'embed', 'link', 'meta', 'param', 'source', 'track', 'wbr'].includes(children.type);

  if (isVoidElement) {
    return (
      <span 
        className={`relative inline-flex group/tooltip ${children.props.className?.includes('flex-1') ? 'flex-1' : ''}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
        {tooltipElement}
      </span>
    );
  }

  const hasPosition = /\b(absolute|fixed|relative|sticky)\b/.test(children.props.className || '');

  return cloneElement(children, {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    className: `${children.props.className || ''} ${hasPosition ? '' : 'relative'} group/tooltip`,
    children: (
      <>
        {children.props.children}
        {tooltipElement}
      </>
    )
  });
}
