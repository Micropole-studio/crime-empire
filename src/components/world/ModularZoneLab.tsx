import { useEffect, useRef } from "react"

// Le laboratoire est fictif et reste isolé de la session Supabase.
// Le parent n'autorise qu'une clé dédiée au brouillon du laboratoire.
const LAB_KEY = "crime-empire-world-map-v10-lab"
const MAX_STATE_BYTES = 250_000

type LabMessage = { type?: string; payload?: unknown }
type Props = { onBack: () => void }

export default function ModularZoneLab({ onBack }: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  useEffect(() => {
    const handleMessage = (event: MessageEvent<LabMessage>) => {
      // En iframe sandbox sans allow-same-origin, event.origin = "null".
      // On vérifie la fenêtre émettrice, pas une origine falsifiable.
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return
      const message = event.data
      if (!message || typeof message !== "object") return

      if (message.type === "crime-empire:lab:load") {
        let payload: string | null = null
        try { payload = window.localStorage.getItem(LAB_KEY) } catch { /* mode privé */ }
        iframeRef.current.contentWindow?.postMessage({
          type: "crime-empire:lab:loaded", payload,
        }, "*") // Obligatoire avec une iframe d'origine opaque.
      }

      if (message.type === "crime-empire:lab:save" && typeof message.payload === "string" && message.payload.length < MAX_STATE_BYTES) {
        try { window.localStorage.setItem(LAB_KEY, message.payload) } catch { /* quota privé */ }
      }
    }
    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [])

  return (
    <section className="absolute inset-0 z-[9100] bg-[#0a1119]">
      <iframe
        ref={iframeRef}
        title="Crime Empire — Laboratoire World Map V10"
        src="/modular-zone-01/index.html?v=10"
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
        className="absolute inset-0 h-full w-full border-0"
      />
      <div className="absolute left-3 top-[max(6px,env(safe-area-inset-top))] z-20 flex gap-2 sm:left-auto sm:right-3">
        <a
          href="/modular-zone-01/index.html?v=10"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl border border-zinc-500 bg-zinc-950/95 px-3 py-3 text-xs font-bold text-zinc-100 shadow-xl hover:bg-zinc-800"
          title="Ouvrir le laboratoire directement pour les tests indépendants"
        >
          Plein écran ↗
        </a>
        <button
          type="button"
          onClick={onBack}
          aria-label="Retour à la carte du monde"
          className="rounded-xl border border-amber-300/70 bg-zinc-950/95 px-4 py-3 text-xs font-black text-amber-100 shadow-xl transition hover:bg-zinc-800"
        >
          ← Retour au monde
        </button>
      </div>
    </section>
  )
}
