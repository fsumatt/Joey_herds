import test from 'node:test';
import assert from 'node:assert/strict';
import { HerdSimulation, nearest, world, type Vec } from '../src/game3d/simulation';
import { levels } from '../src/game/levels';
const advance=(s:HerdSimulation,t:number,input={x:0,z:0})=>{for(let i=0;i<t*100;i++)s.step(.01,input);};
test('water slows Joey and sheep, with a continuous transition at the bank',()=>{
 const wet=new HerdSimulation(levels[1],()=>.5),dry=new HerdSimulation({...levels[1],ponds:[]},()=>.5);
 const p=wet.ponds[0];
 for(const g of [wet,dry]){g.joey={x:p.x-.6,z:p.z};g.sheep=[{x:p.x+.6,z:p.z,vx:0,vz:0,angle:0,wander:1,captured:false}];}
 const before=p.x-.6;advance(wet,.2,{x:1,z:0});advance(dry,.2,{x:1,z:0});
 assert.ok(wet.joey.x-before<(dry.joey.x-before)*.65);
 assert.ok(wet.sheep[0].x<dry.sheep[0].x);
 assert.equal(wet.terrainSpeed({x:p.x+p.rx,z:p.z}),1);
 assert.ok(wet.terrainSpeed({x:p.x+p.rx-.001,z:p.z})>.999);
});
test('paddock fences stop Joey and sheep but the central gate is passable',()=>{
 const g=new HerdSimulation(levels[3],()=>.5),f=g.fences[0];g.joey={x:f.a.x-.31,z:(f.a.z+f.b.z)/2};advance(g,.6,{x:1,z:0});assert.ok(g.joey.x<=f.a.x-.299);
 g.joey={x:f.a.x-1,z:0};advance(g,.5,{x:1,z:0});assert.ok(g.joey.x>f.a.x+.5);
 g.sheep=[{x:f.a.x-.26,z:f.a.z+.8,vx:0,vz:0,angle:0,wander:1,captured:false}];g.joey={x:f.a.x-1.2,z:f.a.z+.8};advance(g,.6);assert.ok(g.sheep[0].x<f.a.x);
});
test('every spawn and home entrance has a connected, body-width route in all five meadows',()=>{
 for(const level of levels){
  const g=new HerdSimulation(level,()=>.5),step=.25;
  const clear=(p:Vec)=>{
   for(const e of g.outer){const dx=e.b.x-e.a.x,dz=e.b.z-e.a.z;if(((p.x-e.a.x)*-dz+(p.z-e.a.z)*dx)/Math.hypot(dx,dz)<.42)return false;}
   for(const r of g.rocks)if(Math.hypot(p.x-r.x,p.z-r.z)<r.radius+.42)return false;
   for(const e of g.barriers){const q=nearest(p,e);if(Math.hypot(p.x-q.x,p.z-q.z)<.42)return false;}
   return true;
  };
  const points=new Map<string,Vec>();for(let x=-12.5;x<=12.5;x+=step)for(let z=-5.5;z<=6.7;z+=step){const p={x,z};if(clear(p))points.set(`${x},${z}`,p);}
  const closest=(p:Vec)=>[...points.entries()].reduce((best,e)=>Math.hypot(e[1].x-p.x,e[1].z-p.z)<Math.hypot(best[1].x-p.x,best[1].z-p.z)?e:best);
  const home={x:g.corral.left+.8,z:(g.corral.top+g.corral.bottom)/2},root=closest(home)[0],seen=new Set([root]),queue=[root];
  for(let i=0;i<queue.length;i++){const p=points.get(queue[i])!;for(const [dx,dz] of [[step,0],[-step,0],[0,step],[0,-step]]){const key=`${p.x+dx},${p.z+dz}`;if(points.has(key)&&!seen.has(key)){seen.add(key);queue.push(key);}}}
  for(const p of [g.joey,...g.sheep]){assert.ok(clear(p),`${level.name}: spawn intersects an obstacle`);assert.ok(seen.has(closest(p)[0]),`${level.name}: spawn has no route home`);}
 }
});
test('later meadows increase flock size, allotted time and introduce distinct challenges',()=>{
 for(let i=1;i<levels.length;i++){assert.ok(levels[i].sheep.length>levels[i-1].sheep.length);assert.ok(levels[i].seconds>levels[i-1].seconds);assert.ok(levels[i].seconds/levels[i].sheep.length<levels[i-1].seconds/levels[i-1].sheep.length);}
 assert.equal(levels[0].ponds?.length??0,0);assert.ok(levels[1].ponds?.length);assert.ok(levels[2].obstacles.filter(r=>r.kind==='tree').length>=3);assert.ok(levels[3].fences?.length);assert.ok(levels[4].ponds?.length&&levels[4].fences?.length);
});
test('sheep can reach the visible fence without a one-unit exclusion lane',()=>{
 const g=new HerdSimulation(levels[0],()=>.5);g.joey={x:0,z:0};g.sheep=[{x:-11.9,z:0,vx:-.3,vz:0,angle:Math.PI,wander:20,captured:false}];advance(g,1.5);assert.ok(g.sheep[0].x<-12.2);
});
