import { useEffect, useRef } from "react"

/**
 * Mer Premium — même technique Canvas 2D que la démonstration HTML.
 * Indépendante de PixiJS et du mode de rendu (Pixi ou DOM classique).
 * Calque transparent, sans interaction, limité au rectangle marin.
 * Aucun accès au jeu, à l'éditeur ou à Supabase.
 */
const MAP_WIDTH = 1536
const MAP_HEIGHT = 1024
const CROP = { x: 800, y: 440, width: 736, height: 584 }
const FRAME_COUNT = 16
const FRAME_URL = (i: number) =>
  `/game-assets/sea-premium/${String(i).padStart(2, "0")}.webp`

type Status = "loading" | "active" | "partial" | "fallback" | "paused" | "unavailable"

type Wave = {
  x: number
  y: number
  length: number
  gold: boolean
  glint: boolean
  phase: number
  speed: number
  amplitude: number
  alpha: number
  scaleWave: number
}

type Props = {
  onStatus?: (status: Status) => void
}

const WATER_AREAS = [
  { x: 1002, y: 953, halfW: 112, halfH: 38, number: 20 },
  { x: 1188, y: 973, halfW: 100, halfH: 31, number: 18 },
  { x: 1376, y: 977, halfW: 116, halfH: 32, number: 24 },
  { x: 1511, y: 612, halfW: 17, halfH: 95, number: 9 },
  { x: 1228, y: 862, halfW: 45, halfH: 34, number: 9 },
  { x: 858, y: 1002, halfW: 55, halfH: 16, number: 7 },
] as const

function createWaves(): Wave[] {
  let seed = 0x5a17d2c7
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
  const waves: Wave[] = []
  for (let areaIndex = 0; areaIndex < WATER_AREAS.length; areaIndex++) {
    const area = WATER_AREAS[areaIndex]
    for (let i = 0; i < area.number; i++) {
      waves.push({
        x: area.x + (random() * 2 - 1) * area.halfW,
        y: area.y + (random() * 2 - 1) * area.halfH,
        length: 18 + random() * (areaIndex === 3 ? 19 : 45),
        gold: random() > 0.75,
        glint: false,
        phase: random() * Math.PI * 2,
        speed: 0.62 + random() * 0.62,
        amplitude: 5 + random() * 13,
        alpha: 0.36 + random() * 0.24,
        scaleWave: 0.8 + random() * 0.45,
      })
    }
  }
  for (const [x, y, gold] of [
    [1200, 895, true], [1225, 921, false], [1262, 937, false],
    [1303, 943, true], [1390, 944, true], [1444, 947, false],
    [1492, 984, false], [1150, 965, true], [1030, 985, false],
  ] as const) {
    waves.push({
      x, y, gold, glint: true, length: 24,
      phase: random() * Math.PI * 2,
      speed: 0.88 + random() * 0.45,
      amplitude: 10 + random() * 7,
      alpha: 0.6, scaleWave: 1,
    })
  }
  return waves
}

export default function SeaCanvasOverlay({ onStatus }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d", { alpha: true })
    if (!canvas || !ctx) {
      onStatus?.("unavailable")
      return
    }

    let disposed = false
    let frameRequest = 0
    let lastPainted = 0
    let seconds = 0
    const images: (HTMLImageElement | null)[] = Array(FRAME_COUNT).fill(null)
    const waves = createWaves()
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
    let loadedCount = 0
    let errorCount = 0

    onStatus?.(reduceMotion ? "paused" : "loading")
    const report = () => {
      if (disposed || reduceMotion) return
      if (loadedCount + errorCount === FRAME_COUNT) {
        onStatus?.(loadedCount === 0 ? "fallback" : errorCount > 0 ? "partial" : "active")
      }
    }

    for (let i = 0; i < FRAME_COUNT; i++) {
      const image = new Image()
      image.onload = () => { images[i] = image; loadedCount++; if (reduceMotion) paint(0); report() }
      image.onerror = () => { errorCount++; report() }
      image.src = FRAME_URL(i)
    }

    const paint = (time: number) => {
      ctx.clearRect(0, 0, CROP.width, CROP.height)
      const currentIndex = Math.floor(time * 8) % FRAME_COUNT
      const frame = images[currentIndex] ?? images.find((img) => img !== null)
      if (frame) ctx.drawImage(frame, 0, 0, CROP.width, CROP.height)

      for (const wave of waves) {
        const phase = time * wave.speed + wave.phase
        const x = wave.x - CROP.x + Math.sin(phase) * wave.amplitude
        const y = wave.y - CROP.y + Math.cos(phase * 0.78) * 3.5
        const scale = 0.92 + Math.sin(phase * 0.85) * 0.22 * wave.scaleWave
        const alpha = wave.alpha * (0.7 + 0.3 * Math.sin(phase * 1.37 + 1))

        ctx.save()
        ctx.translate(x, y)
        ctx.scale(scale, 1)
        ctx.globalAlpha = alpha
        if (wave.glint) {
          ctx.fillStyle = wave.gold ? "#ffdfa1" : "#c5f5ff"
          ctx.beginPath()
          ctx.ellipse(0, 0, 12, 2, 0, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.fillStyle = wave.gold ? "rgba(227,173,94,.16)" : "rgba(61,188,207,.16)"
          ctx.beginPath()
          ctx.ellipse(0, 2, wave.length * 0.65, 5, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = wave.gold ? "#ffda91" : "#b0f6ff"
          ctx.lineWidth = 2.75
          ctx.beginPath()
          ctx.moveTo(-wave.length / 2, 0)
          ctx.quadraticCurveTo(-wave.length * 0.2, -4.2, 0, -1)
          ctx.quadraticCurveTo(wave.length * 0.24, 2.1, wave.length / 2, -0.3)
          ctx.stroke()
          ctx.strokeStyle = wave.gold ? "rgba(234,187,112,.75)" : "rgba(64,201,218,.75)"
          ctx.lineWidth = 1.15
          ctx.beginPath()
          ctx.moveTo(-wave.length * 0.22, 6)
          ctx.quadraticCurveTo(0, 3, wave.length * 0.25, 5)
          ctx.stroke()
        }
        ctx.restore()
      }
    }

    const animate = (now: number) => {
      // 30 ips maximum : conserve le rendu sans solliciter le GPU mobile inutilement.
      if (!lastPainted || now - lastPainted >= 1000 / 30) {
        if (lastPainted) seconds += Math.min(0.1, (now - lastPainted) / 1000)
        lastPainted = now
        if (document.visibilityState !== "hidden") paint(reduceMotion ? 0 : seconds)
      }
      frameRequest = window.requestAnimationFrame(animate)
    }
    if (reduceMotion) {
      paint(0)
      // Les onload redessinent ensuite la première image immobile.
    } else {
      frameRequest = window.requestAnimationFrame(animate)
    }

    return () => {
      disposed = true
      window.cancelAnimationFrame(frameRequest)
    }
  }, [onStatus])

  return (
    <canvas
      ref={canvasRef}
      width={CROP.width}
      height={CROP.height}
      aria-hidden="true"
      className="pointer-events-none absolute select-none"
      style={{
        left: `${(CROP.x / MAP_WIDTH) * 100}%`,
        top: `${(CROP.y / MAP_HEIGHT) * 100}%`,
        width: `${(CROP.width / MAP_WIDTH) * 100}%`,
        height: `${(CROP.height / MAP_HEIGHT) * 100}%`,
        zIndex: 1,
      }}
    />
  )
}
