export const fitViewForNodes = (nodes) => {
  if (!nodes || !nodes.length) return { x: 0, y: 0, s: 1 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  nodes.forEach(n => {
    const r = n.r || 50;
    minX = Math.min(minX, (n.x || 0) - r);
    minY = Math.min(minY, (n.y || 0) - r);
    maxX = Math.max(maxX, (n.x || 0) + r);
    maxY = Math.max(maxY, (n.y || 0) + r);
  });
  let wWidth = maxX - minX;
  let wHeight = maxY - minY;
  if (wWidth < 200) { minX -= 100; maxX += 100; wWidth = 200; }
  if (wHeight < 200) { minY -= 100; maxY += 100; wHeight = 200; }

  const pad = 140;
  const ww = window.innerWidth || 1200;
  const wh = window.innerHeight || 800;
  const s = Math.max(0.45, Math.min(1.35, Math.min((ww - pad * 2) / wWidth, (wh - pad * 2) / wHeight)));
  return {
    x: (ww - wWidth * s) / 2 - minX * s,
    y: (wh - wHeight * s) / 2 - minY * s,
    s
  };
};

const CELL_SIZE = 300;

export const applyCollisions = (nodes, hidden, bounds, fixed) => {
  const grid = new Map();
  for (const n of nodes) {
    n._isColliding = false;
    if (hidden.has(n.id) || !bounds[n.id]) continue;
    const cx = Math.floor(n.x / CELL_SIZE);
    const cy = Math.floor(n.y / CELL_SIZE);
    const key = `${cx},${cy}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(n);
  }

  for (let iter = 0; iter < 3; iter++) {
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      if (hidden.has(a.id) || !bounds[a.id]) continue;
      
      const cx = Math.floor(a.x / CELL_SIZE);
      const cy = Math.floor(a.y / CELL_SIZE);
      
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const cell = grid.get(`${cx + ox},${cy + oy}`);
          if (!cell) continue;
          
          for (const b of cell) {
            if (a.id >= b.id) continue;
            if (a.sleeping && b.sleeping) continue;
            if (a.isPulling || b.isPulling) continue;
            if (!bounds[b.id]) continue;
            
            let dx = b.x - a.x;
            let dy = b.y - a.y;
            if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) dx = 0.01;
            
            const isParentChild = (a.isTopic && b.topicId === a.id) || (b.isTopic && a.topicId === a.id);
            const isThoughtToThought = !a.isTopic && !b.isTopic;
            const sameCluster = (a.topicId && a.topicId === b.topicId) || isParentChild;
            
            const pad = isParentChild ? 8 : sameCluster ? 24 : 16;
            const rx = bounds[a.id].w + bounds[b.id].w + pad;
            const ry = bounds[a.id].h + bounds[b.id].h + pad;
            
            const ex = dx / rx;
            const ey = dy / ry;
            const ed = Math.hypot(ex, ey) || 0.01;

            if (ed < 1.0) {
              if (a.sleeping) a.sleeping = false;
              if (b.sleeping) b.sleeping = false;
              a._isColliding = true;
              b._isColliding = true;

              const ratio = 1.0 - ed;
              const f = isParentChild ? ratio * 0.3 : (ratio * ratio * 0.4);
              
              let pushX = (ex / ed) * f * rx;
              let pushY = (ey / ed) * f * ry;

              if (Math.abs(dx) < 20) {
                const dir = dx || (a.id > b.id ? 1 : -1);
                pushX += (20 - Math.abs(dx)) * 0.15 * (dir >= 0 ? 1 : -1);
              }

              const maxF = isThoughtToThought ? 2.0 : 2.5;
              let fx = Math.min(Math.max(pushX, -maxF), maxF);
              let fy = Math.min(Math.max(pushY, -maxF), maxF);

              if (!fixed(a)) { a.vx -= fx; a.vy -= fy; }
              if (!fixed(b)) { b.vx += fx; b.vy += fy; }
            }
          }
        }
      }
    }
  }
};

export const applyLinkForces = (links, byId, hidden, fixed) => {
  for (const l of links) {
    const a = byId(l.a), b = byId(l.b);
    if (!a || !b || hidden.has(a.id) || hidden.has(b.id)) continue;
    
    let dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 0.01;
    const rest = a.r + b.r + 70;
    const f = (d - rest) * 0.002;
    dx /= d; dy /= d;
    if (!fixed(a)) { a.vx += dx * f * d * 0.02; a.vy += dy * f * d * 0.02; }
    if (!fixed(b)) { b.vx -= dx * f * d * 0.02; b.vy -= dy * f * d * 0.02; }
  }
};

export const applyTopicGravity = (nodes, hidden, bounds, fixed, held) => {
  const topicNodes = nodes.filter(n => n.isTopic && !hidden.has(n.id));
  for (const t of topicNodes) {
    const members = nodes.filter(n => n.topicId === t.id && !hidden.has(n.id));
    if (members.length === 0) continue;

    const sortedMembers = [...members].sort((a, b) => a.id.localeCompare(b.id));
    const N = sortedMembers.length;

    for (let idx = 0; idx < N; idx++) {
      const n = sortedMembers[idx];
      if (n.offsetX === undefined || n.offsetY === undefined || n.offsetX === null || n.offsetY === null) {
        const angle = (idx / N) * Math.PI * 2;
        const burstOffset = (n.burstIndex || 0) * 110;
        let R_x = t.r + n.r + 65;
        let R_y = R_x;
        if (bounds[n.id] && bounds[t.id]) {
            R_x = bounds[n.id].w + bounds[t.id].w + 35 + (idx % 2) * (N > 4 ? 40 : 0) + burstOffset;
            R_y = bounds[n.id].h + bounds[t.id].h + 35 + (idx % 2) * (N > 4 ? 40 : 0) + burstOffset;
        } else {
            R_x += (idx % 2) * (N > 4 ? 40 : 0) + burstOffset;
            R_y += (idx % 2) * (N > 4 ? 40 : 0) + burstOffset;
        }
        n.offsetX = Math.round(Math.cos(angle) * R_x);
        n.offsetY = Math.round(Math.sin(angle) * R_y);
      }

      let targetX = t.x + n.offsetX;
      let targetY = t.y + n.offsetY;

      if (n.isPulling) {
        const dTopicX = t.x - n.x;
        const dTopicY = t.y - n.y;
        
        let collisionDist = t.r + n.r + 5;
        if (bounds[n.id] && bounds[t.id]) {
            collisionDist = Math.max(bounds[n.id].w + bounds[t.id].w, bounds[n.id].h + bounds[t.id].h) + 5;
        }
        const distToTopic = Math.hypot(dTopicX, dTopicY);
        // Bounce off the topic bubble by becoming solid once we hit its perimeter
        if (distToTopic < collisionDist) {
          n.isPulling = false;
        } else {
          targetX = t.x;
          targetY = t.y;
        }
      }

      const dx = targetX - n.x;
      const dy = targetY - n.y;
      const dist = Math.hypot(dx, dy) || 0.01;

      if (held(n) && n.isPulling) n.isPulling = false;

      if (dist > 1.5 && !held(n) && !n.pinned && !n.userMoved) {
        if (n.sleeping) n.sleeping = false;
      }

      if (dist <= 1.5 && !held(n) && !n.pinned && !n.userMoved && !n._isColliding) {
        n.x = targetX;
        n.y = targetY;
        n.vx = 0;
        n.vy = 0;
        n.sleeping = true;
        n.isPulling = false;
      } else if (!fixed(n)) {
        if (n._isColliding && !held(t) && dist < 20) {
          n.offsetX = Math.round(n.x - t.x);
          n.offsetY = Math.round(n.y - t.y);
        } else {
          const pull = Math.min(Math.max(dist * 0.08, -3), 3);
          n.vx += (dx / dist) * pull;
          n.vy += (dy / dist) * pull;
        }

        let cdx = n.x - t.x;
        let cdy = n.y - t.y;
        if (Math.abs(cdx) < 0.01 && Math.abs(cdy) < 0.01) cdx = 0.01;
        
        const padT = 8;
        if (bounds[n.id] && bounds[t.id]) {
          const rxT = bounds[n.id].w + bounds[t.id].w + padT;
          const ryT = bounds[n.id].h + bounds[t.id].h + padT;
          
          const exT = cdx / rxT;
          const eyT = cdy / ryT;
          const edT = Math.hypot(exT, eyT) || 0.01;
          
          if (edT < 1.0) {
            let pushOut = Math.min((1.0 - edT) * 0.05 * Math.max(rxT, ryT), 2.5);
            n.vx += (exT / edT) * pushOut;
            n.vy += (eyT / edT) * pushOut;
            n._isColliding = true;
          }
        }
      }
    }
  }
};

export const integrateVelocities = (nodes, hidden, fixed, byId) => {
  for (const n of nodes) {
    if (hidden.has(n.id) || fixed(n)) continue;
    const damp = 0.58;
    n.vx = Math.min(Math.max(n.vx * damp, -8), 8);
    n.vy = Math.min(Math.max(n.vy * damp, -8), 8);
    const speed = Math.hypot(n.vx, n.vy);
    if (speed < 0.1 && !n._isColliding) {
      n.vx = 0;
      n.vy = 0;
      n.sleeping = true;
      if (n.topicId) {
        const parentTopic = byId(n.topicId);
        if (parentTopic) {
          n.offsetX = Math.round(n.x - parentTopic.x);
          n.offsetY = Math.round(n.y - parentTopic.y);
        }
      }
    } else {
      n.x += n.vx; n.y += n.vy;
    }
  }
};
