import { type LevelConfig, type Point } from '../game/levels';
export type Vec = { x: number; z: number };
export const world = (p: Point): Vec => ({ x: (p.x - 640) / 50, z: (p.y - 360) / 50 });
export const bounds = { left: -12.2, right: 12.2, top: -5.44, bottom: 6.6 };
export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
export type Flock = Vec & { vx: number; vz: number; angle: number; wander: number; captured: boolean };
export class HerdSimulation {
  joey: Vec; target?: Vec; moving = false; facing = Math.PI / 2;
  sheep: Flock[]; remaining: number; status: 'playing' | 'won' | 'lost' = 'playing';
  readonly rocks: (Vec & { radius: number })[];
  readonly corral: { left: number; right: number; top: number; bottom: number };
  constructor(readonly level: LevelConfig, private random = Math.random) {
    this.joey = world(level.joeyStart); this.remaining = level.seconds;
    this.sheep = level.sheep.map(p => ({ ...world(p), vx: 0, vz: 0, angle: random() * Math.PI * 2, wander: 0, captured: false }));
    this.rocks = level.obstacles.map(p => ({ ...world(p), radius: p.radius / 50 }));
    const c = world(level.corral); this.corral = { left: c.x, top: c.z, right: c.x + level.corral.width / 50, bottom: c.z + level.corral.height / 50 };
  }
  get captured() { return this.sheep.filter(s => s.captured).length; }
  moveTo(p: Vec) { this.target = { x: clamp(p.x, bounds.left, bounds.right), z: clamp(p.z, bounds.top, bounds.bottom) }; }
  private resolve(p: Vec, radius: number, previous: Vec) {
    for (const rock of this.rocks) {
      let dx = p.x - rock.x, dz = p.z - rock.z; let d = Math.hypot(dx, dz);
      if (d < radius + rock.radius) {
        if (d < .0001) { dx = 1; dz = 0; d = 1; }
        p.x = rock.x + dx / d * (radius + rock.radius); p.z = rock.z + dz / d * (radius + rock.radius);
      }
    }
    // The corral has three solid sides and a fully open entrance on the left.
    const c = this.corral;
    if (p.x > c.left - radius && p.x < c.right + radius) {
      for (const z of [c.top, c.bottom]) if (Math.abs(p.z - z) < radius) p.z = z + (previous.z < z ? -radius : radius);
    }
    if (p.z > c.top - radius && p.z < c.bottom + radius && Math.abs(p.x - c.right) < radius) p.x = c.right + (previous.x < c.right ? -radius : radius);
    p.x = clamp(p.x, bounds.left, bounds.right); p.z = clamp(p.z, bounds.top, bounds.bottom);
  }
  step(dt: number, input: Vec = { x: 0, z: 0 }) {
    if (this.status !== 'playing') return;
    dt = clamp(dt, 0, .05); this.remaining = Math.max(0, this.remaining - dt);
    let dx = input.x, dz = input.z; let d = Math.hypot(dx, dz);
    if (d > 0) this.target = undefined;
    else if (this.target) { dx = this.target.x - this.joey.x; dz = this.target.z - this.joey.z; d = Math.hypot(dx, dz); }
    this.moving = d > .04;
    if (this.moving) {
      const before = { ...this.joey }; const step = Math.min(5.2 * dt, this.target ? d : Infinity);
      this.joey.x += dx / d * step; this.joey.z += dz / d * step; this.resolve(this.joey, .3, before);
      this.facing = Math.atan2(dx, dz);
      if (this.target && Math.hypot(this.target.x - this.joey.x, this.target.z - this.joey.z) < .08) this.target = undefined;
    } else this.target = undefined;
    for (const s of this.sheep) {
      if (s.captured) continue;
      const ax = s.x - this.joey.x, az = s.z - this.joey.z; const distance = Math.hypot(ax, az);
      let sx = 0, sz = 0;
      if (distance < 3.7) { const force = 5.2 * (1 - distance / 3.7); sx = (distance > .001 ? ax / distance : 1) * force; sz = (distance > .001 ? az / distance : 0) * force; }
      else { s.wander -= dt; if (s.wander <= 0) { s.angle = this.random() * Math.PI * 2; s.wander = 1.2 + this.random() * 1.4; } sx = Math.cos(s.angle) * .42; sz = Math.sin(s.angle) * .42; }
      for (const other of this.sheep) { if (other === s || other.captured) continue; const x = s.x - other.x, z = s.z - other.z, len = Math.hypot(x, z); if (len > .001 && len < .8) { sx += x / len * (.8 - len) * 2; sz += z / len * (.8 - len) * 2; } }
      for (const r of this.rocks) { const x = s.x - r.x, z = s.z - r.z, len = Math.hypot(x, z); if (len > .001 && len < r.radius + .9) { sx += x / len * 3.8 * (1 - len / (r.radius + .9)); sz += z / len * 3.8 * (1 - len / (r.radius + .9)); } }
      const blend = 1 - Math.exp(-6 * dt); s.vx += (sx - s.vx) * blend; s.vz += (sz - s.vz) * blend;
      const speed = Math.hypot(s.vx, s.vz); if (speed > 2.9) { s.vx *= 2.9 / speed; s.vz *= 2.9 / speed; }
      const before = { x: s.x, z: s.z }; s.x += s.vx * dt; s.z += s.vz * dt; this.resolve(s, .25, before);
      const c = this.corral;
      if (s.x > c.left + .3 && s.x < c.right - .25 && s.z > c.top + .25 && s.z < c.bottom - .25) { s.captured = true; s.vx = s.vz = 0; }
    }
    if (this.captured === this.sheep.length) this.status = 'won'; else if (this.remaining <= 0) this.status = 'lost';
  }
}
