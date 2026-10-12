import { useEffect, useRef } from "react"
import {
  Application,
  Assets,
  Container,
  Graphics,
  Sprite,
  type Texture,
} from "pixi.js"

import type { Building } from "../../types/building"
import type { BuildingPlacements } from "../../types/buildingPlacement"
import { getRequiredVillaLevel } from "../../data/buildingRequirements"

type Props = {
  width: number
  height: number
  buildings: Building[]
  placements: BuildingPlacements
  villaLevel: number
  artStyle: "classic" | "luxury"
  onReady: (ready: boolean) => void
  onUnavailable: (unavailable: boolean) => void
}

type FrameData = Omit<Props, "onReady" | "onUnavailable">
type AnimatedGlow = {
  graphic: Graphics
  minimum: number
  maximum: number
  phase: number
}

const CITY_GROUND = "/game-assets/city-map.webp"
const CITY_GROUND_LUXURY = "/game-assets/city-map-luxe.webp"
const BUILDING_IMAGES = [
  "villa",
  "workshop",
  "hideout",
  "wall",
  "laboratory",
  "syndicate",
  "factory",
] as const
const LUXURY_BUILDING_ASSETS: Record<(typeof BUILDING_IMAGES)[number], string> = {
  villa: "/game-assets/villa-luxe.webp",
  workshop: "/game-assets/workshop-luxe.webp",
  hideout: "/game-assets/hideout-luxe.webp",
  wall: "/game-assets/wall-luxe.webp",
  laboratory: "/game-assets/laboratory-luxe.webp",
  syndicate: "/game-assets/syndicate-luxe.webp",
  factory: "/game-assets/factory-luxe.webp",
}
const DEG_TO_RAD = Math.PI / 180

/**
 * Moteur de rendu uniquement : les clics, la caméra, les règles de progression,
 * les données Supabase et l'éditeur restent gérés par GameMap/React.
 * Le canvas ignore volontairement les événements pointeur : les boutons HTML
 * existants sont conservés comme zones de clic accessibles et comme fallback.
 */
export default function PixiCityScene({
  width,
  height,
  buildings,
  placements,
  villaLevel,
  artStyle,
  onReady,
  onUnavailable,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const currentFrame = useRef<FrameData>({
    width,
    height,
    buildings,
    placements,
    villaLevel,
    artStyle,
  })
  const redrawRef = useRef<() => void>(() => undefined)

  // Mise à jour des sprites sans recréer le contexte WebGL / recharger les assets.
  useEffect(() => {
    currentFrame.current = {
      width,
      height,
      buildings,
      placements,
      villaLevel,
      artStyle,
    }
    redrawRef.current()
  }, [width, height, buildings, placements, villaLevel, artStyle])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let disposed = false
    let app: Application | null = null
    let initialized = false
    let model: Container | null = null
    let background: Sprite | null = null
    let environmentalLights: Container | null = null
    const glows: AnimatedGlow[] = []
    const textures: Record<string, Texture> = {}

    // Un seul ticker : aucun setState React à chaque image.
    const animate = () => {
      const time = performance.now() / 1000
      for (const glow of glows) {
        const wave = (Math.sin(time * 2.4 + glow.phase) + 1) / 2
        glow.graphic.alpha =
          glow.minimum + (glow.maximum - glow.minimum) * wave
      }
    }

    function render() {
      if (!app || !model || !background) return
      const frame = currentFrame.current
      if (frame.width <= 0 || frame.height <= 0) return

      if (app.renderer.screen.width !== frame.width || app.renderer.screen.height !== frame.height) {
        app.renderer.resize(frame.width, frame.height)
      }
      background.texture = textures[frame.artStyle === "luxury" ? CITY_GROUND_LUXURY : CITY_GROUND]
      background.width = frame.width
      background.height = frame.height
      // Supprimer les anciens objets uniquement, pas les textures mises en cache.
      for (const object of model.removeChildren()) {
        object.destroy({ children: true })
      }
      glows.length = 0

      // Environmental lanterns in a dedicated, non-interactive GPU layer.
      // Their positions reference the fixed geometry of the unchanged background.
      if (environmentalLights) {
        for (const graphic of environmentalLights.removeChildren()) {
          graphic.destroy({ children: true })
        }
        if (frame.artStyle === "luxury") {
          const lamps = [
            [0.083, 0.18], [0.205, 0.39], [0.307, 0.625],
            [0.386, 0.07], [0.485, 0.19], [0.614, 0.33],
            [0.714, 0.50], [0.876, 0.37], [0.935, 0.585],
            [0.565, 0.83], [0.275, 0.78], [0.106, 0.74],
          ]
          for (let i = 0; i < lamps.length; i++) {
            const [x, y] = lamps[i]
            const light = new Graphics()
            light.position.set(x * frame.width, y * frame.height)
            const r = frame.width * 0.012
            light.circle(0, 0, r * 2.3)
            light.fill({ color: 0xeca652, alpha: 0.045 })
            light.circle(0, 0, r * 1.3)
            light.fill({ color: 0xffcc75, alpha: 0.08 })
            light.circle(0, 0, r * 0.45)
            light.fill({ color: 0xffd996, alpha: 0.14 })
            environmentalLights.addChild(light)
            glows.push({ graphic: light, minimum: 0.35, maximum: 0.75, phase: i * 0.7 })
          }
        }
      }

      for (const building of frame.buildings) {
        const placement = frame.placements[building.type]
        const texture = textures[
          frame.artStyle === "luxury"
            ? LUXURY_BUILDING_ASSETS[building.type]
            : `/game-assets/${building.type}.webp`
        ]
        if (!placement || !texture) continue

        const widthPx = (placement.width / 100) * frame.width
        const imageHeight = widthPx * (texture.height / texture.width)
        const level = Math.max(0, Number(building.level) || 0)
        // Les bâtiments inaccessibles gardent leur visibilité atténuée.
        const requiredVillaLevel = getRequiredVillaLevel(building.type)
        const locked = building.type !== "villa" && frame.villaLevel < requiredVillaLevel
        const available = level === 0 && !locked

        // Le point d'ancrage est au sol (comme translate(-50%, -100%) du DOM).
        const object = new Container()
        object.position.set(
          (placement.x / 100) * frame.width,
          (placement.y / 100) * frame.height,
        )
        object.rotation = placement.rotation * DEG_TO_RAD
        object.zIndex = placement.zIndex

        if (frame.artStyle === "luxury" && level >= 1) {
          // Stone apron and champagne-coloured edge, following the persisted placement.
          const apron = new Graphics()
          const rimWidth = widthPx * (building.type === "villa" ? 0.43 : 0.39)
          const rimHeight = widthPx * 0.085
          apron.ellipse(0, -imageHeight * 0.03, rimWidth, rimHeight)
          apron.fill({ color: 0x101b25, alpha: 0.33 })
          apron.ellipse(0, -imageHeight * 0.03, rimWidth, rimHeight)
          apron.stroke({ color: 0xdcc28d, alpha: building.type === "villa" ? 0.38 : 0.16, width: Math.max(1, frame.width * 0.0008) })
          object.addChild(apron)
        }

        const floorShadow = new Graphics()
        floorShadow.ellipse(0, -Math.max(2, imageHeight * 0.045), widthPx * 0.38, Math.max(4, widthPx * 0.052))
        floorShadow.fill({ color: 0x050607, alpha: locked ? 0.1 : 0.35 })
        object.addChild(floorShadow)

        if (available || building.is_upgrading) {
          const glow = new Graphics()
          glow.ellipse(0, -imageHeight * 0.06, widthPx * 0.47, widthPx * 0.13)
          glow.fill({
            color: building.is_upgrading ? 0xffc45a : 0x4be5aa,
            alpha: 0.27,
          })
          glow.alpha = 0.36
          object.addChild(glow)
          glows.push({ graphic: glow, minimum: 0.18, maximum: 0.74, phase: glows.length })
        }

        const sprite = new Sprite(texture)
        sprite.anchor.set(0.5, 1)
        sprite.width = widthPx
        sprite.height = imageHeight
        sprite.alpha = locked ? 0.16 : available ? 0.4 : 1
        if (building.is_upgrading) sprite.tint = 0xddc6a3
        object.addChild(sprite)

        if (frame.artStyle === "luxury" && building.type === "villa" && level >= 1) {
          // Subtle warm entrance lights, not expensive filters or per-frame React state.
          for (const side of [-1, 1]) {
            const lantern = new Graphics()
            lantern.position.set(side * widthPx * 0.29, -imageHeight * 0.12)
            lantern.circle(0, 0, Math.max(2, widthPx * 0.015))
            lantern.fill({ color: 0xffcf7c, alpha: 0.73 })
            lantern.circle(0, 0, Math.max(5, widthPx * 0.04))
            lantern.fill({ color: 0xffb759, alpha: 0.08 })
            object.addChild(lantern)
            glows.push({ graphic: lantern, minimum: 0.58, maximum: 0.98, phase: side })
          }
        }

        model.addChild(object)
      }

      model.sortChildren()
    }

    const start = async () => {
      const instance = new Application()
      app = instance
      try {
        const initial = currentFrame.current
        await instance.init({
          width: initial.width,
          height: initial.height,
          backgroundAlpha: 0,
          preference: "webgl",
          antialias: true,
          autoDensity: true,
          // Limite mémoire/GPU sur mobile, tout en gardant un rendu net.
          resolution: Math.min(1.5, Math.max(1, window.devicePixelRatio || 1)),
        })
        initialized = true
        if (disposed) {
          instance.destroy(true, { children: true })
          return
        }

        const urls = [
          CITY_GROUND,
          CITY_GROUND_LUXURY,
          ...BUILDING_IMAGES.map((type) => `/game-assets/${type}.webp`),
          ...BUILDING_IMAGES.map((type) => LUXURY_BUILDING_ASSETS[type]),
        ]
        // Si une image manque, le DOM classique reste affiché :
        // pas d'écran noir et pas de sauvegarde touchée.
        const allTextures = await Promise.all(urls.map(async (url) => await Assets.load(url) as Texture))
        if (disposed) {
          instance.destroy(true, { children: true })
          return
        }
        urls.forEach((url, index) => { textures[url] = allTextures[index] })

        instance.canvas.style.cssText = "display:block;width:100%;height:100%;pointer-events:none"
        host.appendChild(instance.canvas)
        background = new Sprite(textures[CITY_GROUND])
        instance.stage.addChild(background)
        environmentalLights = new Container()
        instance.stage.addChild(environmentalLights)
        model = new Container()
        model.sortableChildren = true
        instance.stage.addChild(model)
        redrawRef.current = render
        render()
        instance.ticker.add(animate)
        onReady(true)
      } catch (error) {
        console.warn("Crime Empire : PixiJS indisponible, retour à l'affichage classique.", error)
        if (!disposed) {
          onReady(false)
          onUnavailable(true)
        }
        if (app && initialized) {
          try { app.destroy(true, { children: true }) } catch { /* contexte WebGL inachevé */ }
          app = null
          initialized = false
        }
      }
    }

    void start()

    return () => {
      disposed = true
      redrawRef.current = () => undefined
      onReady(false)
      if (app && initialized) {
        try {
          app.ticker.remove(animate)
          app.destroy(true, { children: true })
        } catch { /* navigateur en fermeture */ }
      }
      app = null
      initialized = false
    }
  }, [onReady, onUnavailable])

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{ width, height, zIndex: 0 }}
    />
  )
}

