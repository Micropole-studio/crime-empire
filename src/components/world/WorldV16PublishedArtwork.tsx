import { useMemo } from "react";
import type { V16PublishedScene, V16SceneNode, V16Point } from "../../services/worldVisualSceneService";
import "./WorldV16PublishedArtwork.css";

/**
 * Même espace d'illustration que le laboratoire V16 (1672 × 941).
 * Les bâtiments de démonstration « city » ne deviennent JAMAIS de faux joueurs :
 * seuls les vrais joueurs Supabase sont rendus par WorldNodeMarker.
 * Les quatre POI publiés sont dessinés ici ; leurs hotspots existants restent
 * au-dessus pour les interactions PvE. Aucun état ou donnée du jeu n'est modifié.
 */
const ART_W = 1672;
const ART_H = 941;
const ASSET_ROOT = "/world/v16/";
const POI_KINDS = new Set(["prison", "port", "blackmarket", "weapons"]);

function roadPath(road: V16Point[]): string {
  if (road.length < 2) return "";
  let d = `M ${road[0].x} ${road[0].y}`;
  for (let i = 1; i < road.length; i++) {
    const here = road[i];
    const next = road[Math.min(road.length - 1, i + 1)];
    d += ` Q ${here.x} ${here.y} ${(here.x + next.x) / 2} ${(here.y + next.y) / 2}`;
  }
  return d + ` L ${road[road.length - 1].x} ${road[road.length - 1].y}`;
}

function VisualPoi({ node }: { node: V16SceneNode }) {
  // Reprend exactement bounds() + drawNode() du laboratoire V16.
  const width = node.w * node.scale;
  const height = node.h * node.scale;
  const left = node.x - (width - node.w) / 2;
  const top = node.y - (height - node.h);
  const footX = node.x + node.w / 2;
  const footY = node.y + node.h;
  return (
    <image
      key={node.id}
      href={`${ASSET_ROOT}${node.src}`}
      x={left}
      y={top}
      width={width}
      height={height}
      preserveAspectRatio="none"
      transform={`rotate(${node.rotation} ${footX} ${footY})`}
    />
  );
}

export default function WorldV16PublishedArtwork({ scene }: { scene: V16PublishedScene | null }) {
  const pois = useMemo(
    () => (scene?.nodes ?? []).filter((n) => POI_KINDS.has(n.kind)).sort((a, b) => a.y + a.h - b.y - b.h),
    [scene],
  );
  if (!scene) return null;
  return (
    <svg
      className="ce-v16-published-artwork pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
      viewBox={`0 0 ${ART_W} ${ART_H}`}
      preserveAspectRatio="none"
      style={{ zIndex: 0 }}
    >
      <image href={`${ASSET_ROOT}terrain-restaure.webp`} x={0} y={0} width={ART_W} height={ART_H} preserveAspectRatio="none" />
      {scene.roads.map((road, index) => {
        const path = roadPath(road);
        return (
          <g key={index} fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d={path} stroke="#121a17" strokeOpacity=".68" strokeWidth={35} />
            <path d={path} stroke="#a09777" strokeWidth={29} />
            <path d={path} stroke="#2b3135" strokeWidth={24} />
            <path d={path} stroke="#394044" strokeWidth={20} />
            <path d={path} stroke="#d7c58b" strokeOpacity=".48" strokeWidth={1.8} strokeDasharray="12 23" />
          </g>
        );
      })}
      {pois.map((node) => <VisualPoi key={node.id} node={node} />)}
    </svg>
  );
}
