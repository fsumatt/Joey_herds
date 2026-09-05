import * as T from 'three';
import { footPose, kneePosition } from './gait';
const material = (color: number, roughness = .85) => new T.MeshStandardMaterial({ color, roughness });
const orb = new T.SphereGeometry(1, 16, 12);
const bone = new T.CylinderGeometry(1, 1, 1, 10);
function shape(parent: T.Object3D, geometry: T.BufferGeometry, mat: T.Material, p: number[], s: number[]) {
  const m = new T.Mesh(geometry, mat); m.position.set(p[0], p[1], p[2]); m.scale.set(s[0], s[1], s[2]); m.castShadow = true; parent.add(m); return m;
}
type Leg = { root: T.Group; upper: T.Mesh; lower: T.Mesh; paw: T.Mesh; knee: T.Mesh; front: boolean };
export class AnimalRig {
  readonly root = new T.Group(); readonly body = new T.Group(); readonly head = new T.Group();
  private legs: Leg[] = []; private phase = 0; private blend = 0; private tail?: T.Object3D;
  constructor(readonly dog = false) {
    this.root.add(this.body); this.body.add(this.head);
    const dark = material(dog ? 0xad642d : 0x685e53), ivory = material(0xfff5df), hoof = material(dog ? 0xffefd4 : 0x423c35);
    const h = dog ? .43 : .38;
    for (const x of [-1, 1]) for (const front of [true, false]) {
      const root = new T.Group(); root.position.set(x * (dog ? .185 : .20), h, front ? (dog ? .30 : .28) : (dog ? -.49 : -.27)); this.root.add(root);
      const upper = shape(root, bone, dark, [0, 0, 0], [.065, .2, .065]);
      const lower = shape(root, bone, dog ? ivory : dark, [0, 0, 0], [.05, .2, .05]);
      const knee = shape(root, orb, dark, [0, 0, 0], [.062, .062, .062]);
      const paw = shape(root, orb, hoof, [0, 0, 0], [dog ? .10 : .065, .055, dog ? .14 : .09]);
      this.legs.push({ root, upper, lower, knee, paw, front });
    }
    if (!dog) {
      const wool = material(0xf6edd8), shade = material(0xe8dfc7), face = material(0x736656), nose = material(0x39332f), pink = material(0xc4a192);
      shape(this.body, orb, wool, [0, .57, 0], [.34, .32, .49]);
      // Overlapping soft curls give the wool a clear silhouette at gameplay scale.
      for (const darker of [false, true]) {
        const curls = new T.InstancedMesh(orb, darker ? shade : wool, darker ? 5 : 17), transform = new T.Object3D(); let index = 0;
        for (let i = 0; i < 22; i++) {
          if ((i % 5 === 0) !== darker) continue;
          const a = i * 2.39996, y = 1 - 2 * (i + .5) / 22, r = Math.sqrt(1 - y * y);
          transform.position.set(Math.cos(a) * r * .28, .59 + y * .23, Math.sin(a) * r * .4); transform.scale.set(.14, .14, .15); transform.updateMatrix(); curls.setMatrixAt(index++, transform.matrix);
        }
        curls.castShadow = true; this.body.add(curls);
      }
      this.head.position.set(0, .64, .35);
      shape(this.head, orb, face, [0, 0, .06], [.19, .20, .24]);
      shape(this.head, orb, nose, [0, -.05, .24], [.12, .085, .08]);
      shape(this.head, orb, wool, [0, .14, -.015], [.20, .12, .17]);
      for (const x of [-1, 1]) {
        const ear = shape(this.head, orb, face, [x * .22, .03, -.01], [.14, .055, .085]); ear.rotation.z = x * -.3;
        shape(this.head, orb, pink, [x * .24, .065, .002], [.085, .013, .045]);
        shape(this.head, orb, ivory, [x * .115, .035, .235], [.051, .058, .035]);
        shape(this.head, orb, nose, [x * .115, .035, .26], [.024, .032, .012]);
      }
      this.tail = shape(this.body, orb, wool, [0, .61, -.49], [.10, .12, .15]);
    }
  }
  update(dt: number, speed: number, frozen = false) {
    const running = T.MathUtils.clamp((speed - 1.0) / (this.dog ? 4 : 1.7), 0, 1);
    const goal = speed > .035 && !frozen ? 1 : 0;
    this.blend += (goal - this.blend) * (1 - Math.exp(-dt * 16));
    if (frozen) this.blend = 0;
    const stride = (this.dog ? .38 : .32) + running * .16;
    const stance = .64 - running * .12;
    this.phase += speed * dt * stance / stride;
    const offsets = [0, .25 + .25 * running, .5, .75 * (1 - running)];
    this.legs.forEach((leg, i) => {
      const pose = footPose(this.phase + offsets[i], running, stride, .09 + running * .09);
      const z = pose.forward * this.blend, y = .058 - leg.root.position.y + pose.up * this.blend;
      const upper = this.dog ? .235 : .21, lower = this.dog ? .235 : .21;
      const k = kneePosition(z, -y, upper, lower, leg.front ? 1 : -1);
      const knee = new T.Vector3(0, -k.down, k.forward), foot = new T.Vector3(0, y, z);
      this.segment(leg.upper, new T.Vector3(), knee, this.dog ? .068 : .052);
      this.segment(leg.lower, knee, foot, this.dog ? .056 : .038);
      leg.knee.position.copy(knee); leg.paw.position.copy(foot);
    });
    this.body.position.y = Math.sin(this.phase * Math.PI * 4) * .018 * this.blend;
    this.body.rotation.z = Math.sin(this.phase * Math.PI * 2) * .025 * this.blend;
    this.body.rotation.x = Math.sin(this.phase * Math.PI * 4 + .7) * .02 * this.blend;
    if (!this.dog) { this.head.rotation.x = -this.body.rotation.x * .6; if (this.tail) this.tail.rotation.y = Math.sin(this.phase * Math.PI * 2 + 1) * .12 * this.blend; }
  }
  private segment(mesh: T.Mesh, a: T.Vector3, b: T.Vector3, radius: number) {
    const axis = b.clone().sub(a); mesh.position.copy(a).add(b).multiplyScalar(.5); mesh.scale.set(radius, axis.length(), radius); mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), axis.normalize());
  }
}
