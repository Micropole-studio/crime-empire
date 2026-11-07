import type { V16PublishedScene,V16Point } from "../../services/worldVisualSceneService";

function roadPath(points:V16Point[]):string {
  if(points.length<2)return "";
  let path=`M ${points[0].x} ${points[0].y}`;
  for(let i=1;i<points.length;i++){
    const p=points[i],next=points[Math.min(points.length-1,i+1)];
    path+=` Q ${p.x} ${p.y} ${(p.x+next.x)/2} ${(p.y+next.y)/2}`;
  }
  return path+` L ${points.at(-1)!.x} ${points.at(-1)!.y}`;
}
/** Réutilise les chemins créés dans l'éditeur. L'image de terrain reste derrière. */
export default function WorldV16PublishedRoads({scene}:{scene:V16PublishedScene|null}){
  if(!scene||scene.roads.length===0)return null;
  return (
    <svg aria-hidden="true" viewBox="0 0 1672 941" preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full" style={{zIndex:1}}>
      {scene.roads.map((road,index)=><g key={index} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d={roadPath(road)} stroke="#111a17" strokeOpacity=".67" strokeWidth="35" />
        <path d={roadPath(road)} stroke="#a09777" strokeWidth="29" />
        <path d={roadPath(road)} stroke="#2b3135" strokeWidth="24" />
        <path d={roadPath(road)} stroke="#394044" strokeWidth="20" />
        <path d={roadPath(road)} stroke="#d7c58b" strokeOpacity=".48"
          strokeWidth="1.8" strokeDasharray="12 23" />
      </g>)}
    </svg>
  );
}
