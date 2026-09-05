import test from 'node:test';
import assert from 'node:assert/strict';
import { HerdSimulation, bounds } from '../src/game3d/simulation';
import { levels } from '../src/game/levels';
const game = (id = 0) => new HerdSimulation(levels[id], () => .5);
const advance = (s: HerdSimulation, seconds: number, input = { x: 0, z: 0 }) => { for (let i = 0; i < seconds * 60; i++) s.step(1 / 60, input); };
test('all five meadows preserve sheep counts and timers', () => { for (let i = 0; i < 5; i++) { const s = game(i); assert.equal(s.sheep.length, levels[i].sheep.length); assert.equal(s.remaining, levels[i].seconds); } });
test('tap destination arrives without overshooting and clears marker', () => { const s = game(); s.moveTo({ x: -6, z: 0 }); advance(s, 1); assert.ok(Math.abs(s.joey.x + 6) < .08); assert.equal(s.target, undefined); });
test('keyboard cancels tap movement and diagonal movement is normalized', () => { const a = game(), b = game(); a.moveTo({ x: 0, z: 0 }); const start = { ...a.joey }; advance(a, .2, { x: 1, z: 1 }); advance(b, .2, { x: 1, z: 0 }); assert.equal(a.target, undefined); assert.ok(Math.abs(Math.hypot(a.joey.x - start.x, a.joey.z - start.z) - (b.joey.x - start.x)) < .001); });
test('Joey remains inside pasture', () => { const s = game(); advance(s, 8, { x: -1, z: -1 }); assert.ok(s.joey.x >= bounds.left && s.joey.z >= bounds.top); });
test('sheep flee away from Joey', () => { const s = game(); s.sheep = [{ x: 0, z: 0, vx: 0, vz: 0, angle: 0, wander: 1, captured: false }]; s.joey = { x: -1, z: 0 }; advance(s, .5); assert.ok(s.sheep[0].x > .1); });
test('corral capture is permanent and wins when flock is home', () => { const s = game(); s.sheep.forEach(p => { p.x = s.corral.left + 1; p.z = s.corral.top + 1; }); s.step(1 / 60); assert.equal(s.status, 'won'); assert.equal(s.captured, 5); const remaining = s.remaining; advance(s, 1); assert.equal(s.remaining, remaining); });
test('timeout loses and retry resets all state', () => { const s = game(); s.remaining = .01; s.step(.02); assert.equal(s.status, 'lost'); const reset = game(); assert.equal(reset.status, 'playing'); assert.equal(reset.remaining, 75); assert.equal(reset.captured, 0); });
test('rocks prevent Joey from passing through', () => { const s = game(); const r = s.rocks[0]; s.joey = { x: r.x - r.radius - .31, z: r.z }; advance(s, 1, { x: 1, z: 0 }); assert.ok(Math.hypot(s.joey.x - r.x, s.joey.z - r.z) >= r.radius + .299); });
test('closed corral sides block entry', () => { const s = game(); s.joey = { x: s.corral.left + 1, z: s.corral.top - .31 }; advance(s, .5, { x: 0, z: 1 }); assert.ok(s.joey.z <= s.corral.top - .299); });
test('simulation is consistent at 30 and 60 fps', () => { const a = game(), b = game(); for (let i = 0; i < 30; i++) a.step(1 / 30, { x: 1, z: 0 }); for (let i = 0; i < 60; i++) b.step(1 / 60, { x: 1, z: 0 }); assert.ok(Math.abs(a.joey.x - b.joey.x) < 1e-8); assert.ok(Math.abs(a.remaining - b.remaining) < 1e-8); });

// Regressions for sheep that previously remained pinned under sustained pressure.
import { sheepBounds } from '../src/game3d/simulation';
const loneSheep = (x: number, z: number) => ({ x, z, vx: 0, vz: 0, angle: 0, wander: 1, captured: false });
for (const [label, x, z, nx, nz] of [
  ['left', sheepBounds.left, 0, 1, 0], ['right', sheepBounds.right, 0, -1, 0],
  ['top', 0, sheepBounds.top, 0, 1], ['bottom', 0, sheepBounds.bottom, 0, -1],
  ['top left', sheepBounds.left, sheepBounds.top, 1, 1], ['top right', sheepBounds.right, sheepBounds.top, -1, 1],
  ['bottom left', sheepBounds.left, sheepBounds.bottom, 1, -1], ['bottom right', sheepBounds.right, sheepBounds.bottom, -1, -1],
] as [string, number, number, number, number][]) {
  test(`sheep turn away from ${label} even while Joey pushes toward it`, () => {
    const s = game(); s.sheep = [loneSheep(x, z)]; s.joey = { x: x + nx, z: z + nz };
    advance(s, 1.5); const sheep = s.sheep[0];
    if (nx) assert.ok((sheep.x - x) * nx > .3, `${label}: no inward X travel`);
    if (nz) assert.ok((sheep.z - z) * nz > .3, `${label}: no inward Z travel`);
    assert.ok(sheep.x >= sheepBounds.left && sheep.x <= sheepBounds.right);
    assert.ok(sheep.z >= sheepBounds.top && sheep.z <= sheepBounds.bottom);
  });
}
test('Joey can flank a sheep using the outer turning lane', () => {
  const s = game(); s.sheep = [loneSheep(sheepBounds.left + .4, 0)]; s.joey = { x: bounds.left, z: 0 };
  const initial = s.sheep[0].x; advance(s, 1); assert.ok(s.sheep[0].x > initial + .5);
});
test('sheep slide along the outside of a corral fence toward its open end', () => {
  const s = game(); const c = s.corral; const x = c.left + 2;
  s.sheep = [loneSheep(x, c.bottom + .3)]; s.joey = { x, z: c.bottom + 1.2 };
  advance(s, 2); assert.ok(s.sheep[0].x < x - .3); assert.ok(s.sheep[0].z >= c.bottom + .249);
});
test('boundary steering still allows entrance capture', () => {
  const s = game(); const c = s.corral; s.sheep = [loneSheep(c.left - .1, (c.top + c.bottom) / 2)]; s.joey = { x: c.left - 1.5, z: (c.top + c.bottom) / 2 };
  advance(s, 1.5); assert.equal(s.status, 'won');
});
