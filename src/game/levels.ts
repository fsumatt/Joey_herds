export type Point = { x: number; y: number };
export type ObstacleConfig = Point & { radius: number; kind?: 'rock' | 'tree' | 'hay' };
export type CorralConfig = { x: number; y: number; width: number; height: number };
export type PondConfig = Point & { rx: number; ry: number };
export type FenceConfig = { a: Point; b: Point };
export type LevelConfig = {
  id: number; name: string; description?: string; seconds: number; joeyStart: Point; corral: CorralConfig;
  sheep: Point[]; obstacles: ObstacleConfig[]; ponds?: PondConfig[]; fences?: FenceConfig[]; field?: Point[];
};
const row = (x: number, y: number, n: number) => Array.from({length:n},(_,i)=>({x:x+(i%3)*58,y:y+Math.floor(i/3)*62}));
export const levels: LevelConfig[] = [
  { id:1, name:'Sunny Start', description:'Open grass. Learn to work behind the flock.', seconds:90,
    joeyStart:{x:210,y:360}, corral:{x:945,y:270,width:225,height:190}, sheep:row(500,325,4),
    obstacles:[{x:340,y:160,radius:32,kind:'tree'}] },
  { id:2, name:'Willow Pond', description:'Shallow water slows paws and hooves. Go around or wade through.', seconds:115,
    joeyStart:{x:170,y:525}, corral:{x:935,y:170,width:225,height:190}, sheep:row(390,420,6),
    ponds:[{x:675,y:370,rx:115,ry:100}], obstacles:[{x:570,y:170,radius:32,kind:'tree'},{x:850,y:550,radius:37,kind:'hay'}] },
  { id:3, name:'Apple Orchard', description:'Gather two groups through the gaps between the trees.', seconds:145,
    joeyStart:{x:175,y:350}, corral:{x:945,y:390,width:225,height:200}, sheep:[...row(350,220,4),...row(395,490,4)],
    obstacles:[{x:590,y:190,radius:37,kind:'tree'},{x:730,y:310,radius:37,kind:'tree'},{x:590,y:435,radius:37,kind:'tree'},{x:770,y:550,radius:35,kind:'hay'},{x:910,y:180,radius:32,kind:'tree'}] },
  { id:4, name:'Two Paddocks', description:'Use the wide gates. Fences reward a patient approach.', seconds:175,
    joeyStart:{x:170,y:530}, corral:{x:960,y:265,width:205,height:195}, sheep:[...row(325,185,5),...row(370,455,5)],
    fences:[{a:{x:620,y:115},b:{x:620,y:280}},{a:{x:620,y:440},b:{x:620,y:630}},{a:{x:620,y:115},b:{x:805,y:115}}],
    obstacles:[{x:835,y:515,radius:43,kind:'hay'},{x:810,y:215,radius:34,kind:'tree'}],
    field:[{x:80,y:70},{x:1160,y:70},{x:1275,y:185},{x:1275,y:650},{x:5,y:650},{x:5,y:145}] },
  { id:5, name:'Joey’s Big Day', description:'Water, gates and scattered sheep. Bring the whole farm home.', seconds:205,
    joeyStart:{x:170,y:170}, corral:{x:960,y:440,width:210,height:190}, sheep:[...row(315,210,4),...row(300,465,4),...row(735,165,4)],
    ponds:[{x:580,y:370,rx:105,ry:88}], fences:[{a:{x:775,y:385},b:{x:965,y:385}}],
    obstacles:[{x:215,y:365,radius:34,kind:'tree'},{x:675,y:570,radius:39,kind:'hay'},{x:1045,y:205,radius:36,kind:'tree'},{x:880,y:555,radius:31,kind:'hay'}],
    field:[{x:125,y:70},{x:1170,y:70},{x:1275,y:175},{x:1275,y:650},{x:115,y:650},{x:5,y:540},{x:5,y:190}] },
];
export const getLevel = (id:number) => levels.find(level=>level.id===id) ?? levels[0];
