/* CRIME EMPIRE — World Map V11 | laboratoire indépendant, sans Supabase.
 * Monde continu dessiné en couches, sprites PvE / villes séparés, grille logique invisible.
 * Seul le parent React du laboratoire peut persister le brouillon (iframe sandboxée).
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas=$('scene'),ctx=canvas?.getContext('2d',{alpha:false});
  if(!ctx){$('scene-status').textContent='Canvas non disponible';return;}
  const COLS=64, ROWS=48, CELL=84, WIDTH=COLS*CELL, HEIGHT=ROWS*CELL, KEY='crime-empire-world-map-v11-lab';
  const TYPES={
    city:{name:'Ville joueur',w:2,h:2,src:'world-city.webp',scale:.98,anchorY:.88,shadowScale:.58,foundation:'city',offsetY:2},
    blackmarket:{name:'Marché noir',w:2,h:2,src:'black-market.webp',scale:1.00,anchorY:.885,shadowScale:.56,foundation:'blackmarket',offsetY:1},
    prison:{name:'Prison régionale',w:3,h:3,src:'prison.webp',scale:1.03,anchorY:.90,shadowScale:.62,foundation:'prison',offsetY:0},
    port:{name:'Port sombre',w:3,h:3,src:'dark-port.webp',scale:1.02,anchorY:.90,shadowScale:.68,foundation:'port',offsetY:0},
    weapons:{name:'Dépôt d’armes',w:2,h:2,src:'weapons-depot.webp',scale:1.00,anchorY:.89,shadowScale:.58,foundation:'weapons',offsetY:0},
    jardin:{name:'Végétation',w:1,h:1,src:'jardin.webp',scale:.83,anchorY:.84,shadowScale:.42,foundation:'jardin',offsetY:0},
    ilot:{name:'Place aménagée',w:1,h:1,src:'ilot.webp',scale:.83,anchorY:.84,shadowScale:.42,foundation:'ilot',offsetY:0},
    portail:{name:'Point de contrôle',w:1,h:2,src:'portail.webp',scale:.85,anchorY:.89,shadowScale:.46,foundation:'portail',offsetY:1},
  };
  const terrainTypes=new Set(['road','plot','asphalt','concrete','grass','water','quay']);
  const roads=[
    [[-4,25],[10,25],[19,23],[30,24],[40,25],[51,30]],
    [[14,-2],[14,8],[15,17],[12,27],[15,35],[19,49]],
    [[-2,10],[8,12],[20,13],[31,12],[44,15],[56,15]],
    [[30,24],[33,31],[35,40],[45,49]],
    [[40,25],[48,25],[52,30],[54,38]],
  ];
  const xy=(r,c)=>({x:(c+.5)*CELL,y:(r+.5)*CELL});
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const randomSeed=n=>{let x=n>>>0;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};};
  const rand=randomSeed(239018);
  const coastAt=y => WIDTH-620 + Math.sin(y*.0015)*145 + Math.sin(y*.0041)*52;
  function nodesInitial(){return [
    {id:'ville-01',kind:'city',r:19,c:23,label:'Ville du joueur A'},
    {id:'ville-02',kind:'city',r:32,c:10,label:'Ville du joueur B'},
    {id:'ville-03',kind:'city',r:8,c:44,label:'Ville du joueur C'},
    {id:'ville-04',kind:'city',r:36,c:36,label:'Ville du joueur D'},
    {id:'marche-noir',kind:'blackmarket',r:18,c:33},
    {id:'prison-regionale',kind:'prison',r:7,c:6},
    {id:'depot-armes',kind:'weapons',r:32,c:43},
    {id:'port-sombre',kind:'port',r:29,c:49},
  ];}
  const initial=()=>({version:11,nodes:nodesInitial(),paint:[]});
  let state=initial(),selected=null,tool='move',grid=false,labels=true,preview=false;
  let cw=0,ch=0,dpr=1,zoom=.46,ox=0,oy=0,changed=true,started=false,textureReady=0,textureFailed=0;
  let raf=0,pointers=new Map(),gesture=null,hover=null,paintIndex=new Map(),undo=[],redo=[],saveTimer=0,idIndex=100;
  const imgs={}, terrainImg=new Image(); terrainImg.onload=()=>{imgs.terrain=terrainImg;textureReady++;changed=true;};terrainImg.onerror=()=>{textureFailed++;changed=true;};terrainImg.src='assets/terrain-continu-v10.webp';
  Object.entries(TYPES).forEach(([k,d])=>{const img=new Image();img.onload=()=>{imgs[k]=img;textureReady++;changed=true;};img.onerror=()=>{textureFailed++;changed=true;};img.src='assets/'+d.src;});
  // Broad natural foliage — deterministic and generated once, never across a building or main road.
  function distanceToSegment(x,y,a,b){const dx=b.x-a.x,dy=b.y-a.y, t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(x-a.x-t*dx,y-a.y-t*dy);}
  const routeSegments=[];
  for(const route of roads)for(let i=0;i<route.length-1;i++)routeSegments.push([xy(route[i][1],route[i][0]),xy(route[i+1][1],route[i+1][0])]);
  const onRoad=(x,y,pad=0)=>routeSegments.some(([a,b])=>distanceToSegment(x,y,a,b)<48+pad);
  const trees=[];
  for(let i=0;i<1250;i++){
    const x=rand()*WIDTH,y=rand()*HEIGHT;
    const xratio=x/WIDTH, yratio=y/HEIGHT;
    const forest= (xratio<.23||yratio<.19||yratio>.78||(.45<xratio&&xratio<.62&&yratio<.35));
    if(!forest && rand()>.26)continue;
    if(x>coastAt(y)-40||onRoad(x,y,48))continue;
    const near=nodesInitial().some(n=>{const d=TYPES[n.kind];return Math.abs(x-(n.c+d.w/2)*CELL)<d.w*CELL/2+90&&Math.abs(y-(n.r+d.h/2)*CELL)<d.h*CELL/2+100;});
    if(near)continue;
    trees.push({x,y,r:9+rand()*17,seed:rand(),palm:rand()<.12});
  }
  const shrubs=[];
  for(let i=0;i<550;i++){const x=rand()*WIDTH,y=rand()*HEIGHT;if(x<coastAt(y)-10&&!onRoad(x,y,20))shrubs.push({x,y,r:3+rand()*7});}
  const ambientLights=[];
  for(let i=0;i<roads.length;i++){const route=roads[i];for(let j=0;j<route.length-1;j++){
    const a=xy(route[j][1],route[j][0]), b=xy(route[j+1][1],route[j+1][0]), steps=Math.floor(Math.hypot(b.x-a.x,b.y-a.y)/245);
    for(let k=0;k<steps;k++){const t=(k+.5)/(steps||1);ambientLights.push({x:a.x+(b.x-a.x)*t+50,y:a.y+(b.y-a.y)*t+40});}
  }}
  function footprint(n,r=n.r,c=n.c){const d=TYPES[n.kind],cells=[];for(let rr=r;rr<r+d.h;rr++)for(let cc=c;cc<c+d.w;cc++)cells.push([rr,cc]);return cells;}
  function inRegion(r,c){return Number.isInteger(r)&&Number.isInteger(c)&&r>=0&&c>=0&&r<ROWS&&c<COLS;}
  function terrainAt(r,c){return paintIndex.get(r+':'+c)||null;}
  function check(n,r=n.r,c=n.c){
    const d=TYPES[n.kind];if(!Number.isInteger(r)||!Number.isInteger(c)||r<0||c<0||r+d.h>ROWS||c+d.w>COLS)return {ok:false,msg:'Hors de la région'};
    const cells=footprint(n,r,c);
    for(const [rr,cc] of cells){const p=xy(rr,cc),t=terrainAt(rr,cc);
      if(p.x>coastAt(p.y)-12||t==='water')return {ok:false,msg:'Zone d’eau'};
      if((n.kind!=='port'&&onRoad(p.x,p.y,30))||t==='road')return {ok:false,msg:'Route principale'};
    }
    if(n.kind==='port' && (c<44||r<22))return {ok:false,msg:'Le port doit rester près de la côte'};
    const all=new Set(cells.map(p=>p.join(':')));
    if(state.nodes.some(o=>o.id!==n.id&&footprint(o).some(p=>all.has(p.join(':')))))return {ok:false,msg:'Emprise déjà occupée'};
    return {ok:true,msg:'Emplacement disponible'};
  }
  function sanitize(obj){
    if(!obj||![10,11].includes(obj.version)||!Array.isArray(obj.nodes)||obj.nodes.length>150||!Array.isArray(obj.paint)||obj.paint.length>2000)throw Error('Plan incompatible V11');
    const ids=new Set();const nodes=obj.nodes.map(n=>{
      if(!n||typeof n.id!=='string'||!/^[a-zA-Z0-9_-]{1,64}$/.test(n.id)||ids.has(n.id)||!TYPES[n.kind])throw Error('Objet invalide');ids.add(n.id);
      if(!Number.isInteger(n.r)||!Number.isInteger(n.c)||n.r<0||n.c<0||n.r+TYPES[n.kind].h>ROWS||n.c+TYPES[n.kind].w>COLS)throw Error('Position incorrecte');
      return {id:n.id,kind:n.kind,r:n.r,c:n.c,...(typeof n.label==='string'?{label:n.label.slice(0,44)}:{})};
    });
    const paint=obj.paint.map(p=>{if(!p||!inRegion(p.r,p.c)||!terrainTypes.has(p.kind))throw Error('Sol incorrect');return {r:p.r,c:p.c,kind:p.kind};});
    return {version:11,nodes,paint};
  }
  function updatePaint(){paintIndex=new Map(state.paint.map(p=>[p.r+':'+p.c,p.kind]));}
  function status(message,t='ready'){const e=$('scene-status');e.textContent=message;e.dataset.state=t;}
  let canStore=false;
  try{const raw=localStorage.getItem(KEY);canStore=true;if(raw)state=sanitize(JSON.parse(raw));}catch(e){if(e.name!=='SecurityError')console.warn('[World V11] Lecture stockage local:',e);}
  updatePaint();
  if(!canStore&&window.parent!==window){
    addEventListener('message',e=>{if(e.source!==window.parent||e.data?.type!=='crime-empire:lab:loaded')return;
      try{if(typeof e.data.payload==='string'){state=sanitize(JSON.parse(e.data.payload));updatePaint();selected=null;refreshInspector();changed=true;status('✓ Brouillon V11 restauré');}}
      catch(e){status('✓ Nouvelle région V11 : ancien brouillon incompatible ignoré');}
    });
    window.parent.postMessage({type:'crime-empire:lab:load'},'*');
  }
  function save(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{const raw=JSON.stringify(state);if(canStore){try{localStorage.setItem(KEY,raw);return;}catch(e){/* sandbox */}}
    if(window.parent!==window)window.parent.postMessage({type:'crime-empire:lab:save',payload:raw},'*');
  },210);}
  function snapshot(){undo.push(JSON.stringify(state));if(undo.length>40)undo.shift();redo=[];}
  function restore(a,b){if(!a.length)return;b.push(JSON.stringify(state));state=sanitize(JSON.parse(a.pop()));updatePaint();selected=null;refreshInspector();changed=true;save();}
  function screen(e){const b=canvas.getBoundingClientRect();return{x:e.clientX-b.left,y:e.clientY-b.top};}
  const toWorld=p=>({x:(p.x-ox)/zoom,y:(p.y-oy)/zoom});
  const toCell=p=>{const q=toWorld(p);return {r:Math.floor(q.y/CELL),c:Math.floor(q.x/CELL)};};
  function cameraReset(){const availableWidth=cw>920?cw-325:cw;const availableHeight=ch>800?ch-110:ch*.68;
    zoom=clamp(Math.min(availableWidth/3400,availableHeight/2200),.17,.62);
    const center={x:2600,y:2100};ox=(cw>920?(cw-325)/2:cw/2)-center.x*zoom;oy=(ch>800?ch*.56:ch*.38)-center.y*zoom;changed=true;
  }
  function zoomAt(f,p){const before=toWorld(p);zoom=clamp(zoom*f,.13,2.1);ox=p.x-before.x*zoom;oy=p.y-before.y*zoom;changed=true;}
  function resize(){const rect=canvas.getBoundingClientRect();const oldw=cw,oldh=ch;cw=Math.max(100,rect.width);ch=Math.max(100,rect.height);dpr=Math.min(1.75,devicePixelRatio||1);
    canvas.width=Math.round(cw*dpr);canvas.height=Math.round(ch*dpr);
    if(!started){cameraReset();started=true;}else{ox+=(cw-oldw)/2;oy+=(ch-oldh)/2;changed=true;}
  }
  function drawTerrain(){
    ctx.fillStyle='#344d38';ctx.fillRect(0,0,WIDTH,HEIGHT);
    if(imgs.terrain)ctx.drawImage(imgs.terrain,0,0,WIDTH,HEIGHT);
    // Terrain remains seamless: no plate/diamond boundaries, no repeated visible tiles.
    ctx.fillStyle='#172c2240';ctx.fillRect(0,0,WIDTH,HEIGHT);
    // Long blended valleys, cuttings and clearings. Deterministic curves and gradients.
    for(let i=0;i<80;i++){
      const rg=randomSeed(3119+i*39),x=rg()*WIDTH,y=rg()*HEIGHT,s=190+rg()*480;
      if(x>coastAt(y))continue;
      const g=ctx.createRadialGradient(x,y,0,x,y,s);g.addColorStop(0,i%3===0?'#66745d40':'#142c242e');g.addColorStop(1,'#35472d00');ctx.fillStyle=g;
      ctx.beginPath();ctx.arc(x,y,s,0,Math.PI*2);ctx.fill();
    }
    // Southern coast: no black void or hard board edge.
    ctx.beginPath();ctx.moveTo(coastAt(0),0);
    for(let y=0;y<=HEIGHT;y+=34)ctx.lineTo(coastAt(y),y);
    ctx.lineTo(WIDTH,HEIGHT);ctx.lineTo(WIDTH,0);ctx.closePath();
    const water=ctx.createLinearGradient(WIDTH-1150,0,WIDTH,0);water.addColorStop(0,'#173746');water.addColorStop(.45,'#0d2c3a');water.addColorStop(1,'#071c30');ctx.fillStyle=water;ctx.fill();
    // shoreline stones and quiet bright rim
    ctx.beginPath();for(let y=0;y<=HEIGHT;y+=14){const x=coastAt(y);if(y===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.strokeStyle='#bdc09f56';ctx.lineWidth=21;ctx.stroke();ctx.strokeStyle='#101e22c8';ctx.lineWidth=9;ctx.stroke();
    const rng=randomSeed(56);
    for(let i=0;i<420;i++){const y=rng()*HEIGHT,x=coastAt(y)+rng()*(WIDTH-coastAt(y));ctx.strokeStyle=i%4?'#a2d5d522':'#edd4a04e';ctx.lineWidth=.5+rng()*1.9;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+5+rng()*29,y-2);ctx.stroke();}
    // Coast-side concrete dock, separate from the port sprite.
    ctx.save();ctx.translate(WIDTH-720,2520);ctx.fillStyle='#444b49';ctx.fillRect(0,0,410,510);ctx.strokeStyle='#b49c74c0';ctx.lineWidth=10;ctx.strokeRect(0,0,410,510);ctx.fillStyle='#caa66c';for(let i=0;i<9;i++){ctx.fillRect(i*48,0,5,11);ctx.fillRect(i*48,499,5,11);}ctx.restore();
    for(const route of roads)drawRoad(route);
  }
  function drawRoad(route){const arr=route.map(v=>xy(v[1],v[0]));
    ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
    function stroke(color,width){ctx.beginPath();arr.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
    stroke('#354334ad',115);stroke('#6e6553a8',87);stroke('#21272b',69);stroke('#343a3b',61);
    ctx.setLineDash([17,34]);stroke('#c3ad805d',2.6);ctx.restore();
  }
  function patchColor(kind){return ({plot:'#4e4c44',asphalt:'#34393b',concrete:'#686760',grass:'#36583c',water:'#13415d',quay:'#66716c',road:'#2a3033'})[kind]||'#485144';}
  function drawEdits(){for(const a of state.paint){const p=xy(a.r,a.c),radius=CELL*.71;
    if(a.kind==='road'){
      ctx.fillStyle='#2a3136';ctx.fillRect(p.x-CELL*.5,p.y-CELL*.5,CELL,CELL);
      const neighbors=[[1,0],[-1,0],[0,1],[0,-1]];
      for(const [dr,dc] of neighbors){const t=terrainAt(a.r+dr,a.c+dc);if(t==='road'){const q=xy(a.r+dr,a.c+dc);ctx.strokeStyle='#343c42';ctx.lineWidth=65;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();}}
    }else{
      const g=ctx.createRadialGradient(p.x,p.y,12,p.x,p.y,radius);g.addColorStop(0,patchColor(a.kind)+'d8');g.addColorStop(1,patchColor(a.kind)+'00');ctx.fillStyle=g;ctx.fillRect(p.x-radius,p.y-radius,radius*2,radius*2);
    }
  }}
  function tree(t){const {x,y,r}=t;
    ctx.fillStyle='#030d0a6c';ctx.beginPath();ctx.ellipse(x+7,y+8,r*1.25,r*.62,0,0,Math.PI*2);ctx.fill();
    if(t.palm){ctx.strokeStyle='#735f39';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(x,y+6);ctx.lineTo(x-3,y-15);ctx.stroke();for(let i=0;i<7;i++){const a=i*Math.PI*2/7, xx=x+Math.cos(a)*r*1.4,yy=y-16+Math.sin(a)*r*.7;ctx.strokeStyle=i%2?'#739064':'#3f6441';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x-3,y-15);ctx.quadraticCurveTo((x+xx)/2,y-30,xx,yy);ctx.stroke();}return;}
    const cs=['#152b1e','#26482c','#345d38','#456a42','#658050'];
    for(let i=0;i<6;i++){const a=i*Math.PI*2/6,rx=Math.cos(a)*r*.58,ry=Math.sin(a)*r*.3,rr=r*(.54+.18*(i%3));ctx.fillStyle=cs[(i+Math.floor(t.seed*5))%cs.length];ctx.beginPath();ctx.ellipse(x+rx,y-5+ry,rr,rr*.73,0,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle='#8ba07824';ctx.beginPath();ctx.ellipse(x-r*.34,y-r*.40,r*.7,r*.22,-.3,0,Math.PI*2);ctx.fill();
  }
  function decorations(){const minX=(-ox/zoom)-50,maxX=((cw-ox)/zoom)+50,minY=-oy/zoom-50,maxY=(ch-oy)/zoom+50;
    for(const s of shrubs){if(s.x<minX||s.x>maxX||s.y<minY||s.y>maxY)continue;ctx.fillStyle='#263e2d8e';ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();}
    for(const t of trees){if(t.x<minX-50||t.x>maxX+50||t.y<minY-50||t.y>maxY+50)continue;
      // Hide foliage where a moveable city/POI currently stands.
      const covered=state.nodes.some(n=>{const d=TYPES[n.kind];return t.x>(n.c-.3)*CELL&&t.x<(n.c+d.w+.3)*CELL&&t.y>(n.r-.3)*CELL&&t.y<(n.r+d.h+.25)*CELL;});
      if(!covered)tree(t);
    }
    for(const p of ambientLights){if(p.x<minX||p.x>maxX||p.y<minY||p.y>maxY)continue;ctx.strokeStyle='#24312c';ctx.lineWidth=2.3;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x,p.y-18);ctx.stroke();ctx.fillStyle='#f6cc8c';ctx.beginPath();ctx.arc(p.x,p.y-19,3.2,0,Math.PI*2);ctx.fill();}
    // Sector boundaries similar in function to the reference but with distinct own style.
    ctx.setLineDash([17,12]);ctx.lineWidth=3;ctx.strokeStyle='#61b7c53b';
    for(const c of [16,32,48]){ctx.beginPath();ctx.moveTo(c*CELL,0);ctx.lineTo(c*CELL,HEIGHT);ctx.stroke();}
    for(const r of [16,32]){ctx.beginPath();ctx.moveTo(0,r*CELL);ctx.lineTo(WIDTH,r*CELL);ctx.stroke();}ctx.setLineDash([]);
  }
  
  function metrics(n){
    const d=TYPES[n.kind],x=(n.c+d.w/2)*CELL,y=(n.r+d.h)*CELL, w=d.w*CELL*d.scale*1.16,im=imgs[n.kind],h=im?w*im.height/im.width:w*(d.h>2?.76:.82);
    const anchor=d.anchorY??.89, topY=y-h*anchor+(d.offsetY||0), baseY=topY+h*anchor;
    return {d,x,y,w,h,im,topY,baseY,left:n.c*CELL,top:n.r*CELL,footW:d.w*CELL,footH:d.h*CELL};
  }
  function foundationPalette(kind){
    return {
      city:{fill1:'#67675d',fill2:'#4e4d46',edge:'#9d9274',front:'#262726',mark:'#c9b48b',detail:'#384044'},
      blackmarket:{fill1:'#5f5a53',fill2:'#403b35',edge:'#9f8257',front:'#231f1a',mark:'#d0a36d',detail:'#2f3437'},
      prison:{fill1:'#5a605f',fill2:'#404544',edge:'#8e9a95',front:'#202526',mark:'#bac3bf',detail:'#34413f'},
      port:{fill1:'#5e625f',fill2:'#424643',edge:'#8e968d',front:'#1e2f38',mark:'#c6b086',detail:'#41545a'},
      weapons:{fill1:'#63625f',fill2:'#444440',edge:'#9d8b62',front:'#282826',mark:'#cfbb6c',detail:'#394041'},
      jardin:{fill1:'#456247',fill2:'#2f4632',edge:'#86a071',front:'#223325',mark:'#9aba81',detail:'#3a5b41'},
      ilot:{fill1:'#5f604e',fill2:'#47483d',edge:'#aea36e',front:'#2a2f25',mark:'#dbcf9b',detail:'#4f523f'},
      portail:{fill1:'#63605a',fill2:'#46433e',edge:'#9a9079',front:'#262725',mark:'#d8c79d',detail:'#3f4546'},
    }[kind]||{fill1:'#5c5b55',fill2:'#43423d',edge:'#9c8f77',front:'#242422',mark:'#cab391',detail:'#3c4042'};
  }
  function post(x,y,h=12,c='#68726f'){ctx.strokeStyle=c;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-h);ctx.stroke();}
  function drawFoundation(n,valid){
    const m=metrics(n),p=foundationPalette(n.kind),padX=8,padY=10;
    const left=m.left+padX,top=m.top+padY,w=m.footW-padX*2,h=m.footH-padY*1.55,bottom=top+h;
    ctx.save();
    // broad ground shadow
    const sh=ctx.createRadialGradient(m.x,bottom-8,16,m.x,bottom-8,Math.max(w,h)*.72);sh.addColorStop(0,'#0000006d');sh.addColorStop(.58,'#00000026');sh.addColorStop(1,'#00000000');ctx.fillStyle=sh;ctx.beginPath();ctx.ellipse(m.x,bottom-8,w*.60,h*.24,0,0,Math.PI*2);ctx.fill();
    // main slab
    const g=ctx.createLinearGradient(0,top,0,bottom);g.addColorStop(0,p.fill1);g.addColorStop(1,p.fill2);ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(left,top,w,h,18);ctx.fill();
    ctx.strokeStyle=p.edge;ctx.lineWidth=2.2;ctx.stroke();
    // contact front lip
    ctx.fillStyle=p.front;ctx.beginPath();ctx.roundRect(left+6,bottom-12,w-12,10,5);ctx.fill();
    // thin illuminated top edge
    ctx.strokeStyle='#ffffff1a';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(left+14,top+9);ctx.lineTo(left+w-14,top+9);ctx.stroke();
    if(n.kind==='city'){
      ctx.fillStyle='#2f3335';ctx.fillRect(left+14,bottom-34,w-28,12);ctx.fillRect(left+w*.50-8,top+12,16,h-28);
      ctx.strokeStyle=p.mark;ctx.lineWidth=1.6;ctx.setLineDash([8,7]);ctx.beginPath();ctx.moveTo(left+w*.5,bottom-34);ctx.lineTo(left+w*.5,top+12);ctx.stroke();ctx.setLineDash([]);
      ctx.strokeStyle='#495053';ctx.lineWidth=2;ctx.strokeRect(left+16,top+16,w-32,h-44);
      for(let i=0;i<3;i++){ctx.fillStyle=i%2?'#6b775d':'#566551';ctx.beginPath();ctx.arc(left+26+i*22,top+26,6,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(left+w-26-i*22,top+26,6,0,Math.PI*2);ctx.fill();}
    } else if(n.kind==='blackmarket'){
      ctx.fillStyle='#31302d';ctx.fillRect(left+12,top+12,w-24,h-24);
      for(let i=0;i<2;i++){ctx.fillStyle=i?'#6f4e34':'#70482e';ctx.fillRect(left+18+i*(w*.42),top+18,w*.28,24);ctx.fillStyle=i?'#a17b4f':'#bb965e';ctx.fillRect(left+18+i*(w*.42),top+18,w*.28,8);}      
      ctx.strokeStyle=p.mark;ctx.lineWidth=1.3;ctx.setLineDash([5,5]);ctx.strokeRect(left+18,bottom-30,w-36,14);ctx.setLineDash([]);
      for(let i=0;i<4;i++){ctx.fillStyle='#8d704d';ctx.fillRect(left+18+i*18,bottom-26,11,9);}    
    } else if(n.kind==='weapons'){
      ctx.fillStyle='#3e403d';ctx.fillRect(left+12,top+12,w-24,h-24);
      ctx.strokeStyle=p.mark;ctx.lineWidth=1.5;ctx.setLineDash([6,4]);ctx.strokeRect(left+16,top+16,w-32,h-32);ctx.setLineDash([]);
      for(let i=0;i<3;i++){ctx.fillStyle='#6c5d3a';ctx.fillRect(left+18+i*21,top+22,14,14);}      
      ctx.fillStyle='#2a2f30';ctx.fillRect(left+w-52,bottom-34,34,14);
      ctx.fillStyle='#b98d38';for(let i=0;i<6;i++)ctx.fillRect(left+w-50+i*5,bottom-34,3,14);
    } else if(n.kind==='prison'){
      ctx.fillStyle='#3d4445';ctx.fillRect(left+14,top+14,w-28,h-28);
      ctx.strokeStyle='#7f8a84';ctx.lineWidth=2;ctx.strokeRect(left+18,top+18,w-36,h-36);
      for(const [px,py] of [[left+18,top+18],[left+w-18,top+18],[left+18,bottom-18],[left+w-18,bottom-18]]){ctx.fillStyle='#646e6b';ctx.fillRect(px-8,py-8,16,16);}
      for(let i=0;i<7;i++){post(left+24+i*(w-48)/6,top+18,10,'#93a29d');post(left+24+i*(w-48)/6,bottom-18,10,'#93a29d');}
      for(let i=0;i<5;i++){post(left+18,top+24+i*(h-48)/4,10,'#93a29d');post(left+w-18,top+24+i*(h-48)/4,10,'#93a29d');}
      ctx.strokeStyle='#b8b8b080';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(left+w*.28,top+24);ctx.lineTo(left+w*.28,bottom-24);ctx.stroke();
    } else if(n.kind==='port'){
      ctx.fillStyle='#4a4e4d';ctx.beginPath();ctx.roundRect(left+12,top+12,w-24,h-22,14);ctx.fill();
      ctx.fillStyle='#1f313d';ctx.fillRect(left+w-24,top+10,28,h-4);
      ctx.strokeStyle='#c6af86';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(left+18,bottom-24);ctx.lineTo(left+w-36,bottom-24);ctx.stroke();
      for(let i=0;i<5;i++){ctx.fillStyle='#3d2e1d';ctx.fillRect(left+w-18,top+18+i*22,8,10);ctx.fillStyle='#caa66c';ctx.fillRect(left+w-16,top+20+i*22,4,6);}      
      ctx.strokeStyle='#9dc5d1';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left+w+5,top+18);ctx.lineTo(left+w+14,top+24);ctx.moveTo(left+w+5,top+44);ctx.lineTo(left+w+15,top+52);ctx.stroke();
    } else if(n.kind==='portail'){
      ctx.fillStyle='#373737';ctx.fillRect(left+10,top+10,w-20,h-18);ctx.fillStyle='#69706f';ctx.fillRect(left+w*.24,top+10,8,h-18);ctx.fillRect(left+w*.76-8,top+10,8,h-18);
    } else if(n.kind==='jardin' || n.kind==='ilot'){
      const rg=ctx.createRadialGradient(m.x,m.y,10,m.x,m.y,w*.55);rg.addColorStop(0,p.fill1);rg.addColorStop(1,p.fill2);ctx.fillStyle=rg;ctx.beginPath();ctx.ellipse(m.x,m.y,w*.40,h*.38,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=p.edge;ctx.lineWidth=1.3;ctx.stroke();
    }
    // selected outline after foundation so it stays visible
    if(n.id===selected && !preview){ctx.strokeStyle=valid.ok?'#aef7d2':'#ff9b95';ctx.lineWidth=2.2;ctx.setLineDash([10,6]);ctx.strokeRect(m.left,m.top,m.footW,m.footH);ctx.setLineDash([]);}
    ctx.restore();
    return m;
  }
  function sprite(n){
    const valid=check(n),m=drawFoundation(n,valid),name=n.label||m.d.name;ctx.save();
    if(m.im){ctx.drawImage(m.im,m.x-m.w/2,m.topY,m.w,m.h);}else{ctx.fillStyle='#c2a16d';ctx.fillRect(m.x-m.w*.35,m.topY+m.h*.25,m.w*.7,m.h*.55);}
    // contact shadow directly under the visible facade
    ctx.fillStyle='#08121355';ctx.beginPath();ctx.ellipse(m.x,m.baseY-4,m.footW*(m.d.shadowScale||.55),Math.max(10,m.footH*.10),0,0,Math.PI*2);ctx.fill();
    if((labels||n.id===selected)&&n.kind!=='jardin'&&n.kind!=='ilot'&&n.kind!=='portail'){
      ctx.font='bold 21px system-ui';ctx.textAlign='center';const ww=Math.max(97,ctx.measureText(name).width+24);const yy=m.topY-19;
      ctx.fillStyle='#0a161cda';ctx.strokeStyle=n.kind==='city'?'#e6c58088':'#b9ae9099';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(m.x-ww/2,yy-25,ww,31,7);ctx.fill();ctx.stroke();ctx.fillStyle='#f9e0ab';ctx.fillText(name,m.x,yy-4);
    }
    ctx.restore();
  }
  function draw(){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#253b34';ctx.fillRect(0,0,cw,ch);
    ctx.save();ctx.translate(ox,oy);ctx.scale(zoom,zoom);drawTerrain();drawEdits();decorations();
    if(grid&&!preview){const bounds={l:Math.floor(-ox/zoom/CELL),t:Math.floor(-oy/zoom/CELL),r:Math.ceil((cw-ox)/zoom/CELL),b:Math.ceil((ch-oy)/zoom/CELL)};
      ctx.strokeStyle='#f5d58a45';ctx.lineWidth=1/zoom;for(let c=Math.max(0,bounds.l);c<Math.min(COLS,bounds.r);c++){ctx.beginPath();ctx.moveTo(c*CELL,0);ctx.lineTo(c*CELL,HEIGHT);ctx.stroke();}
      for(let r=Math.max(0,bounds.t);r<Math.min(ROWS,bounds.b);r++){ctx.beginPath();ctx.moveTo(0,r*CELL);ctx.lineTo(WIDTH,r*CELL);ctx.stroke();}}
    if(hover&&terrainTypes.has(tool)&&!preview){ctx.strokeStyle='#dfc289';ctx.lineWidth=2/zoom;ctx.strokeRect(hover.c*CELL,hover.r*CELL,CELL,CELL);}
    const nodes=state.nodes.slice().sort((a,b)=>(a.r+TYPES[a.kind].h)-(b.r+TYPES[b.kind].h));for(const n of nodes)sprite(n);
    ctx.restore();
    $('counts').textContent=state.nodes.length+' lieux · 64 × 48 · Région 1';$('zoomLabel').textContent=Math.round(zoom*100)+'%';
  }
  function render(){if(changed){draw();changed=false;}raf=requestAnimationFrame(render);}
  
  function picked(p){const q=toWorld(p),a=toCell(p);return state.nodes.slice().sort((u,v)=>(v.r+TYPES[v.kind].h)-(u.r+TYPES[u.kind].h)).find(n=>{
    const m=metrics(n);
    return (q.x>m.x-m.w*.44&&q.x<m.x+m.w*.44&&q.y>m.topY&&q.y<m.topY+m.h)||(a.r>=n.r&&a.r<n.r+m.d.h&&a.c>=n.c&&a.c<n.c+m.d.w);
  })||null;}
  function refreshInspector(){const n=state.nodes.find(n=>n.id===selected);$('inspector').hidden=!n;
    if(!n){$('selection').textContent='Clique sur une ville ou un lieu PvE pour le déplacer sur la région.';changed=true;return;}
    const d=TYPES[n.kind],v=check(n);$('selection').replaceChildren();const title=document.createElement('strong');title.textContent=n.label||d.name;const second=document.createElement('span');second.textContent=`Emprise ${d.w}×${d.h} (${d.w*d.h} cases) · R${n.r} / C${n.c}`;$('selection').append(title,second);
    $('footprintOutput').textContent=`${d.w} × ${d.h} — ${d.w*d.h} cases`;$('placementOutput').textContent=v.ok?'✓ '+v.msg:'✕ '+v.msg;$('placementOutput').dataset.valid=String(v.ok);changed=true;
  }
  function toolSet(t){tool=t;document.querySelectorAll('[data-tool]').forEach(b=>{const on=b.dataset.tool===t;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});}
  function paint(p){const a=toCell(p);if(!inRegion(a.r,a.c)||!terrainTypes.has(tool))return;const key=a.r+':'+a.c;if(terrainAt(a.r,a.c)===tool)return;
    if(state.nodes.some(n=>footprint(n).some(c=>c[0]===a.r&&c[1]===a.c))&&['road','water'].includes(tool)){status('Déplace le lieu avant de peindre cette zone','warning');return;}
    paintIndex.set(key,tool);state.paint=[...paintIndex.entries()].map(([k,kind])=>{const [r,c]=k.split(':').map(Number);return {r,c,kind};});if(state.paint.length>2000){state.paint.pop();updatePaint();}
    save();changed=true;
  }
  function down(e){if(e.button!==undefined&&e.button!==0)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);const p=screen(e);pointers.set(e.pointerId,p);
    if(pointers.size>1){gesture={type:'pinch',prev:[...pointers.values()]};return;}
    const n=tool==='move'||tool==='inspect'?picked(p):null;
    if(n){selected=n.id;refreshInspector();gesture={type:tool==='move'?'node':'pan',p,origR:n.r,origC:n.c,id:n.id,lastR:n.r,lastC:n.c,dirty:false};}
    else if(terrainTypes.has(tool)){snapshot();gesture={type:'paint'};paint(p);}
    else{gesture={type:'pan',p,delta:0};}
    changed=true;
  }
  function move(e){const p=screen(e),old=pointers.get(e.pointerId);hover=toCell(p);if(!old){changed=true;return;}pointers.set(e.pointerId,p);
    if(pointers.size===2){const [a,b]=[...pointers.values()];const oldPoints=gesture?.prev; if(oldPoints?.length===2){const prevDist=Math.hypot(oldPoints[0].x-oldPoints[1].x,oldPoints[0].y-oldPoints[1].y),nextDist=Math.hypot(a.x-b.x,a.y-b.y);const center={x:(a.x+b.x)/2,y:(a.y+b.y)/2};zoomAt(nextDist/(prevDist||1),center);}gesture={type:'pinch',prev:[a,b]};return;}
    if(!gesture)return;
    if(gesture.type==='pan'){ox+=p.x-old.x;oy+=p.y-old.y;gesture.delta=(gesture.delta||0)+Math.hypot(p.x-old.x,p.y-old.y);}
    else if(gesture.type==='paint')paint(p);
    else if(gesture.type==='node'){
      const n=state.nodes.find(n=>n.id===gesture.id);if(n){const delta=toWorld(p),from=toWorld(gesture.p);const d=TYPES[n.kind];
        const r=clamp(gesture.origR+Math.round((delta.y-from.y)/CELL),0,ROWS-d.h),c=clamp(gesture.origC+Math.round((delta.x-from.x)/CELL),0,COLS-d.w);
        if(n.r!==r||n.c!==c){n.r=r;n.c=c;gesture.dirty=true;if(check(n).ok){gesture.lastR=r;gesture.lastC=c;}refreshInspector();}
      }
    }changed=true;
  }
  function up(e){const total=pointers.size;pointers.delete(e.pointerId);if(total>1){gesture=null;return;}
    if(gesture?.type==='node'){const n=state.nodes.find(n=>n.id===gesture.id);if(n){const v=check(n);if(!v.ok){n.r=gesture.lastR;n.c=gesture.lastC;status('Placement refusé : '+v.msg,'warning');}
      else if(gesture.dirty){const old=JSON.parse(JSON.stringify(state));const orig=old.nodes.find(o=>o.id===n.id);orig.r=gesture.origR;orig.c=gesture.origC;undo.push(JSON.stringify(old));redo=[];status('✓ Emplacement enregistré dans le laboratoire');}
      refreshInspector();if(gesture.dirty)save();}}
    else if(gesture?.type==='pan'&&(gesture.delta||0)<8){selected=picked(screen(e))?.id||null;refreshInspector();}
    gesture=null;changed=true;
  }
  function add(kind){const d=TYPES[kind];if(!d)return;if(state.nodes.length>=90){status('Limite de 90 lieux expérimentaux','warning');return;}
    const n={id:'w10-'+kind+'-'+(++idIndex),kind,r:0,c:0};let found=null;
    // Prefer an available clearing close to current camera, then search the entire world.
    const mid=toCell({x:cw*.40,y:ch*.50});for(let radius=0;radius<Math.max(ROWS,COLS)&&!found;radius++)for(let dr=-radius;dr<=radius&&!found;dr++)for(let dc=-radius;dc<=radius;dc++){
      const r=clamp(mid.r+dr,0,ROWS-d.h),c=clamp(mid.c+dc,0,COLS-d.w);if(check(n,r,c).ok){found={r,c};break;}}
    if(!found){status('Aucun emplacement disponible','warning');return;}
    snapshot();Object.assign(n,found);state.nodes.push(n);selected=n.id;refreshInspector();save();toolSet('move');status('✓ '+d.name+' ajouté — déplace-le librement');
  }
  function nudge(dr,dc){const n=state.nodes.find(n=>n.id===selected);if(!n)return;const d=TYPES[n.kind],r=clamp(n.r+dr,0,ROWS-d.h),c=clamp(n.c+dc,0,COLS-d.w),v=check(n,r,c);if(!v.ok){status(v.msg,'warning');return;}snapshot();n.r=r;n.c=c;refreshInspector();save();}
  function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='crime-empire-world-v11-laboratoire.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),3500);}
  async function importData(file){if(!file)return;try{if(file.size>250000)throw Error('Fichier trop volumineux');const v=sanitize(JSON.parse(await file.text()));snapshot();state=v;updatePaint();selected=null;refreshInspector();save();changed=true;status('✓ Plan V11 importé');}catch(e){status('Import refusé : '+e.message,'error');}}
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);
  canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);gesture=null;changed=true;});canvas.addEventListener('lostpointercapture',e=>{pointers.delete(e.pointerId);if(!pointers.size)gesture=null;});
  canvas.addEventListener('wheel',e=>{e.preventDefault();zoomAt(e.deltaY>0?.87:1.14,screen(e));},{passive:false});
  document.querySelectorAll('[data-tool]').forEach(b=>b.addEventListener('click',()=>toolSet(b.dataset.tool)));
  document.querySelectorAll('[data-add]').forEach(b=>b.addEventListener('click',()=>add(b.dataset.add)));
  document.querySelectorAll('[data-nudge]').forEach(b=>b.addEventListener('click',()=>{const [r,c]=b.dataset.nudge.split(',').map(Number);nudge(r,c);}));
  $('removeNodeBtn').addEventListener('click',()=>{if(!selected)return;snapshot();state.nodes=state.nodes.filter(n=>n.id!==selected);selected=null;refreshInspector();save();changed=true;});
  $('previewBtn').addEventListener('click',()=>{preview=!preview;document.body.classList.toggle('preview-mode',preview);$('previewExitBtn').hidden=!preview;$('previewBtn').textContent=preview?'← Retour éditeur':'◈ Aperçu joueur';changed=true;});
  $('previewExitBtn').addEventListener('click',()=>$('previewBtn').click());
  $('gridBtn').addEventListener('click',()=>{grid=!grid;$('gridBtn').textContent='Grille : '+(grid?'visible':'masquée');changed=true;});
  $('labelsBtn').addEventListener('click',()=>{labels=!labels;$('labelsBtn').textContent='Noms : '+(labels?'visibles':'masqués');changed=true;});
  $('resetBtn').addEventListener('click',()=>{if(!confirm('Réinitialiser le laboratoire V11 ? Les joueurs Supabase ne sont pas concernés.'))return;snapshot();state=initial();updatePaint();selected=null;refreshInspector();save();cameraReset();status('✓ Région V11 réinitialisée');});
  $('exportBtn').addEventListener('click',exportData);$('importBtn').addEventListener('click',()=>$('importInput').click());
  $('importInput').addEventListener('change',e=>{void importData(e.target.files?.[0]);e.target.value='';});
  $('undoBtn').addEventListener('click',()=>restore(undo,redo));$('redoBtn').addEventListener('click',()=>restore(redo,undo));
  $('zoomIn').addEventListener('click',()=>zoomAt(1.20,{x:cw*.44,y:ch*.47}));$('zoomOut').addEventListener('click',()=>zoomAt(1/1.20,{x:cw*.44,y:ch*.47}));$('home').addEventListener('click',cameraReset);
  $('fitVilla').addEventListener('click',()=>{const n=state.nodes.find(n=>n.kind==='city');if(!n)return;zoom=.9;ox=cw*.42-(n.c+1)*CELL*zoom;oy=ch*.5-(n.r+1)*CELL*zoom;selected=n.id;refreshInspector();changed=true;});
  addEventListener('keydown',e=>{const tag=e.target?.tagName;if(['INPUT','TEXTAREA','SELECT'].includes(tag))return;
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();restore(undo,redo);}
    const a={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]};if(a[e.key]){e.preventDefault();nudge(...a[e.key]);}});
  addEventListener('resize',resize);
  toolSet('move');resize();refreshInspector();status('✓ WORLD MAP V11 · ancrage sol premium · fondations dédiées');
  raf=requestAnimationFrame(render);
  window.__CE_MODULAR_LAB__={getState:()=>JSON.parse(JSON.stringify(state)),getSelected:()=>selected,getAssets:()=>({ready:textureReady,failed:textureFailed}),check:(id,r,c)=>{const n=state.nodes.find(n=>n.id===id);return n?check(n,r,c):null;},add};
})();
