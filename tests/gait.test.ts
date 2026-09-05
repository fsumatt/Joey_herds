import test from 'node:test';
import assert from 'node:assert/strict';
import { footPose, kneePosition } from '../src/game3d/gait';
test('stance keeps the paw planted and moves backward at constant speed',()=>{const a=footPose(.1,0,.4,.1),b=footPose(.2,0,.4,.1),c=footPose(.3,0,.4,.1);assert.equal(a.up,0);assert.equal(b.up,0);assert.ok(Math.abs((a.forward-b.forward)-(b.forward-c.forward))<1e-9);});
test('swing lifts the paw and the cycle closes continuously',()=>{assert.ok(footPose(.82,0,.4,.1).up>.09);const a=footPose(0,0,.4,.1),b=footPose(1-1e-7,0,.4,.1);assert.ok(Math.abs(a.forward-b.forward)<1e-6);assert.ok(b.up<1e-6);});
test('gaits never send feet below the ground',()=>{for(let i=0;i<100;i++)for(const run of [0,.5,1])assert.ok(footPose(i/100,run,.5,.18).up>=0);});
test('two-joint solve preserves upper and lower limb lengths',()=>{const k=kneePosition(.15,.35,.23,.23,1);assert.ok(Math.abs(Math.hypot(k.forward,k.down)-.23)<1e-8);assert.ok(Math.abs(Math.hypot(.15-k.forward,.35-k.down)-.23)<1e-8);});
