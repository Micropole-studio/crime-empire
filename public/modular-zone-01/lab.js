
(() => {
  'use strict';
  try {
  const status = document.getElementById('scene-status');
  const canvas = document.getElementById('scene');
  if (!canvas) throw new Error('Canvas du laboratoire absent');
  if (!status) throw new Error('Zone de diagnostic absente');
  const ctx = canvas.getContext('2d', { alpha:false });
  if (!ctx) {
    status.textContent = '❌ Canvas 2D indisponible dans ce navigateur';
    status.dataset.state = 'error';
    return;
  }
  const selection = document.getElementById('selection');
  const rows=9, cols=11, W=236, H=120;
  const assets = {};
  const file={concrete:'assets/concrete.webp',asphalt:'assets/asphalt.webp',grass:'assets/grass.webp',water:'assets/water.webp',villa:'assets/ville.webp',depot:'assets/depot.webp'};
  let failedTextures = 0;
  Object.entries(file).forEach(([key,url])=>{
    const im = new Image();
    im.onload = () => { assets[key] = im; dirty = true; };
    im.onerror = () => {
      failedTextures++;
      status.textContent = '⚠️ Texture manquante : ' + url + ' — le terrain de secours reste visible';
      status.dataset.state = 'warning';
      dirty = true;
    };
    im.src = url;
  });
  const base = Array.from({length:rows},(_,r)=>Array.from({length:cols},(_,c)=>{
    if(c>=9 && r>=5 || c>=10&&r>=2)return 'water';
    if(c===5||r===4)return 'road';
    if((r===2&&c===3)||(r===6&&c===7)||(r===2&&c===8)||(r===6&&c===2))return 'plot';
    return (r+c)%6===0?'grass':'concrete';
  }));
  let tiles=base.map(a=>a.slice()), tool='inspect', grid=false, dpr=1, cw=1,ch=1, zoom=0.9, ox=0,oy=0,dirty=true,last=0,focused=null, hovered=null;
  const nodes=[{kind:'ville', name:'Villa / Joueur', r:2,c:3,src:'villa',width:330,desc:'Ville joueur · Coordonnées indépendantes du terrain'},{kind:'pve',name:'Dépôt clandestin',r:6,c:7,src:'depot',width:340,desc:'Point d’intérêt PvE · Sprite et zone de sélection indépendants'}];
  const pointers=new Map();let drag=null;
  const local=(r,c)=>({x:(c-r)*W/2,y:(c+r)*H/2});
  const worldCenter=local((rows-1)/2,(cols-1)/2);
  function setCanvas(){
    const prevW=cw,prevH=ch;cw=canvas.clientWidth;ch=canvas.clientHeight;dpr=Math.min(window.devicePixelRatio||1,1.8);
    canvas.width=Math.round(cw*dpr);canvas.height=Math.round(ch*dpr);
    if(prevW<=1)resetCamera();else {ox+=(cw-prevW)/2;oy+=(ch-prevH)/2;}
    dirty=true;
  }
  function resetCamera(){zoom=Math.min(1.16,Math.max(.55,Math.min(cw/2550,ch/1190)*1.15));ox=cw*.46-worldCenter.x*zoom;oy=ch*.52-worldCenter.y*zoom;dirty=true;}
  function screenToTile(sx,sy){const x=(sx-ox)/zoom,y=(sy-oy)/zoom;const c=(x/(W/2)+y/(H/2))/2,r=(y/(H/2)-x/(W/2))/2;return {r:Math.round(r),c:Math.round(c)};}
  function valid(r,c){return r>=0&&r<rows&&c>=0&&c<cols;}
  function diamond(cx,cy){ctx.beginPath();ctx.moveTo(cx,cy-H/2);ctx.lineTo(cx+W/2,cy);ctx.lineTo(cx,cy+H/2);ctx.lineTo(cx-W/2,cy);ctx.closePath();}
  function tex(kind,x,y,w,h){
    if(assets[kind]){const p=ctx.createPattern(assets[kind],'repeat');ctx.fillStyle=p;
      ctx.save();ctx.translate(x-w/2,y-h/2);ctx.fillRect(0,0,w,h);ctx.restore();}
    else{ctx.fillStyle=kind==='water'?'#124057':kind==='grass'?'#38493e':kind==='asphalt'?'#282d30':'#575854';ctx.fillRect(x-w/2,y-h/2,w,h);}
  }
  function poly(points,fill,stroke){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
  function glow(x,y,r,color){let grad=ctx.createRadialGradient(x,y,0,x,y,r);grad.addColorStop(0,color);grad.addColorStop(1,'#e7a54c00');ctx.fillStyle=grad;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
  function drawTile(r,c,t,ms){const p=local(r,c),x=p.x,y=p.y;
    diamond(x,y);ctx.save();ctx.clip();tex(t==='road'?'asphalt':t==='plot'?'concrete':t,x,y,W,H);
    if(t==='road'){
      ctx.lineWidth=1.8;ctx.strokeStyle='#d2b36e6e';ctx.beginPath();ctx.moveTo(x-89,y-50);ctx.lineTo(x+89,y+50);ctx.stroke();
      ctx.beginPath();ctx.moveTo(x-89,y+50);ctx.lineTo(x+89,y-50);ctx.stroke();
      // route continue suivant les chemins transversaux
      ctx.lineWidth=1.2;ctx.strokeStyle='#e3ce8c62';ctx.setLineDash([13,13]);
      if(c===5){ctx.beginPath();ctx.moveTo(x+W/4,y-H/4);ctx.lineTo(x-W/4,y+H/4);ctx.stroke()}
      else{ctx.beginPath();ctx.moveTo(x-W/4,y-H/4);ctx.lineTo(x+W/4,y+H/4);ctx.stroke()}
      ctx.setLineDash([]);
    }
    if(t==='plot'){
      ctx.lineWidth=2;ctx.strokeStyle='#d9c08f79';ctx.beginPath();ctx.moveTo(x,y-H/2+9);ctx.lineTo(x+W/2-16,y);ctx.lineTo(x,y+H/2-9);ctx.lineTo(x-W/2+16,y);ctx.closePath();ctx.stroke();
      ctx.strokeStyle='#dcb77822';ctx.lineWidth=6;ctx.stroke();
      [[-44,-8],[44,-8],[-44,10],[44,10]].forEach(([dx,dy])=>{ctx.fillStyle='#c0a46c';ctx.fillRect(x+dx-1,y+dy-1,2,2)});
    }
    if(t==='water'){
      for(let i=0;i<7;i++){const vx=x-95+i*31+(Math.sin(ms*.0006+i+r*.9+c)*4),vy=y-28+i*7;
        ctx.strokeStyle=i%2?'#a3d4d230':'#89bad74b';ctx.lineWidth=1.25;ctx.beginPath();ctx.moveTo(vx,vy);ctx.quadraticCurveTo(vx+14,vy-4,vx+27,vy-1);ctx.stroke();}
    }
    if(t==='grass'){
      for(let i=0;i<9;i++){const xx=x-74+((i*39+r*11+c*7)%152),yy=y-36+((i*13+c*19)%69);
        ctx.fillStyle='#233e34a0';ctx.beginPath();ctx.arc(xx,yy,2.5,0,Math.PI*2);ctx.fill();}
    }
    ctx.restore();
    ctx.strokeStyle=t==='water'?'#6ba2b42b':'#d0ba9140';ctx.lineWidth=.9;diamond(x,y);ctx.stroke();
    if(grid){ctx.strokeStyle='#f5d18db8';ctx.lineWidth=1.1;diamond(x,y);ctx.stroke();ctx.fillStyle='#e7ca91';ctx.font='10px system-ui';ctx.textAlign='center';ctx.fillText(`${r}:${c}`,x,y+4)}
    if(hovered && hovered.r===r&&hovered.c===c){ctx.strokeStyle='#e5bd67';ctx.lineWidth=2.5;diamond(x,y);ctx.stroke()}
  }
  function drawNode(node,ms){const {x,y}=local(node.r,node.c), img=assets[node.src],active=focused&&focused.kind===node.kind;const w=node.width,h=img?w*img.height/img.width:w*.75;
    // paved foundation and contact shadow, sitting under the building's footprint
    poly([[x,y-27],[x+91,y-1],[x,y+31],[x-91,y-1]],'#333637','#e1ba7463');
    ctx.fillStyle='#070b0dbd';ctx.beginPath();ctx.ellipse(x,y+5,w*.30,16,0,0,Math.PI*2);ctx.fill();
    glow(x-35,y-7,31,'#f4bb585a');glow(x+50,y-3,26,'#f6b3655a');
    if(img)ctx.drawImage(img,x-w/2,y-h+17,w,h);else{ctx.fillStyle='#b7a07c';ctx.fillRect(x-w*.3,y-h*.6,w*.6,h*.4)}
    const by=y-h+17;
    if(active){ctx.strokeStyle='#edc77b';ctx.lineWidth=2;ctx.setLineDash([6,5]);ctx.strokeRect(x-w/2,by,w,h);ctx.setLineDash([])}
    ctx.font='600 13px system-ui';ctx.textAlign='center';const title=node.name;const tw=ctx.measureText(title).width+40;const tagY=by-6;
    ctx.fillStyle='#0b161ff0';ctx.strokeStyle='#dcb673a8';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(x-tw/2,tagY-23,tw,27,5);ctx.fill();ctx.stroke();ctx.fillStyle='#f2dcae';ctx.fillText(title,x,tagY-5);
    return {x1:x-w/2,y1:by,x2:x+w/2,y2:by+h,node};
  }
  function render(ms){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#111f2b';ctx.fillRect(0,0,cw,ch);
    const back=ctx.createLinearGradient(0,0,0,ch);back.addColorStop(0,'#233440');back.addColorStop(.48,'#253238');back.addColorStop(1,'#081621');ctx.fillStyle=back;ctx.fillRect(0,0,cw,ch);
    ctx.save();ctx.translate(ox,oy);ctx.scale(zoom,zoom);
    const ordered=[];for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)ordered.push({r,c});ordered.sort((a,b)=>(a.r+a.c)-(b.r+b.c));
    for(const v of ordered)drawTile(v.r,v.c,tiles[v.r][v.c],ms);
    for(const v of ordered){const {r,c}=v;if((r+c)%5===0&&tiles[r][c]==='concrete'){
      let p=local(r,c);ctx.fillStyle='#23392f';ctx.beginPath();ctx.ellipse(p.x,p.y,11,6,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#152d25';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x,p.y-22);ctx.stroke();ctx.fillStyle='#4e6850';for(let k=0;k<5;k++){ctx.beginPath();ctx.ellipse(p.x+Math.cos(k*1.25)*8,p.y-24+Math.sin(k*1.25)*3,8,3,k*1.25,0,7);ctx.fill()}
    }}
    nodes.sort((a,b)=>local(a.r,a.c).y-local(b.r,b.c).y).forEach(node=>drawNode(node,ms));
    ctx.restore();
    if(tool!=='inspect'){ctx.fillStyle='#edc779';ctx.font='11px system-ui';ctx.textAlign='left';ctx.fillText(`MODE ÉDITION : ${tool.toUpperCase()}`,20,Math.max(82,ch-70));}
  }
  let firstFrame = true;
  function loop(ms){
    if(dirty||ms-last>40){
      try {
        render(ms);
        if (firstFrame) {
          firstFrame = false;
          if (status.dataset.state !== 'warning') {
            status.textContent = '✅ Carte modulaire active';
            status.dataset.state = 'ready';
          }
        }
      } catch(error) {
        status.textContent = '❌ Erreur de rendu : ' + (error?.message || String(error));
        status.dataset.state = 'error';
        console.error('[Crime Empire zone modulaire]', error);
        return;
      }
      last=ms; dirty=false;
    }
    requestAnimationFrame(loop);
  }
  const canvasPos=e=>{const rect=canvas.getBoundingClientRect();return{x:e.clientX-rect.left,y:e.clientY-rect.top}};
  canvas.addEventListener('pointerdown',e=>{const p=canvasPos(e);canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,p);drag={sx:p.x,sy:p.y,ox,oy,moved:false};});
  canvas.addEventListener('pointermove',e=>{const p=canvasPos(e);if(pointers.has(e.pointerId)){const old=pointers.get(e.pointerId);pointers.set(e.pointerId,p);if(pointers.size===1&&drag){ox+=p.x-old.x;oy+=p.y-old.y;drag.moved ||= Math.hypot(p.x-drag.sx,p.y-drag.sy)>7;}
    if(pointers.size===2){const points=Array.from(pointers.values()),dist=Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y);if(drag.prevDist)zoom=Math.min(2.1,Math.max(.35,zoom*dist/drag.prevDist));drag.prevDist=dist;drag.moved=true;}
  }else{hovered=screenToTile(p.x,p.y);if(!valid(hovered.r,hovered.c))hovered=null;}dirty=true;});
  canvas.addEventListener('pointerup',e=>{const p=canvasPos(e);const wasMoved=drag?.moved;pointers.delete(e.pointerId);if(!pointers.size){if(!wasMoved){const hit=screenToTile(p.x,p.y);if(valid(hit.r,hit.c)){
      if(tool!=='inspect' && !nodes.some(n=>n.r===hit.r&&n.c===hit.c)){tiles[hit.r][hit.c]=tool;selection.innerHTML=`<b>Parcelle ${hit.r}:${hit.c}</b><br>Revêtement : ${tool}. Cette modification est uniquement une démonstration locale.`;}
      else{const n=nodes.find(n=>Math.abs(n.c-hit.c)<=1&&Math.abs(n.r-hit.r)<=1);focused=n||null;selection.innerHTML=n?`<b>${n.name}</b><br>${n.desc}<br>Case : ${n.r}:${n.c}`:`<b>Parcelle ${hit.r}:${hit.c}</b><br>Type : ${tiles[hit.r][hit.c]} · coordonnées modifiables indépendamment`;}
  }}drag=null;}dirty=true;});
  canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);drag=null;dirty=true;});
  canvas.addEventListener('wheel',e=>{e.preventDefault();const p=canvasPos(e),oldZoom=zoom;zoom=Math.max(.35,Math.min(2.1,zoom*(e.deltaY>0?.9:1.1)));ox=p.x-(p.x-ox)*zoom/oldZoom;oy=p.y-(p.y-oy)*zoom/oldZoom;dirty=true;},{passive:false});
  document.querySelectorAll('.tile').forEach(btn=>btn.addEventListener('click',()=>{tool=btn.dataset.tool;document.querySelectorAll('.tile').forEach(t=>t.classList.toggle('active',t===btn));dirty=true;}));
  document.getElementById('gridBtn').addEventListener('click',()=>{grid=!grid;document.getElementById('gridBtn').textContent='Grille : '+(grid?'oui':'non');dirty=true;});
  document.getElementById('resetBtn').addEventListener('click',()=>{tiles=base.map(row=>row.slice());focused=null;selection.textContent='Carte réinitialisée. Aucune sauvegarde Supabase effectuée.';resetCamera();});
  function zoomAround(mult){const x=cw*.43,y=ch*.5,old=zoom;zoom=Math.min(2.1,Math.max(.35,zoom*mult));ox=x-(x-ox)*zoom/old;oy=y-(y-oy)*zoom/old;dirty=true;}
  document.getElementById('zoomIn').onclick=()=>zoomAround(1.17);document.getElementById('zoomOut').onclick=()=>zoomAround(1/1.17);document.getElementById('home').onclick=resetCamera;
  window.addEventListener('resize',setCanvas);setCanvas();requestAnimationFrame(loop);
  } catch(error) {
    const status = document.getElementById('scene-status');
    if (status) {
      status.textContent = '❌ Initialisation impossible : ' + (error?.message || String(error));
      status.dataset.state = 'error';
    }
    console.error('[Crime Empire zone modulaire : initialisation]', error);
  }
})();
