type Props = {
  onBack: () => void
}

export default function WorldMap({
  onBack,
}: Props) {
  return (
    <main className="relative h-full w-full overflow-hidden bg-black text-white">
      <img
        src="/world/world-map.jpg"
        alt="Carte du monde de Crime Empire"
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
        draggable={false}
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-black/5 to-black/75" />

      <header
        className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 px-3 sm:px-5"
        style={{
          paddingTop:
            "max(8px, env(safe-area-inset-top))",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-white/15 bg-black/75 px-4 py-2 text-sm font-black text-white shadow-xl backdrop-blur-xl transition hover:bg-zinc-900"
        >
          ← Retour à la ville
        </button>

        <div className="rounded-xl border border-red-500/25 bg-black/75 px-4 py-2 text-right shadow-xl backdrop-blur-xl">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-red-300">
            Opérations extérieures
          </p>

          <h1 className="text-lg font-black text-white">
            World Map
          </h1>
        </div>
      </header>

      <section className="absolute inset-x-3 bottom-3 z-20 mx-auto max-w-xl rounded-2xl border border-white/10 bg-zinc-950/88 p-4 shadow-2xl backdrop-blur-xl sm:bottom-5 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-red-500/25 bg-red-500/10 text-2xl">
            🌍
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-300">
              Première connexion établie
            </p>

            <h2 className="mt-1 text-lg font-black text-white">
              Carte extérieure
            </h2>

            <p className="mt-1 text-sm leading-relaxed text-zinc-400">
              L'hélicoptère relie maintenant ta ville à cet écran.
              Les premières cibles PvE et les opérations de combat
              seront ajoutées ici.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
