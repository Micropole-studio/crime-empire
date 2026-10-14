/* Crime Empire / Carte Modulaire 05 — laboratoire autonome, sans Supabase. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('scene'), ctx = canvas?.getContext('2d', {alpha:false});
  const stat = $('scene-status'), selection = $('selection');
  if (!ctx) { if (stat) stat.textContent = 'Canvas 2D indisponible'; return; }
  const ROWS=12, COLS=12, TW=208, TH=106;
  const KEY='crime-empire-modular-v05-map', LEGACY_KEY='crime-empire-modular-zone-04-local-v1';
  const KINDS = new Set(['road','plot','asphalt','concrete','grass','water']);
  const DEFINITIONS={
    villa: {name:'Villa / QG', rows:2, cols:2,category:'city', art:'villa', scale:1.0, lift:4, pad:'luxury'},
    depot: {name:'Dépôt PvE', rows:2,cols:2,category:'pve',art:'depot',scale:.96,lift:4,pad:'industrial'},
    securite:{name:'Sécurité',rows:2,cols:2,category:'building',art:'securite',scale:.94,lift:3,pad:'luxury'},
    garage:{name:'Garage',rows:2,cols:2,category:'building',art:'garage',scale:.96,lift:3,pad:'luxury'},
    labo:{name:'Laboratoire',rows:2,cols:2,category:'building',art:'labo',scale:.93,lift:3,pad:'luxury'},
    syndicat:{name:'Syndicat',rows:2,cols:2,category:'building',art:'syndicat',scale:.93,lift:3,pad:'luxury'},
    usine:{name:'Usine',rows:3,cols:3,category:'building',art:'usine',scale:.93,lift:3,pad:'industrial'},
    planque:{name:'Planque',rows:2,cols:2,category:'building',art:'planque',scale:.95,lift:3,pad:'industrial'},
    jardin:{name:'Jardin tropical',rows:1,cols:1,category:'decor',art:'jardin',scale:.90,lift:2,pad:'garden'},
    ilot:{name:'Îlot paysager',rows:1,cols:1,category:'decor',art:'ilot',scale:.90,lift:2,pad:'garden'},
    portail:{name:'Portail sécurisé',rows:1,cols:2,category:'decor',art:'portail',scale:.96,lift:2,pad:'luxury'}
  };
  const groundSrc = {asphalt:'assets/asphalt.webp',concrete:'assets/concrete.webp',grass:'assets/grass.webp',water:'assets/water.webp'};
  const imgs={}, patterns={}; let failed=0, ready=0;
  let raf=0, lastPaint=0, cw=0, ch=0, dpr=1, zoom=.49, ox=0, oy=0, changed=true, first=true;
  let tool='move', showGrid=false, showLabels=true, selected='villa', hovering=null, gesture=null;
  const pointers=new Map(); let history=[], future=[], saveTimer=0, serial=10;
  const clone = data=>JSON.parse(JSON.stringify(data));
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const iso=(r,c)=>({x:(c-r)*TW/2, y:(c+r)*TH/2});
  const toRC=(x,y)=>({r:(y/(TH/2)-x/(TW/2))/2,c:(y/(TH/2)+x/(TW/2))/2});
  const worldToScreen=p=>({x:p.x*zoom+ox,y:p.y*zoom+oy});
  const fromScreen=p=>({x:(p.x-ox)/zoom,y:(p.y-oy)/zoom});
  const tileAt=p=>{const a=toRC(fromScreen(p).x,fromScreen(p).y);return {r:Math.round(a.r),c:Math.round(a.c)};};
  const valid=(r,c)=>r>=0&&r<ROWS&&c>=0&&c<COLS;
  const occupied=(node,rr=node.r,cc=node.c)=>Array.from({length:DEFINITIONS[node.src].rows*DEFINITIONS[node.src].cols},(_,i)=>[rr+Math.floor(i/DEFINITIONS[node.src].cols),cc+i%DEFINITIONS[node.src].cols]);
  const geo=(node,rr=node.r,cc=node.c)=>{
    const d=DEFINITIONS[node.src];
    const points=[iso(rr-.5,cc-.5),iso(rr-.5,cc+d.cols-.5),iso(rr+d.rows-.5,cc+d.cols-.5),iso(rr+d.rows-.5,cc-.5)];
    return {points,center:iso(rr+(d.rows-1)/2,cc+(d.cols-1)/2),width:Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x)),height:Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y))};
  };
  function initialMap(){
    const tiles=Array.from({length:ROWS},(_,r)=>Array.from({length:COLS},(_,c)=>{
      if (r>=8&&c>=10) return 'water';
      if (r===5||c===6) return 'road';
      if (r<=3&&c<=4) return 'plot';
      if (r<=4&&c>=8) return 'plot';
      if (r>=7&&c<=4) return 'plot';
      if (r>=7&&c>=7&&c<=9) return 'plot';
      return (r>8&&c>6)|| (r+c)%7===0 ? 'grass' : 'concrete';
    }));
    const nodes=[
      {id:'villa',src:'villa',r:1,c:1,scale:100},
      {id:'garage-1',src:'garage',r:3,c:0,scale:100},
      {id:'depot',src:'depot',r:8,c:1,scale:100},
      {id:'securite',src:'securite',r:1,c:9,scale:100},
      {id:'syndicat-1',src:'syndicat',r:3,c:8,scale:100},
      {id:'planque-1',src:'planque',r:6,c:9,scale:100},
      {id:'labo',src:'labo',r:8,c:7,scale:100},
      {id:'usine-1',src:'usine',r:6,c:3,scale:100},
      {id:'jardin-1',src:'jardin',r:3,c:5,scale:100},
      {id:'ilot-1',src:'ilot',r:9,c:9,scale:100},
      {id:'portail-1',src:'portail',r:4,c:2,scale:100}
    ];
    return {version:5,tiles,nodes};
  }
  let data=initialMap();
  function check(node,r=node.r,c=node.c){
    const cells=occupied(node,r,c);
    if (cells.some(([a,b])=>!valid(a,b))) return {ok:false,msg:'Hors de la région'};
    if (cells.some(([a,b])=>['water','road'].includes(data.tiles[a][b])))return {ok:false,msg:'Route ou eau sous la construction'};
    if(data.nodes.some(o=>o.id!==node.id&&occupied(o).some(([a,b])=>cells.some(([rr,cc])=>rr===a&&cc===b))))return {ok:false,msg:'Emplacement déjà occupé'};
    return {ok:true,msg:'Placement valide'};
  }
  function sanitise(json){
    if(!json||!Array.isArray(json.tiles)||json.tiles.length!==ROWS)throw Error('Dimensions incorrectes : le plan V05 utilise 12×12 cases');
    const tiles=json.tiles.map(row=>{if(!Array.isArray(row)||row.length!==COLS||row.some(v=>!KINDS.has(v)))throw Error('Types de tuiles invalides');return row.slice();});
    if(!Array.isArray(json.nodes)||json.nodes.length>45)throw Error('Trop de bâtiments');
    const nodes=[],ids=new Set();
    for(const n of json.nodes){
      if(!n||typeof n.id!=='string'||!/^[\w-]{1,64}$/.test(n.id)||ids.has(n.id)||!DEFINITIONS[n.src])throw Error('Objet invalide ou doublon');
      ids.add(n.id);const d=DEFINITIONS[n.src];
      const obj={id:n.id,src:n.src,r:Math.round(Number(n.r)),c:Math.round(Number(n.c)),scale:clamp(Number(n.scale)||100,85,108)};
      if(!Number.isFinite(obj.r)||!Number.isFinite(obj.c)||obj.r<0||obj.c<0||obj.r+d.rows>ROWS||obj.c+d.cols>COLS)throw Error('Objet hors de la grille');
      const cells=occupied(obj);
      if(cells.some(([a,b])=>['water','road'].includes(tiles[a][b])))throw Error('Bâtiment placé sur route/eau');
      if(nodes.some(o=>occupied(o).some(([a,b])=>cells.some(([c,e])=>c===a&&e===b))))throw Error('Deux bâtiments se chevauchent');
      nodes.push(obj);
    }
    if(!nodes.some(n=>n.src==='villa'))throw Error('La Villa est obligatoire');
    return {version:5,tiles,nodes};
  }
  try{
    const raw=localStorage.getItem(KEY);
    if(raw)data=sanitise(JSON.parse(raw));
    else if(localStorage.getItem(LEGACY_KEY)){
      // V04 already validated; do not overlay 9×11 coordinates on this new square 12×12 region.
      inform('Nouvelle région carrée 12×12 · anciens essais V04 conservés dans ton navigateur','ready');
    }
  }catch(err){console.warn('[V05] état ignoré:',err);}
  function inform(message,level='ready'){if(stat){stat.textContent=message;stat.dataset.state=level;}}
  function save(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{localStorage.setItem(KEY,JSON.stringify(data));}catch(e){inform('Stockage local indisponible','warning');}},190);}
  function snapshot(){history.push(JSON.stringify(data));if(history.length>40)history.shift();future=[];}
  function restore(pile,other){if(!pile.length)return;other.push(JSON.stringify(data));data=sanitise(JSON.parse(pile.pop()));selected=null;updateSelection();save();changed=true;}
  function loadImages(){
    for(const [key,src] of [...Object.entries(groundSrc),...Object.keys(DEFINITIONS).map(key=>[key,'assets/'+key+'.webp'])]){
      const img=new Image();img.onload=()=>{imgs[key]=img;ready++;if(groundSrc[key])patterns[key]=ctx.createPattern(img,'repeat');changed=true;};
      img.onerror=()=>{failed++;inform('Asset non chargé : '+src,'warning');};img.src=src;
    }
  }
  function poly(points,fill,stroke,width=1){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.lineWidth=width;ctx.strokeStyle=stroke;ctx.stroke();}}
  function diamond(x,y){ctx.beginPath();ctx.moveTo(x,y-TH/2);ctx.lineTo(x+TW/2,y);ctx.lineTo(x,y+TH/2);ctx.lineTo(x-TW/2,y);ctx.closePath();}
  function scatter(seed){let n=seed>>>0;return()=>{n=(Math.imul(1664525,n)+1013904223)>>>0;return n/4294967296;};}
  const rand=scatter(4127),stars=Array.from({length:200},()=>({x:(rand()-.5)*4000,y:rand()*1800,a:rand()*.6}));
  const boardCenter=iso((ROWS-1)/2,(COLS-1)/2);
  function resetCamera(){
    const room=cw>(900)?cw-322:cw;const h=ch>(740)?ch-135:ch*.65;
    zoom=clamp(Math.min(room/2600,h/1420)*1.05,.27,.68);
    ox=(cw>(900)?(cw-312)/2:cw/2)-boardCenter.x*zoom;
    oy=(cw>900?ch*.64:ch*.38)-boardCenter.y*zoom;
    changed=true;
  }
  function resize(){let oldw=cw,oldh=ch;cw=Math.max(1,canvas.clientWidth);ch=Math.max(1,canvas.clientHeight);dpr=Math.min(window.devicePixelRatio||1,1.7);canvas.width=Math.floor(cw*dpr);canvas.height=Math.floor(ch*dpr);if(!oldw||!oldh)resetCamera();else{ox+=(cw-oldw)*.5;oy+=(ch-oldh)*.5;}changed=true;}
  function zoomAt(f,p){const old=zoom;zoom=clamp(zoom*f,.25,2.3);ox=p.x-(p.x-ox)*zoom/old;oy=p.y-(p.y-oy)*zoom/old;changed=true;}
  function tileColor(type){return {road:'#262b31',plot:'#505151',asphalt:'#343b42',concrete:'#4b5052',grass:'#38483e',water:'#173b4d'}[type];}
  function tile(r,c,ms){const t=data.tiles[r][c],p=iso(r,c);
    ctx.save();diamond(p.x,p.y);ctx.clip();
    const kind=t==='road'?'asphalt':t==='plot'?'concrete':t;
    ctx.fillStyle=patterns[kind]||tileColor(t);ctx.fillRect(p.x-TW/2,p.y-TH/2,TW,TH);
    ctx.fillStyle=t==='water'?'#0b344b83':t==='grass'?'#0a201850':t==='road'?'#080e14aa':'#0f161d66';ctx.fillRect(p.x-TW/2,p.y-TH/2,TW,TH);
    if(t==='plot'){
      ctx.strokeStyle='#e9c38720';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(p.x-TW/2,p.y);ctx.lineTo(p.x+TW/2,p.y);ctx.stroke();
    }
    if(t==='road'){
      // Roads only draw the center line toward neighbouring roads; no disconnected dashed curves.
      ctx.save();ctx.setLineDash([11,12]);ctx.strokeStyle='#e2c3837f';ctx.lineWidth=2.3;
      for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]])if(valid(r+dr,c+dc)&&data.tiles[r+dr][c+dc]==='road'){
        ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+(dc-dr)*TW/2,p.y+(dc+dr)*TH/2);ctx.stroke();
      }ctx.restore();
      // Curbs and continuous road edges where a road meets pavement.
      for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){
        if(!valid(r+dr,c+dc)||data.tiles[r+dr][c+dc]==='road')continue;
        const a={x:p.x+(dc-dr)*TW/4,y:p.y+(dc+dr)*TH/4};
        const edge=dr===1?[{x:p.x,y:p.y+TH/2},{x:p.x-TW/2,y:p.y}]:dr===-1?[{x:p.x,y:p.y-TH/2},{x:p.x+TW/2,y:p.y}]:dc===1?[{x:p.x+TW/2,y:p.y},{x:p.x,y:p.y+TH/2}]:[{x:p.x-TW/2,y:p.y},{x:p.x,y:p.y-TH/2}];
        ctx.strokeStyle='#d6c2978c';ctx.lineWidth=2.6;ctx.beginPath();ctx.moveTo(edge[0].x,edge[0].y);ctx.lineTo(edge[1].x,edge[1].y);ctx.stroke();
      }
    }
    if(t==='grass'){
      const rng=scatter((r+1)*8311+(c+1)*7411);
      for(let i=0;i<18;i++){const xx=p.x+(rng()-.5)*TW,yy=p.y+(rng()-.5)*TH;ctx.fillStyle=i%3===0?'#58715168':'#1e45324d';ctx.beginPath();ctx.ellipse(xx,yy,2.5+rng()*4,1.5+rng()*2,0,0,Math.PI*2);ctx.fill();}
    }
    if(t==='water'){
      for(let i=0;i<8;i++){const xx=p.x-80+i*23+Math.sin(ms*.0008+i*2)*4,yy=p.y-30+i*8;ctx.strokeStyle=i%2?'#62badf45':'#d0d6bb54';ctx.lineWidth=1.7;ctx.beginPath();ctx.moveTo(xx,yy);ctx.quadraticCurveTo(xx+14,yy-4,xx+22,yy);ctx.stroke();}
    }
    ctx.restore();
    if(t==='road'){
      ctx.strokeStyle='#a8997a44';ctx.lineWidth=1.7;diamond(p.x,p.y);ctx.stroke();
    }
    if(showGrid){ctx.strokeStyle='#e9ce907a';ctx.lineWidth=1.35;diamond(p.x,p.y);ctx.stroke();}
    if(hovering?.r===r&&hovering?.c===c&&tool!=='move'){
      ctx.strokeStyle='#ffcc71';ctx.lineWidth=3;diamond(p.x,p.y);ctx.stroke();
    }
  }
  function pad(node){
    const g=geo(node),d=DEFINITIONS[node.src],q=g.points;
    const top=ctx.createLinearGradient(g.center.x,g.center.y-g.height/2,g.center.x,g.center.y+g.height/2);
    const colors=d.pad==='industrial'?['#46494b','#303439']:d.pad==='garden'?['#58604b','#394837']:['#696662','#494d4e'];
    top.addColorStop(0,colors[0]);top.addColorStop(1,colors[1]);
    const side=g.points.map(p=>({x:p.x,y:p.y+8}));
    poly([q[1],q[2],side[2],side[1]],'#282b2e','#6157419a',1.3);
    poly([q[2],q[3],side[3],side[2]],'#202629','#71624b8f',1.3);
    poly(q,top,'#d8bd885e',2);
    // Real footprint grid: exactly one foundation for N×M contiguous square tiles.
    for(const [r,c] of occupied(node)){
      const p=iso(r,c);
      ctx.strokeStyle='#e4d8b42d';ctx.lineWidth=1;diamond(p.x,p.y);ctx.stroke();
      if(node.id===selected){ctx.fillStyle=check(node).ok?'#5cf6b43d':'#ff5c5c58';ctx.fill();ctx.strokeStyle=check(node).ok?'#a4efc3ab':'#f28b88ca';ctx.lineWidth=1.8;ctx.stroke();}
    }
  }
  function softShadow(g){ctx.save();ctx.beginPath();ctx.ellipse(g.center.x,g.center.y+g.height*.18,g.width*.38,g.height*.19,0,0,Math.PI*2);ctx.fillStyle='#04090b63';ctx.fill();ctx.beginPath();ctx.ellipse(g.center.x,g.center.y+g.height*.13,g.width*.29,g.height*.12,0,0,Math.PI*2);ctx.fillStyle='#02040670';ctx.fill();ctx.restore();}
  function sprite(node){
    const g=geo(node),d=DEFINITIONS[node.src],im=imgs[node.src];
    softShadow(g);
    pad(node);
    const exactW=g.width*d.scale*(node.scale/100);
    const height=im?exactW*im.height/im.width:exactW*.77;
    // One calibrated bottom-center anchor for the actual opaque asset, NO free-size image mode.
    const baseY=g.points[2].y-d.lift;
    ctx.save();
    if(im){
      ctx.drawImage(im,g.center.x-exactW/2,baseY-height,exactW,height);
    }else{
      ctx.fillStyle='#9f8554';ctx.fillRect(g.center.x-exactW*.3,baseY-height*.7,exactW*.6,height*.7);
    }
    ctx.restore();
    if(node.id===selected){
      ctx.save();ctx.lineWidth=3.5;ctx.strokeStyle=check(node).ok?'#68f2b0':'#ff7775';ctx.setLineDash([12,8]);poly(g.points,null,ctx.strokeStyle,3.2);ctx.restore();
      for(const pt of g.points){ctx.fillStyle='#f6e9c9';ctx.fillRect(pt.x-3,pt.y-3,6,6);}
    }
    if(showLabels||node.id===selected){
      const title=d.name+' · '+d.rows+'×'+d.cols;ctx.font='600 14px system-ui';ctx.textAlign='center';
      const x=g.center.x,y=baseY-height-10,w=ctx.measureText(title).width+27;
      ctx.fillStyle=node.id===selected?'#3b2d1bf5':'#101922e7';ctx.strokeStyle=node.id===selected?'#dfc080':'#b3925c8b';ctx.lineWidth=1;
      ctx.beginPath();ctx.roundRect(x-w/2,y-23,w,28,7);ctx.fill();ctx.stroke();ctx.fillStyle='#f7dab0';ctx.fillText(title,x,y-4);
    }
  }
  function drawDecorations(){
    // Low-detail roadside lights and greenery rendered at their tile positions.
    const candidates=[[0,5],[5,0],[5,7],[6,6],[7,5],[6,2],[6,9],[4,9],[11,6],[2,7],[10,9],[4,4],[3,6],[0,8],[7,7]];
    for(const [r,c] of candidates){if(!valid(r,c)||['road','water'].includes(data.tiles[r][c]))continue;
      if(data.nodes.some(n=>occupied(n).some(([a,b])=>a===r&&b===c)))continue;
      const p=iso(r,c);const x=p.x-23,y=p.y+1;
      ctx.strokeStyle='#cab581';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-29);ctx.stroke();
      ctx.save();ctx.fillStyle='#ffda9d';ctx.shadowColor='#ffbf58';ctx.shadowBlur=17;ctx.beginPath();ctx.arc(x,y-30,3,0,Math.PI*2);ctx.fill();ctx.restore();
    }
  }
  function draw(ms){
    const scale=dpr;ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,cw,ch);
    const b=ctx.createLinearGradient(0,0,0,ch);b.addColorStop(0,'#0a1823');b.addColorStop(.55,'#132636');b.addColorStop(1,'#07101a');ctx.fillStyle=b;ctx.fillRect(0,0,cw,ch);
    // Vignette and a restrained dawn-like ambient gradient; tiles are THE world, not a mocked full-map image.
    const v=ctx.createRadialGradient(cw*.47,ch*.48,80,cw*.47,ch*.48,cw*.73);v.addColorStop(0,'#2841513a');v.addColorStop(1,'#01070b98');ctx.fillStyle=v;ctx.fillRect(0,0,cw,ch);
    ctx.save();ctx.translate(ox,oy);ctx.scale(zoom,zoom);
    const outline=[iso(-.5,-.5),iso(-.5,COLS-.5),iso(ROWS-.5,COLS-.5),iso(ROWS-.5,-.5)];
    const skirt=outline.map(p=>({x:p.x,y:p.y+22}));poly([outline[1],outline[2],skirt[2],skirt[1]],'#161d22','#3d484e');poly([outline[2],outline[3],skirt[3],skirt[2]],'#0a131b','#2b3541');
    for(let s=0;s<ROWS+COLS-1;s++)for(let r=0;r<ROWS;r++){let c=s-r;if(valid(r,c))tile(r,c,ms);}
    drawDecorations();
    // Draw in one isometric depth order: building bases and sprites share their same sort order.
    const ordered=data.nodes.slice().sort((a,b)=>geo(a).points[2].y-geo(b).points[2].y);
    for(const n of ordered)sprite(n);
    ctx.restore();
    $('zoomLabel').textContent=Math.round(zoom*100)+'%';
    $('counts').textContent=data.nodes.length+' objets · '+ROWS+'×'+COLS+' cases';
  }
  function tick(ms){if(changed||ms-lastPaint>300){draw(ms);changed=false;lastPaint=ms;}raf=requestAnimationFrame(tick);}
  function pickedNode(p){
    const wp=fromScreen(p),t=tileAt(p);
    // Prefer front-most sprites, including roofs projecting above the footprint.
    return data.nodes.slice().sort((a,b)=>geo(b).points[2].y-geo(a).points[2].y).find(n=>{
      const g=geo(n),def=DEFINITIONS[n.src],im=imgs[n.src];const w=g.width*def.scale*(n.scale/100),h=im?w*im.height/im.width:w*.8;
      return (wp.x>=g.center.x-w*.48&&wp.x<=g.center.x+w*.48&&wp.y>=g.points[2].y-h&&wp.y<=g.points[2].y)||occupied(n).some(([a,b])=>a===t.r&&b===t.c);
    })||null;
  }
  function updateSelection(){
    const n=data.nodes.find(n=>n.id===selected);const inspector=$('inspector');inspector.hidden=!n;
    if(!n){selection.textContent='Sélectionne un bâtiment, puis déplace-le. Sa parcelle reste toujours attachée à ses cases.';return;}
    const d=DEFINITIONS[n.src],v=check(n);
    selection.innerHTML='<strong>'+d.name+'</strong><span>'+d.rows+' × '+d.cols+' = '+d.rows*d.cols+' cases<br>Ligne '+n.r+' · Colonne '+n.c+'</span>';
    $('footprintOutput').textContent=d.rows+' × '+d.cols+' — '+d.rows*d.cols+' cases';
    $('placementOutput').textContent=v.ok?'✓ '+v.msg:'✕ '+v.msg;$('placementOutput').dataset.valid=v.ok?'true':'false';
    $('sizeRange').value=n.scale;$('sizeOutput').textContent=n.scale+'%';
    $('removeNodeBtn').hidden=n.id==='villa'||n.id==='depot';
    changed=true;
  }
  function setTool(t){tool=t;document.querySelectorAll('[data-tool]').forEach(el=>{const on=el.dataset.tool===t;el.classList.toggle('active',on);el.setAttribute('aria-pressed',String(on));});updateSelection();}
  function paintAt(p){const t=tileAt(p);if(!valid(t.r,t.c)||!KINDS.has(tool))return;
    if(data.tiles[t.r][t.c]===tool)return;
    if(['road','water'].includes(tool)&&data.nodes.some(n=>occupied(n).some(([r,c])=>r===t.r&&c===t.c))){inform('⛔ Enlève d’abord le bâtiment de cette case','warning');return;}
    data.tiles[t.r][t.c]=tool;save();changed=true;
  }
  function canvasPoint(e){const rect=canvas.getBoundingClientRect();return {x:e.clientX-rect.left,y:e.clientY-rect.top};}
  function down(e){if(e.button!=null&&e.button!==0)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);const p=canvasPoint(e);pointers.set(e.pointerId,p);
    if(pointers.size===2){const points=[...pointers.values()];gesture={type:'pinch',a:points[0],b:points[1],dist:Math.max(1,Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y))};return;}
    const found=tool==='move'||tool==='inspect'?pickedNode(p):null;
    if(found){selected=found.id;updateSelection();gesture={type:tool==='move'?'node':'pan',nodeId:found.id,start:p,baseR:found.r,baseC:found.c,lastR:found.r,lastC:found.c,dirty:false};}
    else if(KINDS.has(tool)){snapshot();gesture={type:'paint',start:p};paintAt(p);}
    else gesture={type:'pan',start:p};changed=true;
  }
  function move(e){const p=canvasPoint(e),old=pointers.get(e.pointerId);hovering=tileAt(p);if(!old){changed=true;return;}
    pointers.set(e.pointerId,p);if(!gesture)return;
    if(gesture.type==='pinch'&&pointers.size===2){const [a,b]=[...pointers.values()];const center={x:(a.x+b.x)/2,y:(a.y+b.y)/2};const before={x:(gesture.a.x+gesture.b.x)/2,y:(gesture.a.y+gesture.b.y)/2};ox+=center.x-before.x;oy+=center.y-before.y;zoomAt(Math.hypot(a.x-b.x,a.y-b.y)/gesture.dist,center);gesture={type:'pinch',a,b,dist:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))};}
    else if(pointers.size===1){
      if(gesture.type==='pan'){ox+=p.x-old.x;oy+=p.y-old.y;}
      else if(gesture.type==='paint')paintAt(p);
      else if(gesture.type==='node'){
        const n=data.nodes.find(n=>n.id===gesture.nodeId);
        if(n){const delta=toRC((p.x-gesture.start.x)/zoom,(p.y-gesture.start.y)/zoom);const d=DEFINITIONS[n.src];const rr=clamp(gesture.baseR+Math.round(delta.r),0,ROWS-d.rows);const cc=clamp(gesture.baseC+Math.round(delta.c),0,COLS-d.cols);
          if(rr!==n.r||cc!==n.c){n.r=rr;n.c=cc;gesture.dirty=true;if(check(n).ok){gesture.lastR=rr;gesture.lastC=cc;}updateSelection();}
        }
      }
    }changed=true;
  }
  function up(e){const end=pointers.size===1;pointers.delete(e.pointerId);if(!end){gesture=null;return;}
    if(gesture?.type==='node'){
      const n=data.nodes.find(n=>n.id===gesture.nodeId);
      if(n){const v=check(n);if(!v.ok){n.r=gesture.lastR;n.c=gesture.lastC;inform('⛔ '+v.msg+' — retour au dernier emplacement valable','warning');}
      else if(gesture.dirty){history.push(JSON.stringify({...data,nodes:data.nodes.map(o=>o.id===n.id?{...o,r:gesture.baseR,c:gesture.baseC}:o)}));future=[];inform('✅ '+DEFINITIONS[n.src].name+' ancré sur '+DEFINITIONS[n.src].rows+'×'+DEFINITIONS[n.src].cols+' cases');}
      if(gesture.dirty)save();updateSelection();}
    }else if(gesture?.type==='pan'&&Math.hypot((e.clientX||0)-(gesture.start.x+canvas.getBoundingClientRect().left),(e.clientY||0)-(gesture.start.y+canvas.getBoundingClientRect().top))<7){
      const n=pickedNode(canvasPoint(e));selected=n?.id||null;updateSelection();
    }
    gesture=null;changed=true;
  }
  function add(type){if(!DEFINITIONS[type])return;if(data.nodes.length>=32){inform('Limite de 32 éléments pour le laboratoire','warning');return;}
    const d=DEFINITIONS[type],node={id:type+'-'+(++serial),src:type,r:0,c:0,scale:100};let location=null;
    for(let r=0;r<=ROWS-d.rows&&!location;r++)for(let c=0;c<=COLS-d.cols;c++)if(check(node,r,c).ok){location=[r,c];break;}
    if(!location){inform('Aucun emplacement disponible pour '+d.name,'warning');return;}
    snapshot();[node.r,node.c]=location;data.nodes.push(node);selected=node.id;updateSelection();save();changed=true;setTool('move');inform('✓ '+d.name+' ajouté · glisse-le sur la carte');
  }
  function nudge(dr,dc){const n=data.nodes.find(n=>n.id===selected);if(!n)return;const d=DEFINITIONS[n.src],r=clamp(n.r+dr,0,ROWS-d.rows),c=clamp(n.c+dc,0,COLS-d.cols);const v=check(n,r,c);if(!v.ok){inform('⛔ '+v.msg,'warning');return;}snapshot();n.r=r;n.c=c;save();updateSelection();}
  function exportJSON(){const blob=new Blob([JSON.stringify({...data,footprints:Object.fromEntries(Object.entries(DEFINITIONS).map(([k,d])=>[k,[d.rows,d.cols]]))},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='crime-empire-carte-modulaire-v05.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3500);}
  async function importJSON(file){if(!file)return;try{if(file.size>400000)throw Error('Fichier trop lourd');const next=sanitise(JSON.parse(await file.text()));snapshot();data=next;selected='villa';save();updateSelection();changed=true;inform('✓ Plan importé dans le laboratoire');}catch(e){inform('Import refusé : '+(e?.message||String(e)),'error');}}
  loadImages();resize();
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);gesture=null;changed=true;});canvas.addEventListener('lostpointercapture',e=>{pointers.delete(e.pointerId);if(!pointers.size)gesture=null;});
  canvas.addEventListener('wheel',e=>{e.preventDefault();zoomAt(e.deltaY>0?.9:1.1,canvasPoint(e));},{passive:false});
  document.querySelectorAll('[data-tool]').forEach(el=>el.addEventListener('click',()=>setTool(el.dataset.tool)));
  document.querySelectorAll('[data-add]').forEach(el=>el.addEventListener('click',()=>add(el.dataset.add)));
  document.querySelectorAll('[data-nudge]').forEach(el=>el.addEventListener('click',()=>{const [r,c]=el.dataset.nudge.split(',').map(Number);nudge(r,c);}));
  $('sizeRange').addEventListener('input',e=>{const n=data.nodes.find(n=>n.id===selected);if(!n)return;n.scale=clamp(+e.target.value,85,108);$('sizeOutput').textContent=n.scale+'%';save();changed=true;});
  $('removeNodeBtn').addEventListener('click',()=>{const n=data.nodes.find(n=>n.id===selected);if(!n||['villa','depot'].includes(n.id))return;snapshot();data.nodes=data.nodes.filter(o=>o.id!==n.id);selected=null;save();updateSelection();changed=true;});
  $('previewBtn').addEventListener('click',()=>{const on=!document.body.classList.contains('preview-mode');document.body.classList.toggle('preview-mode',on);$('previewBtn').textContent=on?'✕ Quitter aperçu':'◈ Aperçu joueur';$('previewExitBtn').hidden=!on;changed=true;});
  $('previewExitBtn').addEventListener('click',()=>{$('previewBtn').click();});
  $('gridBtn').addEventListener('click',()=>{showGrid=!showGrid;$('gridBtn').textContent='Grille : '+(showGrid?'visible':'masquée');changed=true;});
  $('labelsBtn').addEventListener('click',()=>{showLabels=!showLabels;$('labelsBtn').textContent='Noms : '+(showLabels?'visibles':'masqués');changed=true;});
  $('resetBtn').addEventListener('click',()=>{if(!confirm('Recommencer la zone expérimentale 12×12 ? Aucun joueur Supabase ne sera modifié.'))return;snapshot();data=initialMap();selected='villa';save();updateSelection();resetCamera();inform('Région expérimentale réinitialisée');});
  $('exportBtn').addEventListener('click',exportJSON);$('importBtn').addEventListener('click',()=>$('importInput').click());$('importInput').addEventListener('change',async e=>{await importJSON(e.target.files?.[0]);e.target.value='';});
  $('undoBtn').addEventListener('click',()=>restore(history,future));$('redoBtn').addEventListener('click',()=>restore(future,history));
  $('zoomIn').addEventListener('click',()=>zoomAt(1.18,{x:cw*.42,y:ch*.50}));$('zoomOut').addEventListener('click',()=>zoomAt(1/1.18,{x:cw*.42,y:ch*.50}));$('home').addEventListener('click',resetCamera);
  $('fitVilla').addEventListener('click',()=>{const n=data.nodes.find(o=>o.src==='villa');if(!n)return;zoom=.74;const center=geo(n).center;ox=(cw>900?(cw-310)/2:cw/2)-center.x*zoom;oy=ch*.55-center.y*zoom;changed=true;selected=n.id;updateSelection();});
  window.addEventListener('keydown',e=>{const tag=e.target?.tagName;if(['INPUT','SELECT','TEXTAREA'].includes(tag))return;
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();restore(history,future);return;}
    const moves={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]};if(moves[e.key]){e.preventDefault();nudge(...moves[e.key]);}
  });
  window.addEventListener('resize',resize);window.addEventListener('visibilitychange',()=>{changed=true;});
  updateSelection();setTool('move');inform('✓ Carte Premium 12×12 active · Ville 2×2 = 4 cases');
  raf=requestAnimationFrame(tick);
  // Small test/diagnostic interface to verify Vercel production without special devtools.
  window.__CE_MODULAR_LAB__={getState:()=>clone(data),getSelected:()=>selected,getAssets:()=>({ready,failed}),check:(id,r,c)=>{const n=data.nodes.find(o=>o.id===id);return n?check(n,r,c):null;},add};
})();
