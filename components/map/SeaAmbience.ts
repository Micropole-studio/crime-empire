import { Container, Graphics } from "pixi.js"

/**
 * Crime Empire — mer premium V2.2
 *
 * Contrairement à la V2.1 (24 filets d'alpha <= 0.2 qui étaient quasi invisibles),
 * la V2.2 affiche de vrais filets et des reflets mouvants aux emplacements
 * d'eau validés sur la carte 1536 × 1024. Le bateau reste peint dans le fond :
 * il ne se déplace donc PAS avec ces effets.
 *
 * Aucun lien avec Supabase, les placements ou les gestes de caméra.
 */
const WIDTH = 1536
const HEIGHT = 1024

type MovingHighlight = {
  display: Graphics
  x: number
  y: number
  phase: number
  speed: number
  amplitude: number
  alpha: number
  scaleWave: number
}

export type SeaAmbience = {
  container: Container
  resize: (width: number, height: number) => void
  tick: (seconds: number) => void
}

// Rectangles volontairement limités à l'EAU visible (hors quais et yacht).
// Chaque point est laissé à l'intérieur de sa zone avec une marge pour
// les translations horizontales. Valeurs mesurées en px sur le fond 1536x1024.
const WATER_AREAS = [
  { x: 1002, y: 953, halfW: 112, halfH: 38, number: 20 },
  { x: 1188, y: 973, halfW: 100, halfH: 31, number: 18 },
  { x: 1376, y: 977, halfW: 116, halfH: 32, number: 24 },
  { x: 1511, y: 612, halfW: 17, halfH: 95, number: 9 },
  { x: 1228, y: 862, halfW: 45, halfH: 34, number: 9 },
  { x: 858, y: 1002, halfW: 55, halfH: 16, number: 7 },
] as const

function seededRandom() {
  let state = 0x5a17d2c7
  return () => {
    state = (1664525 * state + 1013904223) >>> 0
    return state / 4294967296
  }
}

export function createSeaAmbience(): SeaAmbience {
  const container = new Container()
  container.eventMode = "none"
  container.interactiveChildren = false
  const highlights: MovingHighlight[] = []
  const random = seededRandom()

  for (let areaIndex = 0; areaIndex < WATER_AREAS.length; areaIndex++) {
    const area = WATER_AREAS[areaIndex]
    for (let i = 0; i < area.number; i++) {
      const centerX = area.x + (random() * 2 - 1) * area.halfW
      const centerY = area.y + (random() * 2 - 1) * area.halfH
      const length = 18 + random() * (areaIndex === 3 ? 19 : 45)
      const gold = random() > 0.75
      const wave = new Graphics()

      // Bande turquoise faiblement diffuse sous l'écume : mouvement de l'eau.
      wave.ellipse(0, 2, length * 0.65, 3.5 + random() * 2.5)
      wave.fill({ color: gold ? 0xe3ad5e : 0x3dbccf, alpha: 0.16 })

      // Ligne principale (vague) + reflet secondaire, animés ensemble.
      wave.moveTo(-length / 2, 0)
      wave.quadraticCurveTo(-length * 0.2, -4.2, 0, -1)
      wave.quadraticCurveTo(length * 0.24, 2.1, length / 2, -0.3)
      wave.stroke({ color: gold ? 0xffd79a : 0xa4eaf2, width: 2.0 + random() * 1.3, alpha: 0.92 })

      wave.moveTo(-length * 0.22, 6)
      wave.quadraticCurveTo(0, 3, length * 0.25, 5)
      wave.stroke({ color: gold ? 0xeabb70 : 0x40c9da, width: 1.15, alpha: 0.55 })
      wave.position.set(centerX, centerY)
      container.addChild(wave)
      highlights.push({
        display: wave,
        x: centerX,
        y: centerY,
        phase: random() * Math.PI * 2,
        speed: 0.62 + random() * 0.62,
        amplitude: 5 + random() * 13,
        alpha: 0.36 + random() * 0.24,
        scaleWave: 0.8 + random() * 0.45,
      })
    }
  }

  // Reflets plus contrastés à proximité du bateau (mais pas sur sa coque).
  for (const [x, y, gold] of [
    [1200, 895, true], [1225, 921, false], [1262, 937, false],
    [1303, 943, true], [1390, 944, true], [1444, 947, false],
    [1492, 984, false], [1150, 965, true], [1030, 985, false],
  ] as const) {
    const glint = new Graphics()
    glint.ellipse(0, 0, 12, 2)
    glint.fill({ color: gold ? 0xffd592 : 0xc5f5ff, alpha: 0.95 })
    glint.ellipse(0, 0, 3, 1)
    glint.fill({ color: 0xffffff, alpha: 0.95 })
    container.addChild(glint)
    highlights.push({
      display: glint,
      x,
      y,
      phase: random() * Math.PI * 2,
      speed: 0.88 + random() * 0.45,
      amplitude: 10 + random() * 7,
      alpha: 0.6,
      scaleWave: 1,
    })
  }

  return {
    container,
    resize(width, height) {
      container.scale.set(width / WIDTH, height / HEIGHT)
    },
    tick(seconds) {
      if (!container.visible) return
      for (const item of highlights) {
        const time = seconds * item.speed + item.phase
        item.display.position.set(
          item.x + Math.sin(time) * item.amplitude,
          item.y + Math.cos(time * 0.78) * 3.5,
        )
        item.display.scale.set(0.92 + Math.sin(time * 0.85) * 0.22 * item.scaleWave, 1)
        item.display.alpha = item.alpha * (0.7 + 0.3 * Math.sin(time * 1.37 + 1))
      }
    },
  }
}
