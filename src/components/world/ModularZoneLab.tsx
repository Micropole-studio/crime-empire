import { useMemo } from "react"

// Démonstration HTML/Canvas 2D confinée dans une iframe isolée.
// Le code et les textures sont fournis par Vite, sans route publique dédiée.
import prototypeHtml from "../../modular-zone-01/index.html?raw"
import asphaltUrl from "../../modular-zone-01/assets/asphalt.webp?url"
import concreteUrl from "../../modular-zone-01/assets/concrete.webp?url"
import grassUrl from "../../modular-zone-01/assets/grass.webp?url"
import waterUrl from "../../modular-zone-01/assets/water.webp?url"
import villaUrl from "../../modular-zone-01/assets/ville.webp?url"
import depotUrl from "../../modular-zone-01/assets/depot.webp?url"

type Props = { onBack: () => void }

const spriteUrls: Record<string, string> = {
  "asphalt.webp": asphaltUrl,
  "concrete.webp": concreteUrl,
  "grass.webp": grassUrl,
  "water.webp": waterUrl,
  "ville.webp": villaUrl,
  "depot.webp": depotUrl,
}

export default function ModularZoneLab({ onBack }: Props) {
  const document = useMemo(() => {
    let result = prototypeHtml
    for (const [filename, url] of Object.entries(spriteUrls)) {
      // Les chemins sont intégrés à l'HTML avant l'exécution du script du prototype.
      result = result.replaceAll(`assets/${filename}`, url)
    }
    return result
  }, [])

  return (
    <section className="absolute inset-0 z-[9100] bg-[#0a1119]">
      <iframe
        title="Crime Empire — Laboratoire de carte modulaire 01"
        srcDoc={document}
        // Aucun accès au DOM du jeu, au stockage, ni aux sessions Supabase.
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
