import { useEffect, useRef, useState } from "react";
import {
  loadPublishedV16Scene,parseV16Scene,publishV16Scene,
} from "../../services/worldVisualSceneService";

const LAB_KEY="crime-empire-world-v16-reference-edit";
const MAX_STATE_BYTES=220_000;
type LabMessage={type?:string;payload?:unknown;requestId?:unknown};
type Props={onBack:()=>void};

/** Le parent React est autorisé à accéder à Supabase; l'iframe ne l'est jamais. */
export default function ModularZoneLab({onBack}:Props){
  const iframeRef=useRef<HTMLIFrameElement|null>(null);
  const pendingRef=useRef<null|{id:string;resolve:(s:string)=>void;reject:(e:Error)=>void;timeout:number}>(null);
  const [publishing,setPublishing]=useState(false);
  const [status,setStatus]=useState("Brouillon local : non publié");
  const [revision,setRevision]=useState<number|null>(null);
  useEffect(()=>{
    let active=true;
    loadPublishedV16Scene().then(v=>{
      if(!active)return;
      setRevision(v?.revision??0);
      if(v)setStatus(`Région publiée · révision ${v.revision}`);
    }).catch(e=>{if(active)setStatus(String(e.message)+" · vérifie le SQL de publication");});
    return ()=>{active=false;};
  },[]);
  useEffect(()=>{
    const handle=(event:MessageEvent<LabMessage>)=>{
      if(!iframeRef.current||event.source!==iframeRef.current.contentWindow)return;
      const msg=event.data;
      if(!msg||typeof msg!=="object")return;
      if(msg.type==="crime-empire:lab:load"){
        let payload:string|null=null;
        try{payload=window.localStorage.getItem(LAB_KEY);}catch{/* sandbox */}
        iframeRef.current.contentWindow?.postMessage({type:"crime-empire:lab:loaded",payload},"*");
      }else if(msg.type==="crime-empire:lab:save"&&typeof msg.payload==="string"&&msg.payload.length<MAX_STATE_BYTES){
        try{window.localStorage.setItem(LAB_KEY,msg.payload);}catch{/* quota */}
      }else if(msg.type==="crime-empire:lab:snapshot"&&typeof msg.payload==="string"&&
        typeof msg.requestId==="string"&&msg.payload.length<MAX_STATE_BYTES){
        const pending=pendingRef.current;
        if(pending&&pending.id===msg.requestId){
          window.clearTimeout(pending.timeout);pendingRef.current=null;pending.resolve(msg.payload);
        }
      }
    };
    window.addEventListener("message",handle);
    return ()=>{
      window.removeEventListener("message",handle);
      if(pendingRef.current){window.clearTimeout(pendingRef.current.timeout);
        pendingRef.current.reject(Error("Éditeur fermé"));pendingRef.current=null;}
    };
  },[]);
  function requestSnapshot():Promise<string>{
    return new Promise((resolve,reject)=>{
      if(pendingRef.current)return reject(Error("Une publication est déjà en cours"));
      const id=`v16-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      const timeout=window.setTimeout(()=>{
        pendingRef.current=null;reject(Error("L'éditeur ne répond pas. Recharge la page."));
      },4000);
      pendingRef.current={id,resolve,reject,timeout};
      iframeRef.current?.contentWindow?.postMessage({type:"crime-empire:lab:snapshot-request",requestId:id},"*");
    });
  }
  async function publish(){
    if(publishing)return;
    if(!window.confirm("PUBLIER cette région pour tous les joueurs ? Les routes et positions PvE seront mises à jour. Les positions des joueurs resteront inchangées."))return;
    setPublishing(true);setStatus("Validation et publication en cours…");
    try{
      const draft=await requestSnapshot();
      const parsed=parseV16Scene(draft);
      const latest=await loadPublishedV16Scene();
      // Verrouillage si une autre publication est apparue depuis l'ouverture du labo.
      if(revision!==null&&latest!==null&&latest.revision!==revision)throw Error("Nouvelle version publiée ailleurs : actualise avant de remplacer");
      const updated=await publishV16Scene(parsed,latest?.revision??0);
      setRevision(updated);
      setStatus(`✓ Région 1 publiée · révision ${updated}. Les joueurs verront la version après actualisation.`);
    }catch(e){setStatus(`Publication refusée : ${e instanceof Error?e.message:String(e)}`);}
    finally{setPublishing(false);}
  }
  return <section className="absolute inset-0 z-[9100] bg-[#0a1119]">
    <iframe ref={iframeRef} title="Crime Empire — Éditeur World Map V16"
      src="/modular-zone-01/index.html?v=16-4" sandbox="allow-scripts"
      referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full border-0" />
    <div className="absolute right-3 top-[max(6px,env(safe-area-inset-top))] z-20 flex flex-wrap justify-end gap-2">
      <button type="button" disabled={publishing} onClick={()=>{void publish();}}
        className="rounded-xl border border-amber-300 bg-zinc-950/95 px-3 py-3 text-xs font-black text-amber-100 disabled:opacity-60">
        {publishing?"Publication…":"✓ Publier la région"}
      </button>
      <button type="button" onClick={onBack}
        className="rounded-xl border border-zinc-500 bg-zinc-950/95 px-3 py-3 text-xs font-black text-zinc-100">← Retour au monde</button>
    </div>
    <div role="status" aria-live="polite" data-world-interactive
      className="absolute bottom-3 left-3 z-30 max-w-[min(95vw,550px)] rounded-xl border border-amber-400/40 bg-zinc-950/95 px-3 py-2 text-xs text-amber-100">
      {status}
    </div>
  </section>;
}
