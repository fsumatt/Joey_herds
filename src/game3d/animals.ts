import * as T from 'three';
import { footPose, kneePosition } from './gait';
const material = (color: number, roughness = .85) => new T.MeshStandardMaterial({ color, roughness });
const orb = new T.SphereGeometry(1, 16, 12);

function shape(parent: T.Object3D, geometry: T.BufferGeometry, mat: T.Material, p: number[], s: number[]) {
  const m = new T.Mesh(geometry, mat); m.position.set(p[0], p[1], p[2]); m.scale.set(s[0], s[1], s[2]); m.castShadow = true; parent.add(m); return m;
}
type Leg = { root: T.Group; skin: T.Mesh<T.BufferGeometry>; paw: T.Mesh; front: boolean };
export class AnimalRig {
  readonly root = new T.Group(); readonly body = new T.Group(); readonly head = new T.Group();
  private legs: Leg[] = []; private phase = 0; private blend = 0; private tail?: T.Object3D;
  constructor(readonly dog = false) {
    this.root.add(this.body); this.body.add(this.head);
    const dark = material(dog ? 0xc5823b : 0x685e53), ivory = material(0xfff5df), hoof = material(dog ? 0xffefd4 : 0x423c35);
    const h = dog ? .43 : .38;
    for (const x of [-1, 1]) for (const front of [true, false]) {
      const root = new T.Group(); root.position.set(x * (dog ? .185 : .20), h, front ? (dog ? .30 : .28) : (dog ? -.49 : -.27)); this.root.add(root);
      // One continuous tapered surface, rather than exposed ball-and-stick joints.
      const geometry=new T.BufferGeometry(),vertices=new Float32Array(11*10*3),indices:number[]=[];
      geometry.setAttribute('position',new T.BufferAttribute(vertices,3).setUsage(T.DynamicDrawUsage));
      for(let row=0;row<10;row++)for(let side=0;side<10;side++){const a=row*10+side,b=row*10+(side+1)%10;indices.push(a,b,a+10,b,b+10,a+10);}
      geometry.setIndex(indices);geometry.addGroup(0,6*10*6,0);geometry.addGroup(6*10*6,4*10*6,1);
      const skin=new T.Mesh(geometry,[dark,dog?ivory:dark]);skin.castShadow=true;root.add(skin);
      const paw = shape(root, orb, hoof, [0, 0, 0], [dog ? .087 : .057, .05, dog ? .115 : .075]);
      this.legs.push({ root, skin, paw, front });
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
    const stride = (this.dog ? .24 : .23) + running * .09;
    const stance = .64 - running * .12;
    this.phase += Math.min(this.dog ? 4.5 : 3.4, speed * stance / stride) * dt;
    const offsets = [0, .75 - .25 * running, .5, .25 * (1 - running)];
    this.legs.forEach((leg, i) => {
      const pose = footPose(this.phase + offsets[i], running, stride, .035 + running * .035);
      const z = pose.forward * this.blend, y = .058 - leg.root.position.y + pose.up * this.blend;
      const upper = this.dog ? .202 : .178, lower = this.dog ? .202 : .178;
      const k = kneePosition(z, -y, upper, lower, leg.front ? -1 : 1);
      const knee = new T.Vector3(0, -k.down, k.forward), foot = new T.Vector3(0, y, z);
      const control=knee.clone().multiplyScalar(2).addScaledVector(foot,-.5);
      const positions=leg.skin.geometry.getAttribute('position') as T.BufferAttribute;
      for(let row=0;row<=10;row++){
        const t=row/10,cy=2*(1-t)*t*control.y+t*t*foot.y,cz=2*(1-t)*t*control.z+t*t*foot.z;
        const dy=2*(1-2*t)*control.y+2*t*foot.y,dz=2*(1-2*t)*control.z+2*t*foot.z,len=Math.hypot(dy,dz)||1;
        const radius=this.dog ? .066+(leg.front ? .038 : .05)*(1-t)**2 : .033+.029*(1-t)**2;
        for(let side=0;side<10;side++){const a=side/10*Math.PI*2;positions.setXYZ(row*10+side,Math.cos(a)*radius,cy+Math.sin(a)*radius*dz/len,cz-Math.sin(a)*radius*dy/len);}
      }
      positions.needsUpdate=true;leg.skin.geometry.computeVertexNormals();leg.skin.geometry.computeBoundingSphere();leg.paw.position.copy(foot);
    });
    this.body.position.y = Math.sin(this.phase * Math.PI * 4) * .009 * this.blend;
    this.body.rotation.z = Math.sin(this.phase * Math.PI * 2) * .012 * this.blend;
    this.body.rotation.x = Math.sin(this.phase * Math.PI * 4 + .7) * .01 * this.blend;
    if (!this.dog) { this.head.rotation.x = -this.body.rotation.x * .6; if (this.tail) this.tail.rotation.y = Math.sin(this.phase * Math.PI * 2 + 1) * .12 * this.blend; }
  }
}
