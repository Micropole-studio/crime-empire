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
    const STORAGE_KEY = 'crime-empire-modular-zone-04-local-v1';
    const OLD_STORAGE_KEY = 'crime-empire-modular-zone-03-local-v1';
    const tileTypes = new Set(['road', 'plot', 'asphalt', 'concrete', 'grass', 'water']);
    const imagePaths = {
      concrete: 'assets/concrete.webp', asphalt: 'assets/asphalt.webp',
      grass: 'assets/grass.webp', water: 'assets/water.webp',
      villa: 'assets/villa-premium.webp', depot: 'assets/depot-premium.webp',
      jardin: 'assets/jardin-premium.webp', ilot: 'assets/ilot-premium.webp', portail: 'assets/portail-premium.webp',
    };
    const assets = {};
    const texturePatterns = {};
    let imageErrors = 0;
    let dirty = true;
    // r/c = top-left footprint grid cell. Visual height NEVER changes occupancy.
    const defs = {
      villa:   { rows: 2, cols: 2, spriteScale: .93, label: 'Villa / QG',     floor: 'luxury' },
      depot:   { rows: 3, cols: 3, spriteScale: .92, label: 'Dépôt PvE',      floor: 'industrial' },
      jardin:  { rows: 1, cols: 1, spriteScale: .87, label: 'Jardin tropical', floor: 'garden' },
      ilot:    { rows: 1, cols: 1, spriteScale: .85, label: 'Îlot paysager',  floor: 'garden' },
      portail: { rows: 1, cols: 2, spriteScale: .91, label: 'Portail',        floor: 'luxury' },
    };
    const decorationTypes = new Set(['jardin', 'ilot', 'portail']);
    const defaults = [
      { id: 'villa', name: 'Villa / QG', kind: 'ville', src: 'villa', r: 0, c: 1, visualScale: 100, depth: 0 },
      { id: 'depot', name: 'Dépôt PvE', kind: 'pve', src: 'depot', r: 5, c: 1, visualScale: 100, depth: 0 },
      { id: 'jardin-1', name: 'Jardin tropical', kind: 'decor', src: 'jardin', r: 1, c: 6, visualScale: 100, depth: 0 },
      { id: 'ilot-1', name: 'Îlot paysager', kind: 'decor', src: 'ilot', r: 6, c: 7, visualScale: 100, depth: 0 },
      { id: 'portail-1', name: 'Portail', kind: 'decor', src: 'portail', r: 2, c: 3, visualScale: 100, depth: 0 },
    ];
    const defaultTiles = Array.from({ length: ROWS }, (_, r) => Array.from({ length: COLS }, (_, c) => {
      if ((c >= 9 && r >= 5) || (c >= 10 && r >= 2)) return 'water';
      if (c === 5 || r === 4) return 'road';
      if ((r <= 3 && c <= 3) || (r >= 5 && r <= 7 && c >= 1 && c <= 3)) return 'plot';
      return (r + c) % 6 === 0 ? 'grass' : 'concrete';
    }));
    const clone = value => JSON.parse(JSON.stringify(value));
    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    function valid(r, c) { return r >= 0 && r < ROWS && c >= 0 && c < COLS; }
    function footprint(node, r = node.r, c = node.c) {
      const { rows, cols } = defs[node.src];
      const cells = [];
      for (let dr = 0; dr < rows; dr++) for (let dc = 0; dc < cols; dc++) cells.push([r + dr, c + dc]);
      return cells;
    }
    function bounds(node, r = node.r, c = node.c) {
      const d = defs[node.src];
      const center = local(r + (d.rows - 1) / 2, c + (d.cols - 1) / 2);
      // Corner coordinates are obtained from the outermost tile CORNERS.
      const corners = [
        local(r - .5, c - .5),
        local(r - .5, c + d.cols - .5),
        local(r + d.rows - .5, c + d.cols - .5),
        local(r + d.rows - .5, c - .5),
      ];
      const xs = corners.map(p => p.x), ys = corners.map(p => p.y);
      return { ...d, center, corners, width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
    }
    function placementStatus(node, r = node.r, c = node.c) {
      for (const [rr, cc] of footprint(node, r, c)) {
        if (!valid(rr, cc)) return { ok: false, reason: 'Hors de la carte' };
        if (state.tiles[rr][cc] === 'road' || state.tiles[rr][cc] === 'water')
          return { ok: false, reason: 'Route ou eau sous les fondations' };
        for (const other of state.nodes) {
          if (other.id === node.id) continue;
          if (footprint(other).some(([or, oc]) => or === rr && oc === cc))
            return { ok: false, reason: 'Chevauche un autre bâtiment' };
        }
      }
      return { ok: true, reason: 'Emplacement valide' };
    }
    function validateState(data, importFromV03 = false) {
      if (!data || typeof data !== 'object' || !Array.isArray(data.tiles) || data.tiles.length !== ROWS)
        throw new Error('Tuiles incorrectes');
      const tiles = data.tiles.map(row => {
        if (!Array.isArray(row) || row.length !== COLS || !row.every(t => tileTypes.has(t)))
          throw new Error('Format des tuiles incorrect');
        return row.slice();
      });
      if (!Array.isArray(data.nodes) || data.nodes.length > 30) throw new Error('Bâtiments invalides');
      const sourceNodes = [...data.nodes];
      if (importFromV03) {
        // Conserver la Villa, le dépôt et le terrain de la V03 ; ajouter les nouveaux décors.
        for (const node of defaults.slice(2)) sourceNodes.push(node);
      }
      const accepted = [];
      const ids = new Set();
      // Villa & PvE obligatoires ; les décorations sont facultatives et peuvent être supprimées.
      const required = defaults.slice(0, 2).map(base =>
        sourceNodes.find(n => n && n.id === base.id) || base);
      for (const raw of [...required, ...sourceNodes.filter(n => n && decorationTypes.has(n.src))]) {
        if (!raw || !defs[raw.src] || typeof raw.id !== 'string' || !/^[a-z0-9-]{1,48}$/.test(raw.id) || ids.has(raw.id)) continue;
        ids.add(raw.id);
        const d = defs[raw.src];
        const r = clamp(Math.round(Number(raw.r) || 0), 0, ROWS - d.rows);
        const c = clamp(Math.round(Number(raw.c) || 0), 0, COLS - d.cols);
        const node = {
          id: raw.id, name: d.label, kind: raw.src === 'villa' ? 'ville' : raw.src === 'depot' ? 'pve' : 'decor',
          src: raw.src, r, c,
          visualScale: clamp(Math.round(Number(raw.visualScale) || 100), 75, 110),
          depth: clamp(Math.round(Number(raw.depth) || 0), -3, 3),
        };
        // Never accept invalid overlaps as saved state.
        if (footprint(node).some(([rr,cc]) => !valid(rr,cc) || ['road','water'].includes(tiles[rr][cc]) ||
             accepted.some(other => footprint(other).some(([or,oc]) => or === rr && oc === cc)))) continue;
        accepted.push(node);
      }
      for (const base of defaults.slice(0,2)) if (!accepted.some(n => n.id === base.id))
        throw new Error('La Villa ou le dépôt chevauche une route : déplace-le avant import');
      return { tiles, nodes: accepted };
    }
    let state = { tiles: clone(defaultTiles), nodes: clone(defaults) };
    let migrated = false;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) state = validateState(JSON.parse(saved));
      else {
        const old = localStorage.getItem(OLD_STORAGE_KEY);
        if (old) {
          // Les anciennes positions étaient celles d'une empreinte 4×4 ; la nouvelle 2×2
          // garde la même case d'origine plutôt que de bouger arbitrairement la ville.
          try { state = validateState(JSON.parse(old), true); migrated = true; }
          catch (e) { console.info('[Crime Empire V04] Ancien essai ignoré :', e); }
        }
      }
    } catch (error) { console.warn('[Crime Empire V04] État local ignoré :', error); }
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
      img.onload = () => { assets[key] = img; if (['concrete','asphalt','grass','water'].includes(key)) texturePatterns[key] = ctx.createPattern(img, 'repeat'); dirty = true; };
      img.onerror = () => {
        imageErrors += 1;
        updateStatus('⚠ Texture manquante : ' + src + ' ; fond de secours affiché', 'warning');
        dirty = true;
      };
      img.src = src;
    }

    let tool = 'move', grid = false;
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
      zoom = Math.min(1.15, Math.max(.46, Math.min(cw / 2600, ch / 1280) * 1.07));
      ox = cw * .47 - worldCenter.x * zoom;
      oy = ch * .59 - worldCenter.y * zoom;
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
        const d = defs[node.src];
        const validity = placementStatus(node);
        $('sizeRange').value = node.visualScale;
        $('depthRange').value = node.depth;
        $('sizeOutput').textContent = node.visualScale + ' %';
        $('depthOutput').textContent = String(node.depth);
        $('footprintOutput').textContent = d.rows + ' × ' + d.cols + ' · ' + (d.rows * d.cols) + ' cases';
        $('placementOutput').textContent = validity.ok ? '✓ Placement valide' : '✕ ' + validity.reason;
        $('placementOutput').dataset.valid = String(validity.ok);
        $('removeNodeBtn').hidden = !decorationTypes.has(node.src);
        selection.innerHTML = '<b>' + node.name + '</b><br>Départ : ligne ' + node.r + ', colonne ' + node.c +
          '<br><span style="color:#aab5bb">Empreinte fixe ' + d.rows + '×' + d.cols + '. Déplacement aimanté à la grille.</span>';
      } else {
        selection.textContent = tool === 'move' ? 'Sélectionne une Villa ou le dépôt PvE. La grille aimante la zone occupée automatiquement.' : tool === 'inspect' ? 'Clique sur une case ou un bâtiment pour l’inspecter.' : 'Peins les cases : clique et glisse sur le terrain.';
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
        const pattern = texturePatterns[kind] || ctx.createPattern(assets[kind], 'repeat');
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
    function drawFootprint(node, isTop = false) {
      const geo = bounds(node);
      const chosen = node.id === selectedId;
      const validPlacement = placementStatus(node);
      const good = validPlacement.ok;
      const col = good ? '#8cf2b9' : '#ff7474';
      const corners = geo.corners.map(p => [p.x, p.y]);
      ctx.save();
      if (!isTop) {
        // A level, exact footprint slab: all corners coincide with the tile grid.
        const skirt = geo.corners.map(p => [p.x, p.y + 10]);
        // Two downward visible faces form a grounded slab, same size as the occupied tiles.
        polygon([corners[1], corners[2], skirt[2], skirt[1]], '#242327', '#68563b7a');
        polygon([corners[2], corners[3], skirt[3], skirt[2]], '#12191b', '#564b3c80');
        const slab = ctx.createLinearGradient(geo.center.x, geo.center.y-geo.height*.5, geo.center.x, geo.center.y+geo.height*.5);
        slab.addColorStop(0, geo.floor === 'industrial' ? '#36383d' : geo.floor === 'garden' ? '#424a3b' : '#5b5750');
        slab.addColorStop(1, geo.floor === 'industrial' ? '#262d33' : geo.floor === 'garden' ? '#303d34' : '#45413f');
        polygon(corners, slab, '#dbc18d88');
        const center = geo.center;
        ctx.fillStyle = '#00000024'; ctx.beginPath();
        ctx.ellipse(center.x + 4, center.y + geo.height * .16, geo.width * .24, geo.height * .13, 0, 0, Math.PI * 2); ctx.fill();
        const occupied = footprint(node);
        for (const [r, c] of occupied) {
          const pt = local(r, c);
          diamond(pt.x, pt.y);
          ctx.fillStyle = chosen ? (good ? '#4adfae32' : '#f04d4d4c') : '#0e1c1926';
          ctx.fill();
          if (chosen) { ctx.strokeStyle = good ? '#8cf2b959' : '#ff74748d'; ctx.lineWidth = 1.8; ctx.stroke(); }
        }
      } else if (chosen) {
        ctx.strokeStyle = col; ctx.lineWidth = 3.5; ctx.setLineDash([12, 8]);
        polygon(corners, null, col);
        ctx.setLineDash([]);
        for (const p of geo.corners) {
          ctx.fillStyle = col; ctx.fillRect(p.x - 5, p.y - 5, 10, 10);
        }
      } else {
        polygon(corners, null, '#d4b67b5c');
      }
      ctx.restore();
    }
    function drawNode(node) {
      const geo = bounds(node);
      const { x, y } = geo.center;
      const img = assets[node.src];
      // Sprite width is tied to the grid footprint, rather than arbitrary pixels.
      const w = geo.width * geo.spriteScale * (node.visualScale / 100);
      const h = img ? w * img.height / img.width : w * .7;
      const chosen = node.id === selectedId;
      const validity = placementStatus(node);
      // Sprite's last opaque pixel lands exactly at the SOUTH TIP of the footprint slab.
      const baseY = Math.max(...geo.corners.map(p => p.y)) - 3;
      ctx.save();
      ctx.fillStyle = '#05060858';
      ctx.beginPath(); ctx.ellipse(x, y + geo.height * .24, geo.width * .33, geo.height * .16, 0, 0, Math.PI * 2); ctx.fill();
      if (node.kind !== 'decor') { glow(x - w * .29, y, 38, '#ffc2633b'); glow(x + w * .29, y, 38, '#f8b35f28'); }
      if (img) ctx.drawImage(img, x - w / 2, baseY - h, w, h);
      else { ctx.fillStyle = '#b2a383'; ctx.fillRect(x - w * .36, baseY - h * .72, w * .72, h * .72); }
      if (!validity.ok) {
        ctx.fillStyle = '#ff505038'; ctx.fillRect(x - w * .5, baseY - h, w, h);
      }
      ctx.restore();
      drawFootprint(node, true);
      const tagY = baseY - h - 8;
      ctx.font = '600 14px system-ui'; ctx.textAlign = 'center';
      const tag = node.name + ' · ' + geo.rows + '×' + geo.cols;
      const labelWidth = ctx.measureText(tag).width + 30;
      ctx.fillStyle = chosen ? '#49381eea' : '#071522ee';
      ctx.strokeStyle = chosen ? (validity.ok ? '#91e5ba' : '#f07777') : '#dcb67396'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(x - labelWidth / 2, tagY - 26, labelWidth, 27, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f5dca9'; ctx.fillText(tag, x, tagY - 8);
    }
    // Drawn back-to-front, with an optional explicit depth correction.
    function sortedNodes() { return state.nodes.slice().sort((a, b) => (Math.max(...bounds(a).corners.map(p => p.y)) + a.depth * 40) - (Math.max(...bounds(b).corners.map(p => p.y)) + b.depth * 40)); }
    function hitNodeAt(world) {
      for (const n of sortedNodes().reverse()) {
        const geo = bounds(n), p = geo.center, img = assets[n.src];
        const w = geo.width * geo.spriteScale * (n.visualScale / 100);
        const h = img ? w * img.height / img.width : w * .7;
        const baseY = Math.max(...geo.corners.map(corner => corner.y)) - 3;
        if (world.x >= p.x - w / 2 && world.x <= p.x + w / 2 && world.y >= baseY - h && world.y <= baseY) return n;
        // Clicks on slab also select the building.
        const iso = worldToIso(world.x, world.y);
        if (iso.r >= n.r - .5 && iso.r < n.r + geo.rows - .5 && iso.c >= n.c - .5 && iso.c < n.c + geo.cols - .5) return n;
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
      for (const n of sortedNodes()) drawFootprint(n);
      for (const n of sortedNodes()) drawNode(n);
      ctx.restore();
      ctx.fillStyle = '#edc779'; ctx.font = '600 12px system-ui'; ctx.textAlign = 'left';
      ctx.fillText('V04 · ' + (tool === 'move' ? 'DÉPLACEMENT' : tool === 'inspect' ? 'INSPECTION' : 'PEINTURE : ' + tool.toUpperCase()) + ' · Zoom ' + Math.round(zoom * 100) + '%', 19, Math.max(80, ch - 72));
    }
    function frame(ms) {
      if (dirty || ms - lastFrame > 80) {
        try {
          render(ms);
          if (needsFirstRender) {
            needsFirstRender = false;
            if (!imageErrors) updateStatus('✅ Zone Modulaire 04 · Villa 2×2, décors et snap actifs' + (migrated ? ' · Ancien essai V02 importé' : ''));
          }
        } catch (error) {
          updateStatus('❌ Erreur d’affichage : ' + (error?.message || String(error)), 'error');
          console.error('[Crime Empire V04 rendu]', error);
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
      if (!valid(t.r, t.c) || !tileTypes.has(tool) || state.tiles[t.r][t.c] === tool) return false;
      const occupied = state.nodes.some(n => footprint(n).some(([r, c]) => r === t.r && c === t.c));
      if (occupied && (tool === 'road' || tool === 'water')) {
        updateStatus('⚠ Déplace le bâtiment avant de poser une route ou de l’eau dessous', 'warning');
        return false;
      }
      state.tiles[t.r][t.c] = tool;
      saveSoon(); dirty = true;
      selection.innerHTML = '<b>Case ' + t.r + ':' + t.c + '</b><br>Revêtement : ' + tool +
        '<br><span style="color:#aab5bb">Essai enregistré dans ce navigateur.</span>';
      return true;
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
        gesture = { mode: tool === 'move' ? 'node' : 'inspect', start: p, moved: false, nodeId: node.id, baseR: node.r, baseC: node.c, lastValidR: node.r, lastValidC: node.c, initial: p };
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
            const spec = defs[node.src];
            const rr = clamp(Math.round(gesture.baseR + delta.r), 0, ROWS - spec.rows);
            const cc = clamp(Math.round(gesture.baseC + delta.c), 0, COLS - spec.cols);
            node.r = rr; node.c = cc;
            if (placementStatus(node).ok) { gesture.lastValidR = rr; gesture.lastValidC = cc; }
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
          const status = placementStatus(n);
          if (!status.ok) {
            n.r = g.lastValidR; n.c = g.lastValidC;
            updateStatus('⛔ Placement refusé : ' + status.reason, 'warning');
          } else updateStatus('✅ ' + n.name + ' calé sur ' + defs[n.src].rows + '×' + defs[n.src].cols + ' cases');
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
    function applyToSelected(key, value) { const n = focusNode(); if (!n) return; n[key] = value; saveSoon(); updateInspector(); dirty = true; }
    $('sizeRange').addEventListener('input', e => applyToSelected('visualScale', Number(e.target.value)));
    $('depthRange').addEventListener('input', e => applyToSelected('depth', Number(e.target.value)));
    let decorSerial = Date.now();
    function addDecoration(type) {
      if (!decorationTypes.has(type)) return;
      if (state.nodes.length >= 20) { updateStatus('Limite de 20 objets pour ce prototype', 'warning'); return; }
      const d = defs[type];
      const node = { id: type + '-' + (++decorSerial), name: d.label, kind: 'decor', src: type, r: 0, c: 0, visualScale: 100, depth: 0 };
      let found = false;
      // Prefer empty sites around the perimeter, then search the rest.
      for (let r = 0; r <= ROWS - d.rows && !found; r++) for (let c = COLS - d.cols; c >= 0; c--) {
        if (placementStatus(node, r, c).ok) { node.r = r; node.c = c; found = true; break; }
      }
      if (!found) { updateStatus('Aucune case libre pour ' + d.label, 'warning'); return; }
      state.nodes.push(node); selectNode(node.id); saveSoon(); dirty = true;
      updateStatus('✅ ' + d.label + ' ajouté · déplace-le sur la grille');
    }
    document.querySelectorAll('[data-add]').forEach(btn => btn.addEventListener('click', () => {
      addDecoration(btn.dataset.add);
      setTool('move');
    }));
    $('removeNodeBtn').addEventListener('click', () => {
      const node = focusNode(); if (!node || !decorationTypes.has(node.src)) return;
      state.nodes = state.nodes.filter(n => n.id !== node.id);
      selectNode(null); saveSoon(); updateStatus('Décoration retirée du laboratoire'); dirty = true;
    });
    $('resetNodeBtn').addEventListener('click', () => {
      const n = focusNode(); if (!n) return;
      const original = defaults.find(x => x.id === n.id);
      if (!original) { updateStatus('Pas de position d’origine pour cet objet ajouté', 'warning'); return; }
      const old = { r: n.r, c: n.c };
      Object.assign(n, { r: original.r, c: original.c, visualScale: original.visualScale, depth: original.depth });
      if (!placementStatus(n).ok) Object.assign(n, old);
      saveSoon(); updateInspector(); dirty = true;
    });
    function nudge(dr, dc) {
      const n = focusNode(); if (!n) return;
      const spec = defs[n.src];
      const r = clamp(n.r + dr, 0, ROWS - spec.rows), c = clamp(n.c + dc, 0, COLS - spec.cols);
      const status = placementStatus(n, r, c);
      if (!status.ok) { updateStatus('⛔ Déplacement impossible : ' + status.reason, 'warning'); return; }
      n.r = r; n.c = c;
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
      if (!confirm('Réinitialiser le terrain, la Villa 2×2, le dépôt et les décorations ? Rien ne sera modifié dans Supabase.')) return;
      state = { tiles: clone(defaultTiles), nodes: clone(defaults) };
      selectedId = null; saveSoon(); updateInspector(); resetCamera();
    });
    $('exportBtn').addEventListener('click', () => {
      const file = new Blob([JSON.stringify({ version: 4, footprint: Object.fromEntries(Object.entries(defs).map(([k, v]) => [k, [v.rows, v.cols]])), ...state }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(file);
      const a = document.createElement('a'); a.href = url; a.download = 'crime-empire-zone-modulaire-04.json'; a.click();
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
    console.error('[Crime Empire V04 init]', error);
    if (status) { status.dataset.state = 'error'; status.textContent = '❌ Initialisation impossible : ' + (error?.message || String(error)); }
  }
})();
