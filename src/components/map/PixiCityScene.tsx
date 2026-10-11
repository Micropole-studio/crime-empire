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
import type { WorldMapAccessPlacement } from "../../data/worldMapAccess"
import { getRequiredVillaLevel } from "../../data/buildingRequirements"

type Props = {
  width: number
  height: number
  buildings: Building[]
  placements: BuildingPlacements
  helicopter: WorldMapAccessPlacement
  villaLevel: number
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
const HELICOPTER = "/game-assets/helicopter.webp"
const BUILDING_IMAGES = [
  "villa",
  "workshop",
  "hideout",
  "wall",
  "laboratory",
  "syndicate",
  "factory",
] as const
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
  helicopter,
  villaLevel,
  onReady,
  onUnavailable,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const currentFrame = useRef<FrameData>({
    width,
    height,
    buildings,
    placements,
    helicopter,
    villaLevel,
  })
  const redrawRef = useRef<() => void>(() => undefined)

  // Mise à jour des sprites sans recréer le contexte WebGL / recharger les assets.
  useEffect(() => {
    currentFrame.current = {
      width,
      height,
      buildings,
      placements,
      helicopter,
      villaLevel,
    }
    redrawRef.current()
  }, [width, height, buildings, placements, helicopter, villaLevel])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let disposed = false
    let app: Application | null = null
    let initialized = false
    let model: Container | null = null
    let background: Sprite | null = null
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
      background.width = frame.width
      background.height = frame.height

      // Supprimer les anciens objets uniquement, pas les textures mises en cache.
      for (const object of model.removeChildren()) {
        object.destroy({ children: true })
      }
      glows.length = 0

      for (const building of frame.buildings) {
        const placement = frame.placements[building.type]
        const texture = textures[`/game-assets/${building.type}.webp`]
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

        model.addChild(object)
      }

      const heliWidth = (frame.helicopter.width / 100) * frame.width
      const helicopterTexture = textures[HELICOPTER]
      if (helicopterTexture) {
        const object = new Container()
        object.position.set(
          (frame.helicopter.x / 100) * frame.width,
          (frame.helicopter.y / 100) * frame.height,
        )
        object.rotation = frame.helicopter.rotation * DEG_TO_RAD
        object.zIndex = frame.helicopter.zIndex

        const shadow = new Graphics()
        shadow.ellipse(0, heliWidth * 0.13, heliWidth * 0.34, heliWidth * 0.09)
        shadow.fill({ color: 0x000000, alpha: 0.52 })
        object.addChild(shadow)

        const aura = new Graphics()
        aura.circle(0, 0, heliWidth * 0.40)
        aura.stroke({ color: 0xf5b94c, width: Math.max(2, heliWidth * 0.014), alpha: 0.75 })
        object.addChild(aura)
        glows.push({ graphic: aura, minimum: 0.25, maximum: 0.85, phase: 0.7 })

        const sprite = new Sprite(helicopterTexture)
        sprite.anchor.set(0.5)
        sprite.width = heliWidth
        sprite.height = heliWidth * (helicopterTexture.height / helicopterTexture.width)
        object.addChild(sprite)
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
          HELICOPTER,
          ...BUILDING_IMAGES.map((type) => `/game-assets/${type}.webp`),
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

