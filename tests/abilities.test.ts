import test from 'node:test';
import assert from 'node:assert/strict';
import { HerdSimulation, bounds } from '../src/game3d/simulation';
import { levels } from '../src/game/levels';
const game = () => new HerdSimulation(levels[0], () => .5);
const advance = (g: HerdSimulation, seconds: number, input = { x: 0, z: 0 }) => { for (let i = 0; i < Math.round(seconds * 100); i++) g.step(.01, input); };
test('boost doubles speed for exactly one second, then returns to normal', () => {
  const g = game(); const start = g.joey.x; assert.equal(g.activate('boost'), true);
  advance(g, 1, { x: 1, z: 0 }); assert.ok(Math.abs(g.joey.x - start - 5.2 * 2.15) < .001);
  const end = g.joey.x; advance(g, .1, { x: 1, z: 0 }); assert.ok(Math.abs(g.joey.x - end - .52) < .001); assert.equal(g.boostRemaining, 0);
});
test('boost cannot stack and recharges in five seconds', () => { const g = game();g.activate('boost');assert.equal(g.activate('boost'), false);advance(g, 4.9);assert.equal(g.activate('boost'), false);advance(g, .1);assert.equal(g.activate('boost'), true); });
test('boost respects collision boundaries', () => { const g = game(); g.activate('boost');advance(g, 1, { x: -1, z: 0 });assert.ok(g.joey.x >= bounds.left); });
test('bark is a small nudge, not an override of flight or extra speed', () => {
 const a=game(),b=game();for(const g of [a,b]){g.sheep=[{x:0,z:0,vx:0,vz:0,angle:Math.PI,wander:1,captured:false}];g.joey={x:1,z:0};}
 a.activate('bark');advance(a,.85);advance(b,.85);
 assert.ok(a.sheep[0].x<-.3,'sheep must still flee from Joey');
 assert.ok(a.sheep[0].x>b.sheep[0].x,'bark should slightly bias toward home');
 assert.ok(a.sheep[0].x-b.sheep[0].x<.65,'bark displacement is too strong');
});
test('bark has an exact fifteen-second recharge',()=>{const g=game();g.activate('bark');assert.equal(g.activate('bark'),false);advance(g,14.9);assert.equal(g.activate('bark'),false);advance(g,.1);assert.equal(g.activate('bark'),true);});
test('bark does not affect distant or captured sheep',()=>{
 const a=game(),b=game();a.joey=b.joey={x:-12,z:0};a.sheep[0].captured=b.sheep[0].captured=true; a.activate('bark');advance(a,.3);advance(b,.3);assert.deepEqual(a.sheep,b.sheep);
});
test('abilities reset on retry and cannot activate after a result',()=>{const g=game();g.activate('bark');g.activate('boost');const fresh=game();assert.deepEqual(fresh.cooldowns,{bark:0,boost:0});g.status='won';assert.equal(g.activate('bark'),false);});
