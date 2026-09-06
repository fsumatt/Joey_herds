import { type LevelConfig, type Point } from '../game/levels';
export type Vec = { x: number; z: number };
export const world = (p: Point): Vec => ({ x: (p.x - 640) / 50, z: (p.y - 360) / 50 });
export const bounds = { left: -12.4, right: 12.4, top: -5.5, bottom: 6.65 };
export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
// Only physical body clearance from the visible fence; no reserved turning lane.
export const sheepBounds = { left: -12.45, right: 12.45, top: -5.55, bottom: 6.7 };
export type Ability = 'boost' | 'bark';
export const ABILITIES = { boost: { duration: 1, recharge: 5 }, bark: { duration: .85, recharge: 15 } } as const;
export type Flock = Vec & { vx: number; vz: number; angle: number; wander: number; captured: boolean };
export type Segment = { a: Vec; b: Vec };
export function nearest(p: Vec, edge: Segment) {
  const dx=edge.b.x-edge.a.x,dz=edge.b.z-edge.a.z;
  const t=clamp(((p.x-edge.a.x)*dx+(p.z-edge.a.z)*dz)/(dx*dx+dz*dz),0,1);
  return {x:edge.a.x+dx*t,z:edge.a.z+dz*t};
}
export class HerdSimulation {
  cooldowns: Record<Ability, number> = { boost: 0, bark: 0 };
  boostRemaining = 0; barkPulse = 0; joeySpeed = 0;
  private guided = new Map<Flock, number>();
  private recovery = new Map<Flock, Vec & { time: number }>();
  joey: Vec; target?: Vec; moving = false; facing = Math.PI / 2;
  sheep: Flock[]; remaining: number; status: 'playing' | 'won' | 'lost' = 'playing';
  readonly rocks: (Vec & { radius: number; kind?: 'rock'|'tree'|'hay' })[];
  readonly ponds: (Vec & { rx: number; rz: number })[];
  readonly field: Vec[]; readonly outer: Segment[]; readonly fences: Segment[]; readonly barriers: Segment[];
  readonly corral: { left: number; right: number; top: number; bottom: number };
  constructor(readonly level: LevelConfig, private random = Math.random) {
    this.joey = world(level.joeyStart); this.remaining = level.seconds;
    this.sheep = level.sheep.map(p => ({ ...world(p), vx: 0, vz: 0, angle: random() * Math.PI * 2, wander: 0, captured: false }));
    this.rocks = level.obstacles.map(p => ({ ...world(p), radius: p.radius / 50, kind:p.kind }));
    this.ponds=(level.ponds??[]).map(p=>({...world(p),rx:p.rx/50,rz:p.ry/50}));
    this.field=level.field?.map(world)??[{x:-12.7,z:-5.8},{x:12.7,z:-5.8},{x:12.7,z:6.95},{x:-12.7,z:6.95}];
    this.outer=this.field.map((a,i)=>({a,b:this.field[(i+1)%this.field.length]}));
    this.fences=(level.fences??[]).map(f=>({a:world(f.a),b:world(f.b)}));
    const c = world(level.corral); this.corral = { left: c.x, top: c.z, right: c.x + level.corral.width / 50, bottom: c.z + level.corral.height / 50 };
    const {left,right,top,bottom}=this.corral;
    this.barriers=[...this.fences,{a:{x:left,z:top},b:{x:right,z:top}},{a:{x:right,z:top},b:{x:right,z:bottom}},{a:{x:right,z:bottom},b:{x:left,z:bottom}}];
  }
  activate(ability: Ability) {
    if (!(ability in ABILITIES) || this.status !== 'playing' || this.cooldowns[ability] > .0001) return false;
    this.cooldowns[ability] = ABILITIES[ability].recharge;
    if (ability === 'boost') this.boostRemaining = 1;
    if (ability === 'bark') {
      this.barkPulse = .7;
      this.sheep.forEach(s => { if (!s.captured && Math.hypot(s.x - this.joey.x, s.z - this.joey.z) <= 4.2) this.guided.set(s, ABILITIES.bark.duration); });
    }
    return true;
  }
  private guideTarget(s: Vec): Vec {
    const c=this.corral,middle=(c.top+c.bottom)/2;
    if(s.x>=c.right&&s.z>=c.top-.8&&s.z<=c.bottom+.8)return{x:s.x,z:s.z<middle?c.top-1:c.bottom+1};
    if(s.x>=c.left&&(s.z<=c.top+.3||s.z>=c.bottom-.3))return{x:c.left-1,z:s.z};
    return {x:c.left-.5,z:middle};
  }
  get captured() { return this.sheep.filter(s => s.captured).length; }
  insideField(p:Vec,clearance=0) {
    return this.outer.every(e=>{const dx=e.b.x-e.a.x,dz=e.b.z-e.a.z;return ((p.x-e.a.x)*-dz+(p.z-e.a.z)*dx)/Math.hypot(dx,dz)>=clearance;});
  }
  terrainSpeed(p: Vec) {
    let factor=1;
    for(const pond of this.ponds){
      const d=Math.hypot((p.x-pond.x)/pond.rx,(p.z-pond.z)/pond.rz);
      // Smooth shallows avoid a sudden invisible speed boundary at the bank.
      const depth=clamp((1-d)/.25,0,1);factor=Math.min(factor,1-.48*depth*depth*(3-2*depth));
    }
    return factor;
  }
  moveTo(p: Vec) { this.target = {...p}; this.resolve(this.target,.3,this.joey); }
  private resolve(p: Vec, radius: number, previous: Vec) {
    for(let pass=0;pass<3;pass++){
      for (const rock of this.rocks) {
        let dx=p.x-rock.x,dz=p.z-rock.z,d=Math.hypot(dx,dz);
        if(d<radius+rock.radius){if(d<.0001){dx=previous.x-rock.x;dz=previous.z-rock.z;d=Math.hypot(dx,dz)||1;if(!dx&&!dz)dx=1;}p.x=rock.x+dx/d*(radius+rock.radius);p.z=rock.z+dz/d*(radius+rock.radius);}
      }
      for(const edge of this.barriers){
        const q=nearest(p,edge);let dx=p.x-q.x,dz=p.z-q.z,d=Math.hypot(dx,dz);
        if(d<radius){if(d<.0001){const old=nearest(previous,edge);dx=previous.x-old.x;dz=previous.z-old.z;d=Math.hypot(dx,dz)||1;if(!dx&&!dz)dx=1;}p.x=q.x+dx/d*radius;p.z=q.z+dz/d*radius;}
      }
      // All pasture outlines are convex and clockwise in X/Z coordinates.
      for(const edge of this.outer){const dx=edge.b.x-edge.a.x,dz=edge.b.z-edge.a.z,l=Math.hypot(dx,dz),nx=-dz/l,nz=dx/l,d=(p.x-edge.a.x)*nx+(p.z-edge.a.z)*nz;if(d<radius){p.x+=nx*(radius-d);p.z+=nz*(radius-d);}}
    }
  }
  private avoidFences(s: Flock, steer: Vec, dt: number) {
    const old=this.recovery.get(s);
    if(old){old.time-=dt;if(old.time<=0)this.recovery.delete(s);else {steer.x=steer.x*.2+old.x;steer.z=steer.z*.2+old.z;}}
    let rx=0,rz=0,contacts=0,normalX=0,normalZ=0;
    for(const edge of [...this.outer,...this.barriers]){
      const q=nearest(s,edge),dx=s.x-q.x,dz=s.z-q.z,d=Math.hypot(dx,dz);
      if(d>.38||d<.001)continue;
      const nx=dx/d,nz=dz/d,into=steer.x*nx+steer.z*nz;
      if(into>=-.05)continue;
      // At the actual fence, redirect pressure along it instead of holding the sheep.
      let tx=-nz,tz=nx;
      const along=s.vx*tx+s.vz*tz;
      const sign=Math.abs(along)>.12?Math.sign(along):Math.sign((s.x-this.joey.x)*tx+(s.z-this.joey.z)*tz)|| (this.sheep.indexOf(s)%2?1:-1);
      tx*=sign;tz*=sign;
      steer.x-=nx*into;steer.z-=nz*into;
      normalX+=nx;normalZ+=nz;rx+=nx*.8+tx*1.15;rz+=nz*.8+tz*1.15;contacts++;
    }
    for(const r of this.rocks){
      const dx=s.x-r.x,dz=s.z-r.z,d=Math.hypot(dx,dz);if(d<.001||d>r.radius+.38)continue;
      const nx=dx/d,nz=dz/d,into=steer.x*nx+steer.z*nz;if(into>=-.05)continue;
      const sign=Math.sign(s.vx*-nz+s.vz*nx)||1;
      normalX+=nx;normalZ+=nz;rx+=nx*.8-nz*sign*1.15;rz+=nz*.8+nx*sign*1.15;contacts++;
    }
    if(contacts>1){rx=normalX*1.2*contacts;rz=normalZ*1.2*contacts;}
    if(contacts){this.recovery.set(s,{x:rx/contacts,z:rz/contacts,time:1.1});steer.x=rx/contacts;steer.z=rz/contacts;}
    return steer;
  }
  step(dt: number, input: Vec = { x: 0, z: 0 }) {
    if (this.status !== 'playing') return;
    dt=clamp(dt,0,.05);if(dt===0)return;this.remaining=Math.max(0,this.remaining-dt);
    const boostedTime=Math.min(dt,this.boostRemaining),oldJoey={...this.joey};
    let dx=input.x,dz=input.z,d=Math.hypot(dx,dz);
    if(d>0)this.target=undefined;else if(this.target){dx=this.target.x-this.joey.x;dz=this.target.z-this.joey.z;d=Math.hypot(dx,dz);}
    if(d>.04){
      const before={...this.joey},step=Math.min(5.2*(dt+1.15*boostedTime)*this.terrainSpeed(this.joey),this.target?d:Infinity);
      this.joey.x+=dx/d*step;this.joey.z+=dz/d*step;this.resolve(this.joey,.3,before);this.facing=Math.atan2(dx,dz);
      if(this.target&&Math.hypot(this.target.x-this.joey.x,this.target.z-this.joey.z)<.08)this.target=undefined;
    }else this.target=undefined;
    this.joeySpeed=Math.hypot(this.joey.x-oldJoey.x,this.joey.z-oldJoey.z)/dt;this.moving=this.joeySpeed>.04;
    for(const s of this.sheep){
      if(s.captured)continue;
      const ax=s.x-this.joey.x,az=s.z-this.joey.z,distance=Math.hypot(ax,az);let sx=0,sz=0;
      if(distance<3.7){const force=5.2*(1-distance/3.7);sx=(distance>.001?ax/distance:1)*force;sz=(distance>.001?az/distance:0)*force;}
      else{s.wander-=dt;if(s.wander<=0){s.angle=this.random()*Math.PI*2;s.wander=1.2+this.random()*1.4;}sx=Math.cos(s.angle)*.32;sz=Math.sin(s.angle)*.32;}
      const guided=this.guided.get(s)??0;
      if(guided>0){
        const goal=this.guideTarget(s),gx=goal.x-s.x,gz=goal.z-s.z,len=Math.hypot(gx,gz),speed=Math.hypot(sx,sz);
        // Brief, fading directional suggestion: never adds speed or overrides fleeing.
        const weight=.28*guided/ABILITIES.bark.duration;
        if(len>.05){sx=sx*(1-weight)+gx/len*speed*weight;sz=sz*(1-weight)+gz/len*speed*weight;}
      }
      for(const other of this.sheep){if(other===s||other.captured)continue;const x=s.x-other.x,z=s.z-other.z,len=Math.hypot(x,z);if(len>.001&&len<.85){sx+=x/len*(.85-len)*2;sz+=z/len*(.85-len)*2;}}
      for(const r of this.rocks){const x=s.x-r.x,z=s.z-r.z,len=Math.hypot(x,z);if(len>.001&&len<r.radius+.65){sx+=x/len*3*(1-len/(r.radius+.65));sz+=z/len*3*(1-len/(r.radius+.65));}}
      const safe=this.avoidFences(s,{x:sx,z:sz},dt),speed=Math.hypot(safe.x,safe.z),scale=Math.min(1,2.9/(speed||1))*this.terrainSpeed(s);
      const blend=1-Math.exp(-6*dt);s.vx+=(safe.x*scale-s.vx)*blend;s.vz+=(safe.z*scale-s.vz)*blend;
      const before={x:s.x,z:s.z};s.x+=s.vx*dt;s.z+=s.vz*dt;this.resolve(s,.25,before);
      s.vx=(s.x-before.x)/dt;s.vz=(s.z-before.z)/dt;
      const c=this.corral;if(s.x>c.left+.3&&s.x<c.right-.25&&s.z>c.top+.25&&s.z<c.bottom-.25){s.captured=true;s.vx=s.vz=0;}
    }
    for(const ability of ['boost','bark'] as Ability[])this.cooldowns[ability]=Math.max(0,this.cooldowns[ability]-dt);
    this.boostRemaining=Math.max(0,this.boostRemaining-dt);this.barkPulse=Math.max(0,this.barkPulse-dt);
    this.guided.forEach((time,s)=>{if(time<=dt||s.captured)this.guided.delete(s);else this.guided.set(s,time-dt);});
    if(this.captured===this.sheep.length)this.status='won';else if(this.remaining<=0)this.status='lost';
  }
}
