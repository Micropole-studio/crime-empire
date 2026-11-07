/** Publication mondiale de l'habillage V16. Aucun accès aux positions joueurs. */
import { supabase } from "./supabase";
import type { WorldNode } from "../types/worldMap";

export const V16_ART_W = 1672;
export const V16_ART_H = 941;
export const WORLD_V16_DRAFT_KEY = "crime-empire-world-v16-reference-edit";

const SOURCES = new Set([
  "villa-ouest.webp", "villa-est.webp", "villa-centrale.webp", "villa-sud.webp",
  "villa-rivage.webp", "prison-regionale.webp", "port-sombre.webp",
  "marche-noir.webp", "depot-armes.webp", "chantier-clandestin.webp",
]);
const KINDS = new Set(["city", "port", "prison", "blackmarket", "weapons", "construction"]);
export type V16SceneNode = {
  id: string; kind: string; src: string; label?: string;
  x: number; y: number; w: number; h: number; scale: number;
  rotation: number; sx?: number; sy?: number; owner?: string;
};
export type V16Point = {x:number;y:number};
export type V16PublishedScene = {version:16;nodes:V16SceneNode[];roads:V16Point[][]};
export type V16Publication = { scene:V16PublishedScene;revision:number;publishedAt?:string };

const object = (value: unknown): value is Record<string,unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const finite = (v:unknown,low:number,high:number):v is number =>
  typeof v === "number" && Number.isFinite(v) && v>=low && v<=high;

export function parseV16Scene(value: unknown): V16PublishedScene {
  const raw:unknown = typeof value === "string" ? JSON.parse(value) : value;
  if (!object(raw) || raw.version !== 16 || !Array.isArray(raw.nodes) || !Array.isArray(raw.roads)
    || raw.nodes.length>125 || raw.roads.length>80) throw Error("Brouillon V16 invalide");
  const ids=new Set<string>();
  const nodes:V16SceneNode[]=raw.nodes.map((entry:unknown)=>{
    if(!object(entry)||typeof entry.id!=="string"||!/^[\w-]{1,60}$/.test(entry.id)||ids.has(entry.id)
      ||typeof entry.kind!=="string"||!KINDS.has(entry.kind)
      ||typeof entry.src!=="string"||!SOURCES.has(entry.src)
      ||!finite(entry.x,-300,1800)||!finite(entry.y,-300,1050)
      ||!finite(entry.w,1,600)||!finite(entry.h,1,400)
      ||!finite(entry.scale,.25,1.5)||!finite(entry.rotation,-25,25)) throw Error("Objet V16 invalide");
    ids.add(entry.id);
    return {id:entry.id,kind:entry.kind,src:entry.src,
      label:typeof entry.label==="string"?entry.label.slice(0,80):undefined,
      x:entry.x,y:entry.y,w:entry.w,h:entry.h,scale:entry.scale,rotation:entry.rotation};
  });
  const roads:V16Point[][]=raw.roads.map((line:unknown)=>{
    if(!Array.isArray(line)||line.length<2||line.length>50) throw Error("Route invalide");
    return line.map((point:unknown)=>{
      if(!object(point)||!finite(point.x,-200,1900)||!finite(point.y,-100,1100)) throw Error("Point de route invalide");
      return {x:point.x,y:point.y};
    });
  });
  return {version:16,nodes,roads};
}

export async function loadPublishedV16Scene():Promise<V16Publication|null> {
  const {data,error}=await supabase.from("world_visual_scenes")
    .select("scene,revision,published_at").eq("region_key","region_1").maybeSingle();
  if(error) throw Error(`Lecture monde publié : ${error.message}`);
  if(!data) return null;
  return {scene:parseV16Scene(data.scene),revision:Number(data.revision),publishedAt:data.published_at};
}

export async function publishV16Scene(scene:V16PublishedScene,expectedRevision:number|null):Promise<number>{
  const safe=parseV16Scene(scene);
  const {data,error}=await supabase.rpc("ce_publish_world_visual_scene",{
    p_scene:safe,p_expected_revision:expectedRevision
  });
  if(error) throw Error(`Publication refusée : ${error.message}`);
  return Number(data);
}

const POI_IDS:Record<string,string>={
  "port":"port-sombre", "prison":"district-network",
  "blackmarket":"black-market", "weapons":"weapons-depot", "construction":"illegal-construction-site",
};
/** Les villes réelles ne sont jamais repositionnées par ce fichier. */
export function applyPublishedV16Pois(nodes:WorldNode[],scene:V16PublishedScene|null):WorldNode[]{
  if(!scene)return nodes;
  const overrides=new Map<string,V16SceneNode>();
  for(const n of scene.nodes){const gameId=POI_IDS[n.kind];if(gameId)overrides.set(gameId,n);}
  return nodes.map((node)=>{
    const placement=overrides.get(node.id);
    if(!placement)return node;
    // Le sprite de l'éditeur est redimensionné autour de sa base (centre-bas).
    // Son centre visuel reste x + w/2, même quand scale change.
    // Le hotspot React est centré : utiliser le CENTRE du rectangle réellement dessiné.
    const visibleW = placement.w * placement.scale;
    const visibleH = placement.h * placement.scale;
    const centerX = placement.x + placement.w / 2;
    const centerY = placement.y + placement.h - visibleH / 2;
    return {...node,
      x:Number((centerX / V16_ART_W * 100).toFixed(3)),
      y:Number((centerY / V16_ART_H * 100).toFixed(3)),
      hotspotWidth:Number((visibleW / V16_ART_W * 100).toFixed(3)),
      hotspotHeight:Number((visibleH / V16_ART_H * 100).toFixed(3)),
      hotspotRotation:placement.rotation,
    };
  });
}
