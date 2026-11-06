import { useEffect, useRef } from "react";

// Prototype indépendant de Supabase. Iframe à origine opaque ; sauvegarde côté parent.
const LAB_KEY = "crime-empire-world-v16-reference-edit";
const MAX_STATE_BYTES = 200_000;
type LabMessage = { type?: string; payload?: unknown };
type Props = { onBack: () => void };

export default function ModularZoneLab({ onBack }: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  useEffect(() => {
    const handleMessage = (event: MessageEvent<LabMessage>) => {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      const msg = event.data;
      if (!msg || typeof msg !== "object") return;
      if (msg.type === "crime-empire:lab:load") {
        let payload: string | null = null;
        try { payload = window.localStorage.getItem(LAB_KEY); } catch { /* stockage indisponible */ }
        iframeRef.current.contentWindow?.postMessage({ type: "crime-empire:lab:loaded", payload }, "*");
      }
      if (msg.type === "crime-empire:lab:save" && typeof msg.payload === "string" && msg.payload.length < MAX_STATE_BYTES) {
        try { window.localStorage.setItem(LAB_KEY, msg.payload); } catch { /* quota */ }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);
  return (
    <section className="absolute inset-0 z-[9100] bg-[#0a1119]">
      <iframe ref={iframeRef} title="Crime Empire — Laboratoire World Map V16"
        src="/modular-zone-01/index.html?v=16" sandbox="allow-scripts"
        referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full border-0" />
      <div className="absolute left-3 top-[max(6px,env(safe-area-inset-top))] z-20 flex gap-2 sm:left-auto sm:right-3">
        <a href="/modular-zone-01/index.html?v=16" target="_blank" rel="noopener noreferrer"
          className="rounded-xl border border-zinc-500 bg-zinc-950/95 px-3 py-3 text-xs font-bold text-zinc-100 shadow-xl">Plein écran ↗</a>
        <button type="button" onClick={onBack}
          className="rounded-xl border border-amber-300/70 bg-zinc-950/95 px-4 py-3 text-xs font-black text-amber-100 shadow-xl">← Retour au monde</button>
      </div>
    </section>
  );
}
