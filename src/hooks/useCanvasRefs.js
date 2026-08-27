import { useRef } from 'react';

export function useCanvasRefs() {
  const containerRef = useRef(null);
  const worldElRef = useRef(null);
  const bgRef = useRef(null);
  const nodeEls = useRef({});
  const pathEls = useRef({});
  const hitEls = useRef({});
  const labelEls = useRef({});
  const badgeEls = useRef({});
  const suggCardRef = useRef(null);
  const linkCardRef = useRef(null);
  const previewRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef(null);
  const panRef = useRef(null);
  const marqueeStartRef = useRef(null);
  const linkDragRef = useRef(null);
  const zoneEls = useRef({});
  const threadLineRef = useRef(null);
  const nodeBounds = useRef({});
  const observedNodes = useRef(new Set());
  const resizeObserver = useRef(null);
  const lastAIHashRef = useRef('');
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const recRef = useRef(null);
  const pullTetherGroupRef = useRef(null);
  const sourceTetherGroupRef = useRef(null);

  return {
    containerRef,
    worldElRef,
    bgRef,
    nodeEls,
    pathEls,
    hitEls,
    labelEls,
    badgeEls,
    suggCardRef,
    linkCardRef,
    previewRef,
    mouseRef,
    dragRef,
    panRef,
    marqueeStartRef,
    linkDragRef,
    zoneEls,
    threadLineRef,
    nodeBounds,
    observedNodes,
    resizeObserver,
    lastAIHashRef,
    undoStack,
    redoStack,
    recRef,
    pullTetherGroupRef,
    sourceTetherGroupRef
  };
}
