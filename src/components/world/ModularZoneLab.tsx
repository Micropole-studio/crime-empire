// Le prototype est servi comme une page statique Vite/Vercel.
// Contrairement à srcDoc, il ne dépend pas de scripts inline bloqués par la CSP.
// Le sandbox sépare les données du jeu de cette démo purement graphique.
type Props = { onBack: () => void }

export default function ModularZoneLab({ onBack }: Props) {
  return (
    <section className="absolute inset-0 z-[9100] bg-[#0a1119]">
      <iframe
        title="Crime Empire — Laboratoire de carte modulaire 01"
        src="/modular-zone-01/index.html?v=3"
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
        className="absolute inset-0 h-full w-full border-0"
      />
      <button
        type="button"
        onClick={onBack}
        aria-label="Retour à la carte du monde"
        className="absolute left-3 top-[max(6px,env(safe-area-inset-top))] z-20 rounded-xl border border-amber-300/70 bg-zinc-950/95 px-4 py-3 text-xs font-black text-amber-100 shadow-xl transition hover:bg-zinc-800 sm:left-auto sm:right-3"
      >
        ← Retour à la world map
      </button>
    </section>
  )
}
