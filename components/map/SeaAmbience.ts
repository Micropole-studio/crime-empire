import { Container, Graphics } from "pixi.js"

/**
 * Reflets marins légers de la carte de ville Premium (1536 x 1024).
 *
 * La mer et le yacht sont peints dans le fond. Il n'est donc pas possible
 * de déplacer réellement leurs pixels sans séparer ces éléments de l'image.
 * Ce calque anime de fines ondulations et des scintillements uniquement aux
 * coordonnées connues de l'eau. Aucun élément interactif ni sauvegarde.
 */
const SOURCE_WIDTH = 1536
const SOURCE_HEIGHT = 1024

type Ripple = {
  display: Graphics
  x: number
  y: number
  phase: number
  pace: number
  amplitude: number
  baseAlpha: number
}

export type SeaAmbience = {
  container: Container
  resize: (width: number, height: number) => void
  tick: (seconds: number) => void
}

// Points contrôlés sur l'image city-map-luxe.webp (la mer, pas les quais).
// Les points de la partie sud sont plus discrets que ceux de la marina.
const WATER_SPOTS: Array<[number, number, number, number]> = [
  [1054, 936, 62, 0.08], [1194, 957, 78, 0.10], [1346, 960, 83, 0.12],
  [1492, 946, 72, 0.09], [960, 1003, 63, 0.07], [1124, 1004, 85, 0.10],
  [1275, 1005, 72, 0.09], [1464, 1009, 90, 0.11], [1122, 876, 46, 0.06],
  [1236, 884, 46, 0.09], [1362, 877, 53, 0.11], [1493, 886, 58, 0.09],
  [1494, 673, 30, 0.06], [1510, 615, 22, 0.06],
]

const MARINA_SPARKLES: Array<[number, number, number]> = [
  [1192, 881, 0.15], [1225, 918, 0.19], [1293, 896, 0.20],
  [1321, 948, 0.14], [1415, 904, 0.17], [1487, 902, 0.20],
  [1180, 979, 0.13], [1098, 955, 0.13], [1530, 722, 0.10],
]

export function createSeaAmbience(): SeaAmbience {
  const container = new Container()
  container.eventMode = "none"
  container.interactiveChildren = false
  const ripples: Ripple[] = []

  WATER_SPOTS.forEach(([x, y, length, strength], i) => {
    const graphic = new Graphics()
    // Un trait dédoublé pour évoquer la vague sans surligner le décor.
    graphic.moveTo(-length / 2, 0)
    graphic.quadraticCurveTo(-length * 0.18, -3, 0, -1)
    graphic.quadraticCurveTo(length * 0.28, 2, length / 2, 0)
    graphic.stroke({ color: i % 4 === 0 ? 0xffd59d : 0x94dcea, width: 1.5 })
    graphic.moveTo(-length * 0.28, 7)
    graphic.quadraticCurveTo(0, 3.5, length * 0.34, 7)
    graphic.stroke({ color: 0x69d1e4, width: 0.7 })
    graphic.position.set(x, y)
    container.addChild(graphic)
    ripples.push({
      display: graphic,
      x,
      y,
      phase: i * 1.83,
      pace: 0.28 + (i % 3) * 0.075,
      amplitude: 2.8 + i % 3,
      baseAlpha: strength,
    })
  })

  // Les petits reflets lumineux au large du yacht scintillent très doucement.
  MARINA_SPARKLES.forEach(([x, y, strength], i) => {
    const glint = new Graphics()
    glint.ellipse(0, 0, 6 + i % 4, 1.3)
    glint.fill({ color: i % 2 ? 0x95deef : 0xf6d29f })
    glint.ellipse(0, 0, 2, 0.7)
    glint.fill({ color: 0xffffff })
    glint.position.set(x, y)
    container.addChild(glint)
    ripples.push({
      display: glint,
      x, y,
      phase: i * 2.12 + 0.7,
      pace: 0.20 + (i % 4) * 0.06,
      amplitude: 1.2,
      baseAlpha: strength,
    })
  })

  return {
    container,
    resize(width, height) {
      container.scale.set(width / SOURCE_WIDTH, height / SOURCE_HEIGHT)
    },
    tick(seconds) {
      if (!container.visible) return
      for (const ripple of ripples) {
        const motion = seconds * ripple.pace + ripple.phase
        ripple.display.position.set(
          ripple.x + Math.sin(motion) * ripple.amplitude * 2,
          ripple.y + Math.cos(motion * 0.7) * ripple.amplitude,
        )
        ripple.display.alpha = ripple.baseAlpha * (
          0.75 + 0.25 * Math.sin(motion * 1.4)
        )
      }
    },
  }
}
