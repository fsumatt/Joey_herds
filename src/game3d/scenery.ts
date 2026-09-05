import * as T from 'three';
const m = (color: number) => new T.MeshStandardMaterial({ color, roughness: .95 });
export function addCountryside(parent: T.Group, random: () => number) {
  const sphere = new T.IcosahedronGeometry(1, 2), box = new T.BoxGeometry(1, 1, 1), cylinder = new T.CylinderGeometry(1, 1, 1, 8);
  const earth = m(0xd4c5a1), trunk = m(0x836548), leaf = [m(0x698e58), m(0x7d9f5b), m(0x95ad69)];
  const mesh = (g: T.BufferGeometry, material: T.Material, p: number[], s: number[]) => { const o = new T.Mesh(g, material); o.position.set(p[0], p[1], p[2]); o.scale.set(s[0], s[1], s[2]); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o; };
  mesh(new T.CylinderGeometry(35, 35, .2, 64), m(0xb4c69b), [0, -.8, 0], [1, 1, 1]);
  for (const [x, z, h] of [[-14.7, -5, 2.2], [-12, -8.8, 2.5], [-6.5, -9.8, 2.3], [3.5, -10, 2.7], [12.8, -9, 2.4], [15, -3.7, 2.2], [-15, 5.7, 1.8], [15.5, 6.7, 2]]) {
    mesh(cylinder, trunk, [x, h * .35 - .6, z], [.15, h * .9, .15]);
    for (let i = 0; i < 5; i++) { const a = i * 2.4; const o = mesh(sphere, leaf[i % 3], [x + Math.sin(a) * .55, h + (i % 2) * .35 - .6, z + Math.cos(a) * .5], [.85, .9, .85]); o.rotation.y = a; }
    mesh(sphere, leaf[0], [x, -.35, z + .7], [.65, .3, .5]);
  }
  // Small farm buildings sit beyond the fence, leaving every playable route clear.
  mesh(box, m(0xb4775b), [7.8, .25, -9.5], [2.2, 1.8, 1.5]);
  for (const side of [-1, 1]) { const roof = mesh(box, m(0x666958), [7.8, 1.42, -9.5 + side * .48], [2.6, .12, 1.25]); roof.rotation.x = side * .55; }
  mesh(box, m(0x594d3e), [7.8, -.02, -8.73], [.75, 1.25, .05]);
  for (const x of [7.35, 8.25]) mesh(box, m(0xf1dec0), [x, .75, -8.70], [.07, 1.5, .08]);
  for (const z of [-7.7, -8.8]) { const bale = mesh(cylinder, m(0xd4b15d), [10.6, -.15, z], [.48, .7, .48]); bale.rotation.z = Math.PI / 2; }
  // Stepping stones along the outer edge add depth without adding collisions.
  for (let i = 0; i < 22; i++) { const stone = mesh(sphere, earth, [-11 + i, -.58, 8.2 + Math.sin(i * .4) * .2], [.35, .10, .24]); stone.rotation.y = random() * Math.PI; }
  const flowerGeometry = new T.SphereGeometry(.04, 5, 4), flowers = new T.InstancedMesh(flowerGeometry, m(0xf7e4b1), 180), transform = new T.Object3D();
  for (let i = 0; i < 180; i++) { const x = random() * 25 - 12.5, z = i % 2 ? -6.9 - random() : 7.2 + random() * .4; transform.position.set(x, -.5 + random() * .15, z); transform.scale.setScalar(.8 + random()); transform.updateMatrix(); flowers.setMatrixAt(i, transform.matrix); } parent.add(flowers);
}
