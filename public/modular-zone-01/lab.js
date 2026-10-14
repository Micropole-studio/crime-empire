(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const status = $('scene-status');
  try {
    const canvas = $('scene');
    const ctx = canvas?.getContext('2d', { alpha: false });
    if (!canvas || !ctx) throw new Error('Canvas 2D indisponible');

    const selection = $('selection');
    const inspector = $('inspector');
    const ROWS = 9, COLS = 11, W = 236, H = 120;
    const STORAGE_KEY = 'crime-empire-modular-zone-02-local-v1';
    const tileTypes = new Set(['road', 'plot', 'asphalt', 'concrete', 'grass', 'water']);
    const imagePaths = {
      concrete: 'assets/concrete.webp', asphalt: 'assets/asphalt.webp',
      grass: 'assets/grass.webp', water: 'assets/water.webp',
      villa: 'assets/ville.webp', depot: 'assets/depot.webp',
    };
    const assets = {};
    let imageErrors = 0;
    let dirty = true;
    const defaults = [
      { id: 'villa', name: 'Villa joueur', kind: 'ville', src: 'villa', r: 2, c: 3, width: 330, rotation: 0, depth: 0 },
      { id: 'depot', name: 'Dépôt clandestin', kind: 'pve', src: 'depot', r: 6, c: 7, width: 340, rotation: 0, depth: 0 },
    ];
    const defaultTiles = Array.from({ length: ROWS }, (_, r) => Array.from({ length: COLS }, (_, c) => {
      if ((c >= 9 && r >= 5) || (c >= 10 && r >= 2)) return 'water';
      if (c === 5 || r === 4) return 'road';
      if ([[2, 3], [6, 7], [2, 8], [6, 2]].some(([rr, cc]) => rr === r && cc === c)) return 'plot';
      return (r + c) % 6 === 0 ? 'grass' : 'concrete';
    }));
    const clone = value => JSON.parse(JSON.stringify(value));
    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    function valid(r, c) { return r >= 0 && r < ROWS && c >= 0 && c < COLS; }
    function validateState(data) {
      if (!data || typeof data !== 'object' || !Array.isArray(data.tiles) || data.tiles.length !== ROWS) throw new Error('Tuiles incorrectes');
      const tiles = data.tiles.map(row => {
        if (!Array.isArray(row) || row.length !== COLS || !row.every(t => tileTypes.has(t))) throw new Error('Format des tuiles incorrect');
        return row.slice();
      });
      if (!Array.isArray(data.nodes)) throw new Error('Bâtiments manquants');
      const nodes = defaults.map(base => {
        const incoming = data.nodes.find(n => n && n.id === base.id);
        if (!incoming) return { ...base };
        const result = { ...base };
        for (const key of ['r', 'c', 'width', 'rotation', 'depth']) {
          if (!Number.isFinite(incoming[key])) throw new Error('Coordonnée invalide : ' + key);
        }
        result.r = clamp(incoming.r, 0, ROWS - 1);
        result.c = clamp(incoming.c, 0, COLS - 1);
        result.width = clamp(Math.round(incoming.width / 10) * 10, 180, 510);
        result.rotation = clamp(Math.round(incoming.rotation), -18, 18);
        result.depth = clamp(Math.round(incoming.depth), -3, 3);
        return result;
      });
      return { tiles, nodes };
    }
    let state = { tiles: clone(defaultTiles), nodes: clone(defaults) };
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) state = validateState(JSON.parse(saved));
    } catch (error) { console.warn('[Crime Empire V02] État local ignoré :', error); }
    let saveHandle = 0;
    function saveSoon() {
      clearTimeout(saveHandle);
      saveHandle = setTimeout(() => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
        catch (error) { console.warn('Stockage local indisponible :', error); }
      }, 250);
    }
    function updateStatus(message, type = 'ready') {
      if (!status) return;
      status.dataset.state = type;
      status.textContent = message;
    }
    for (const [key, src] of Object.entries(imagePaths)) {
      const img = new Image();
      img.onload = () => { assets[key] = img; dirty = true; };
      img.onerror = () => {
        imageErrors += 1;
        updateStatus('⚠ Texture manquante : ' + src + ' ; fond de secours affiché', 'warning');
        dirty = true;
      };
      img.src = src;
    }

    let tool = 'move', grid = false, snap = true;
    let cw = 1, ch = 1, dpr = 1;
    let zoom = 1, ox = 0, oy = 0, lastFrame = 0;
    let selectedId = null, hovered = null;
    const pointers = new Map();
    let gesture = null;
    let needsFirstRender = true;
    const local = (r, c) => ({ x: (c - r) * W / 2, y: (c + r) * H / 2 });
    const worldCenter = local((ROWS - 1) / 2, (COLS - 1) / 2);
    const screenToWorld = p => ({ x: (p.x - ox) / zoom, y: (p.y - oy) / zoom });
    function worldToIso(x, y) { return { c: (x / (W / 2) + y / (H / 2)) / 2, r: (y / (H / 2) - x / (W / 2)) / 2 }; }
    function screenToTile(p) {
      const pos = screenToWorld(p);
      const iso = worldToIso(pos.x, pos.y);
      return { r: Math.round(iso.r), c: Math.round(iso.c) };
    }
    function resetCamera() {
      zoom = Math.min(1.2, Math.max(.48, Math.min(cw / 2600, ch / 1280) * 1.3));
      ox = cw * .47 - worldCenter.x * zoom;
      oy = ch * .50 - worldCenter.y * zoom;
      dirty = true;
    }
    function resize() {
      const previousWidth = cw, previousHeight = ch;
      cw = Math.max(1, canvas.clientWidth); ch = Math.max(1, canvas.clientHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      if (previousWidth <= 1) resetCamera();
      else { ox += (cw - previousWidth) / 2; oy += (ch - previousHeight) / 2; }
      dirty = true;
    }
    function zoomAt(factor, anchor) {
      const old = zoom;
      zoom = clamp(old * factor, .34, 2.35);
      ox = anchor.x - (anchor.x - ox) * zoom / old;
      oy = anchor.y - (anchor.y - oy) * zoom / old;
      dirty = true;
    }
    function focusNode() { return state.nodes.find(n => n.id === selectedId) || null; }
    function updateInspector() {
      const node = focusNode();
      inspector.hidden = !node;
      if (node) {
        $('sizeRange').value = node.width;
        $('rotationRange').value = node.rotation;
        $('depthRange').value = node.depth;
        $('sizeOutput').textContent = node.width + ' px';
        $('rotationOutput').textContent = node.rotation + '°';
        $('depthOutput').textContent = String(node.depth);
        selection.innerHTML = '<b>' + node.name + '</b><br>Case ' + node.r.toFixed(2) + ' : ' + node.c.toFixed(2) + '<br><span style="color:#aab5bb">Glisse pour déplacer ou utilise les flèches. Les changements sont privés à ton navigateur.</span>';
      } else {
        selection.textContent = tool === 'move' ? 'Choisis la Villa ou le dépôt PvE, puis fais glisser. Glisse sur le terrain vide pour déplacer la caméra.' : tool === 'inspect' ? 'Clique sur une case ou un bâtiment pour l’inspecter.' : 'Peins les cases : clique et glisse sur le terrain.';
      }
    }
    function selectNode(id) { selectedId = id; updateInspector(); dirty = true; }
    function setTool(next) {
      tool = next;
      document.querySelectorAll('[data-tool]').forEach(btn => {
        const active = btn.dataset.tool === tool;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', String(active));
      });
      updateInspector(); dirty = true;
    }

    function diamond(x, y) {
      ctx.beginPath(); ctx.moveTo(x, y - H / 2); ctx.lineTo(x + W / 2, y);
      ctx.lineTo(x, y + H / 2); ctx.lineTo(x - W / 2, y); ctx.closePath();
    }
    function polygon(points, fill, stroke) {
      ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
    }
    function baseTexture(t, x, y) {
      const kind = t === 'road' ? 'asphalt' : t === 'plot' ? 'concrete' : t;
      if (assets[kind]) {
        const pattern = ctx.createPattern(assets[kind], 'repeat');
        ctx.save(); ctx.translate(x - W / 2, y - H / 2);
        ctx.fillStyle = pattern; ctx.fillRect(0, 0, W, H); ctx.restore();
      } else {
        ctx.fillStyle = { water: '#194257', grass: '#354b3b', asphalt: '#272c32', road: '#2b3035', plot: '#555452', concrete: '#555452' }[t] || '#42494d';
        ctx.fillRect(x - W / 2, y - H / 2, W, H);
      }
      ctx.fillStyle = '#060e1850'; ctx.fillRect(x - W / 2, y - H / 2, W, H);
    }
    function drawTile(r, c, t, ms) {
      const { x, y } = local(r, c);
      ctx.save(); diamond(x, y); ctx.clip(); baseTexture(t, x, y);
      if (t === 'road') {
        // Ground routes follow the modular grid. Neighbours determine the edge connections.
        ctx.strokeStyle = '#c9b4827a'; ctx.lineWidth = 1.6; ctx.setLineDash([13, 10]);
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          if (valid(r + dr, c + dc) && state.tiles[r + dr][c + dc] === 'road') {
            const nx = x + (dc - dr) * W / 4;
            const ny = y + (dc + dr) * H / 4;
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(nx, ny); ctx.stroke();
          }
        }
        ctx.setLineDash([]);
        ctx.strokeStyle = '#dcb97838'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x - W / 3, y); ctx.lineTo(x, y - H / 2); ctx.lineTo(x + W / 3, y); ctx.stroke();
      }
      if (t === 'plot') {
        ctx.lineWidth = 2.5; ctx.strokeStyle = '#f1cf8b8a';
        polygon([[x, y - H / 2 + 11], [x + W / 2 - 21, y], [x, y + H / 2 - 11], [x - W / 2 + 21, y]], null, '#e3c18b7a');
        for (const dx of [-44, 44]) for (const dy of [-7, 9]) { ctx.fillStyle = '#d8ad67'; ctx.fillRect(x + dx - 1.5, y + dy - 1.5, 3, 3); }
      }
      if (t === 'water') {
        for (let i = 0; i < 8; i++) {
          const xx = x - 105 + i * 29 + Math.sin(ms * .00063 + i + r + c) * 5;
          const yy = y - 35 + i * 9;
          ctx.strokeStyle = i % 2 ? '#b7e2db37' : '#86cee85b'; ctx.lineWidth = 1.8;
          ctx.beginPath(); ctx.moveTo(xx, yy); ctx.quadraticCurveTo(xx + 14, yy - 5, xx + 31, yy - 1); ctx.stroke();
        }
      }
      if (t === 'grass') {
        for (let i = 0; i < 13; i++) {
          const xx = x - 79 + (i * 41 + r * 13 + c * 7) % 158;
          const yy = y - 34 + (i * 19 + c * 11) % 66;
          ctx.fillStyle = i % 3 ? '#203b3199' : '#6c826452';
          ctx.beginPath(); ctx.ellipse(xx, yy, 3.8, 2, 0, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
      ctx.strokeStyle = '#c4a8774b'; ctx.lineWidth = .9; diamond(x, y); ctx.stroke();
      if (grid) { ctx.strokeStyle = '#f5cb83b8'; ctx.lineWidth = 1.35; diamond(x, y); ctx.stroke(); ctx.fillStyle = '#edcc94'; ctx.font = '11px system-ui'; ctx.textAlign = 'center'; ctx.fillText(r + ':' + c, x, y + 4); }
      if (hovered?.r === r && hovered?.c === c) { ctx.strokeStyle = '#f0bf63'; ctx.lineWidth = 3; diamond(x, y); ctx.stroke(); }
    }
    function glow(x, y, radius, c) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
      g.addColorStop(0, c); g.addColorStop(1, '#ffb85400');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
    }
    function drawNode(node) {
      const { x, y } = local(node.r, node.c);
      const img = assets[node.src], w = node.width, h = img ? w * img.height / img.width : w * .72;
      const chosen = node.id === selectedId;
      // Structural ground slab and two separate shadows remain fixed to terrain while image rotates visually.
      ctx.save(); ctx.translate(x, y);
      polygon([[0, -35], [103, -1], [103, 9], [0, 43], [-103, 9], [-103, -1]], '#182129', '#d9af6a78');
      polygon([[0, -35], [103, -1], [0, 32], [-103, -1]], '#3b3e42', '#e0b879a3');
      ctx.fillStyle = '#05080acb'; ctx.beginPath(); ctx.ellipse(4, 8, w * .36, 20, 0, 0, Math.PI * 2); ctx.fill();
      glow(-48, -6, 48, '#ffc26366'); glow(57, -5, 46, '#f8b35f55');
      ctx.save(); ctx.translate(0, 17); ctx.rotate(node.rotation * Math.PI / 180);
      if (img) ctx.drawImage(img, -w / 2, -h, w, h);
      else { ctx.fillStyle = '#b2a383'; ctx.fillRect(-w * .32, -h * .75, w * .64, h * .7); }
      if (chosen) {
        ctx.strokeStyle = '#f4cf8b'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 7]);
        ctx.strokeRect(-w / 2, -h, w, h); ctx.setLineDash([]);
      }
      ctx.restore();
      ctx.strokeStyle = chosen ? '#f6d285' : '#c5aa72a1'; ctx.lineWidth = chosen ? 3 : 1.6;
      ctx.beginPath(); ctx.ellipse(0, 0, 9, 4, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      const tagY = y - h + 5;
      ctx.font = '600 14px system-ui'; ctx.textAlign = 'center';
      const labelWidth = ctx.measureText(node.name).width + 36;
      ctx.fillStyle = chosen ? '#49381eea' : '#071522ee'; ctx.strokeStyle = chosen ? '#f2c26a' : '#dcb67396'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(x - labelWidth / 2, tagY - 27, labelWidth, 27, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f5dca9'; ctx.fillText(node.name, x, tagY - 9);
    }
    // Drawn back-to-front, with an optional explicit depth correction.
    function sortedNodes() { return state.nodes.slice().sort((a, b) => (local(a.r, a.c).y + a.depth * 40) - (local(b.r, b.c).y + b.depth * 40)); }
    function hitNodeAt(world) {
      // First test sprite bounds; reversed painter order gives the frontmost object first.
      const sorted = sortedNodes().reverse();
      for (const n of sorted) {
        const p = local(n.r, n.c), w = n.width;
        const img = assets[n.src], h = img ? w * img.height / img.width : w * .72;
        const dx = world.x - p.x, dy = world.y - p.y - 17;
        const rad = -n.rotation * Math.PI / 180;
        const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
        const ry = dx * Math.sin(rad) + dy * Math.cos(rad);
        if (Math.abs(rx) <= w / 2 && ry >= -h && ry <= 6) return n;
      }
      return null;
    }
    function render(ms) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const bg = ctx.createLinearGradient(0, 0, 0, ch);
      bg.addColorStop(0, '#233440'); bg.addColorStop(.48, '#253238'); bg.addColorStop(1, '#081621');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, cw, ch);
      ctx.save(); ctx.translate(ox, oy); ctx.scale(zoom, zoom);
      const order = [];
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) order.push({ r, c });
      order.sort((a, b) => (a.r + a.c) - (b.r + b.c));
      for (const { r, c } of order) drawTile(r, c, state.tiles[r][c], ms);
      for (const { r, c } of order) {
        if ((r + c) % 5 !== 0 || state.tiles[r][c] !== 'concrete') continue;
        const p = local(r, c);
        ctx.fillStyle = '#182d25'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 10, 6, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = '#152d25'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y - 23); ctx.stroke();
        ctx.fillStyle = '#4e6850';
        for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(p.x + Math.cos(k * 1.25) * 8, p.y - 23 + Math.sin(k * 1.25) * 3, 8, 3, k * 1.25, 0, 7); ctx.fill(); }
      }
      for (const n of sortedNodes()) drawNode(n);
      ctx.restore();
      ctx.fillStyle = '#edc779'; ctx.font = '600 12px system-ui'; ctx.textAlign = 'left';
      ctx.fillText('V02 · ' + (tool === 'move' ? 'DÉPLACEMENT' : tool === 'inspect' ? 'INSPECTION' : 'PEINTURE : ' + tool.toUpperCase()) + ' · Zoom ' + Math.round(zoom * 100) + '%', 19, Math.max(80, ch - 72));
    }
    function frame(ms) {
      if (dirty || ms - lastFrame > 48) {
        try {
          render(ms);
          if (needsFirstRender) {
            needsFirstRender = false;
            if (!imageErrors) updateStatus('✅ Zone Modulaire 02 active · Déplace les bâtiments');
          }
        } catch (error) {
          updateStatus('❌ Erreur d’affichage : ' + (error?.message || String(error)), 'error');
          console.error('[Crime Empire V02 rendu]', error);
          return;
        }
        lastFrame = ms; dirty = false;
      }
      requestAnimationFrame(frame);
    }
    function canvasPosition(event) {
      const b = canvas.getBoundingClientRect();
      return { x: event.clientX - b.left, y: event.clientY - b.top };
    }
    function setTileAt(point) {
      const t = screenToTile(point);
      if (valid(t.r, t.c) && tileTypes.has(tool) && state.tiles[t.r][t.c] !== tool) {
        state.tiles[t.r][t.c] = tool;
        saveSoon(); dirty = true;
        selection.innerHTML = '<b>Case ' + t.r + ':' + t.c + '</b><br>Revêtement : ' + tool + '<br><span style="color:#aab5bb">Essai enregistré dans ce navigateur.</span>';
        return true;
      }
      return false;
    }
    function down(event) {
      if (event.button !== undefined && event.button !== 0) return;
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      const p = canvasPosition(event);
      pointers.set(event.pointerId, p);
      if (pointers.size >= 2) {
        const pts = Array.from(pointers.values());
        const mx = (pts[0].x + pts[1].x) / 2, my = (pts[0].y + pts[1].y) / 2;
        gesture = { mode: 'pinch', dist: Math.max(1, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)), midpoint: { x: mx, y: my } };
        return;
      }
      const node = (tool === 'move' || tool === 'inspect') ? hitNodeAt(screenToWorld(p)) : null;
      if (node) {
        selectNode(node.id);
        gesture = { mode: tool === 'move' ? 'node' : 'inspect', start: p, moved: false, nodeId: node.id, baseR: node.r, baseC: node.c, initial: p };
      } else if (tileTypes.has(tool)) {
        gesture = { mode: 'paint', start: p, moved: false }; setTileAt(p);
      } else {
        gesture = { mode: 'pan', start: p, moved: false };
      }
      dirty = true;
    }
    function move(event) {
      const p = canvasPosition(event);
      const old = pointers.get(event.pointerId);
      if (!old) {
        hovered = screenToTile(p); if (!valid(hovered.r, hovered.c)) hovered = null;
        dirty = true; return;
      }
      pointers.set(event.pointerId, p);
      if (!gesture) return;
      if (pointers.size === 2 && gesture.mode === 'pinch') {
        const pts = Array.from(pointers.values());
        const center = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
        const distance = Math.max(1, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y));
        ox += center.x - gesture.midpoint.x; oy += center.y - gesture.midpoint.y;
        zoomAt(distance / gesture.dist, center);
        gesture.dist = distance; gesture.midpoint = center;
      } else if (pointers.size === 1 && gesture.start) {
        gesture.moved ||= Math.hypot(p.x - gesture.start.x, p.y - gesture.start.y) > 4;
        if (gesture.mode === 'pan' || gesture.mode === 'inspect') { ox += p.x - old.x; oy += p.y - old.y; }
        else if (gesture.mode === 'node') {
          const node = state.nodes.find(n => n.id === gesture.nodeId);
          if (node) {
            const delta = worldToIso((p.x - gesture.initial.x) / zoom, (p.y - gesture.initial.y) / zoom);
            node.r = clamp(gesture.baseR + delta.r, 0, ROWS - 1);
            node.c = clamp(gesture.baseC + delta.c, 0, COLS - 1);
          }
        } else if (gesture.mode === 'paint') setTileAt(p);
      }
      dirty = true;
    }
    function up(event) {
      const p = canvasPosition(event);
      const isLast = pointers.size === 1;
      pointers.delete(event.pointerId);
      if (!isLast) { gesture = null; dirty = true; return; }
      const g = gesture;
      gesture = null;
      if (g?.mode === 'node') {
        const n = state.nodes.find(n => n.id === g.nodeId);
        if (n) {
          if (snap) { n.r = Math.round(n.r); n.c = Math.round(n.c); }
          saveSoon(); selectNode(n.id);
        }
      } else if (g && !g.moved && (g.mode === 'pan' || g.mode === 'inspect')) {
        const node = hitNodeAt(screenToWorld(p));
        if (node) selectNode(node.id);
        else {
          selectNode(null);
          const tile = screenToTile(p);
          if (valid(tile.r, tile.c)) selection.innerHTML = '<b>Case ' + tile.r + ':' + tile.c + '</b><br>Terrain : ' + state.tiles[tile.r][tile.c];
        }
      }
      dirty = true;
    }
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', event => { pointers.delete(event.pointerId); gesture = null; dirty = true; });
    canvas.addEventListener('lostpointercapture', event => { pointers.delete(event.pointerId); if (!pointers.size) gesture = null; });
    canvas.addEventListener('wheel', event => { event.preventDefault(); zoomAt(event.deltaY > 0 ? .90 : 1.10, canvasPosition(event)); }, { passive: false });
    document.querySelectorAll('[data-tool]').forEach(btn => btn.addEventListener('click', () => setTool(btn.dataset.tool)));
    $('gridBtn').addEventListener('click', () => { grid = !grid; $('gridBtn').textContent = 'Grille : ' + (grid ? 'oui' : 'non'); $('gridBtn').setAttribute('aria-pressed', String(grid)); dirty = true; });
    $('snapBtn').addEventListener('click', () => { snap = !snap; $('snapBtn').textContent = 'Aimantation : ' + (snap ? 'oui' : 'non'); $('snapBtn').setAttribute('aria-pressed', String(snap)); dirty = true; });
    function applyToSelected(key, value) { const n = focusNode(); if (!n) return; n[key] = value; saveSoon(); updateInspector(); dirty = true; }
    $('sizeRange').addEventListener('input', e => applyToSelected('width', Number(e.target.value)));
    $('rotationRange').addEventListener('input', e => applyToSelected('rotation', Number(e.target.value)));
    $('depthRange').addEventListener('input', e => applyToSelected('depth', Number(e.target.value)));
    $('resetNodeBtn').addEventListener('click', () => {
      const n = focusNode(); if (!n) return;
      const original = defaults.find(x => x.id === n.id);
      Object.assign(n, { r: original.r, c: original.c, width: original.width, rotation: original.rotation, depth: original.depth });
      saveSoon(); updateInspector(); dirty = true;
    });
    function nudge(dr, dc) {
      const n = focusNode(); if (!n) return;
      n.r = clamp(n.r + dr, 0, ROWS - 1); n.c = clamp(n.c + dc, 0, COLS - 1);
      if (snap) { n.r = Math.round(n.r); n.c = Math.round(n.c); }
      saveSoon(); updateInspector(); dirty = true;
    }
    document.querySelectorAll('[data-nudge]').forEach(btn => btn.addEventListener('click', () => {
      const [dr, dc] = btn.dataset.nudge.split(',').map(Number); nudge(dr, dc);
    }));
    window.addEventListener('keydown', e => {
      if (!selectedId || e.target?.closest?.('input,select,textarea,button')) return;
      const directions = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
      if (directions[e.key]) { e.preventDefault(); nudge(...directions[e.key]); }
      if (e.key === 'Escape') selectNode(null);
    });
    $('resetBtn').addEventListener('click', () => {
      if (!confirm('Réinitialiser le terrain et les deux bâtiments du laboratoire ? Cela ne touche pas à Supabase.')) return;
      state = { tiles: clone(defaultTiles), nodes: clone(defaults) };
      selectedId = null; saveSoon(); updateInspector(); resetCamera();
    });
    $('exportBtn').addEventListener('click', () => {
      const file = new Blob([JSON.stringify({ version: 2, ...state }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(file);
      const a = document.createElement('a'); a.href = url; a.download = 'crime-empire-zone-modulaire-02.json'; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    });
    $('importBtn').addEventListener('click', () => $('importInput').click());
    $('importInput').addEventListener('change', async event => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        if (file.size > 400000) throw new Error('Fichier trop volumineux');
        state = validateState(JSON.parse(await file.text()));
        saveSoon(); updateInspector(); dirty = true; updateStatus('✅ Configuration du prototype importée');
      } catch (error) { updateStatus('❌ Import impossible : ' + (error?.message || String(error)), 'error'); }
      event.target.value = '';
    });
    $('zoomIn').addEventListener('click', () => zoomAt(1.17, { x: cw * .44, y: ch * .5 }));
    $('zoomOut').addEventListener('click', () => zoomAt(1 / 1.17, { x: cw * .44, y: ch * .5 }));
    $('home').addEventListener('click', resetCamera);
    window.addEventListener('resize', resize);
    window.addEventListener('pagehide', () => { clearTimeout(saveHandle); try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* private browsing */ } });
    setTool('move'); resize(); requestAnimationFrame(frame);
  } catch (error) {
    console.error('[Crime Empire V02 init]', error);
    if (status) { status.dataset.state = 'error'; status.textContent = '❌ Initialisation impossible : ' + (error?.message || String(error)); }
  }
})();
