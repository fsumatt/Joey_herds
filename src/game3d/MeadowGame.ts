import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { levels } from '../game/levels';
import { HerdSimulation, type Vec } from './simulation';

const palette = { grass: 0x9ebd70, wood: 0xe7c591, wool: 0xfff3dc, ink: 0x514935 };
const mat = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: .88 });
export class MeadowGame {
  private renderer!: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-18, 18, 12, -12, .1, 120);
  private terrain = new THREE.Group();
  private dog = new THREE.Group();
  private flock: THREE.Group[] = [];
  private sheepLegs: THREE.Group[][] = [];
  private gaitPhases: number[] = [];
  private mixer?: THREE.AnimationMixer;
  private model?: THREE.Group;
  private marker = new THREE.Mesh(new THREE.RingGeometry(.28, .4, 32), new THREE.MeshBasicMaterial({ color: 0xffdf79, side: THREE.DoubleSide }));
  private sim = new HerdSimulation(levels[0]);
  private ui = document.createElement('div');
  private hud = document.createElement('div');
  private status: 'loading' | 'menu' | 'playing' | 'paused' | 'result' | 'error' = 'loading';
  private keys = new Set<string>();
  private resizeObserver?: ResizeObserver;
  private disposed = false;
  private raf = 0;
  private previous = 0;
  private elapsed = 0;
  private lastHud = '';
  private abort = new AbortController();
  private ray = new THREE.Raycaster();
  private ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private cameraRight = new THREE.Vector3();
  private cameraDown = new THREE.Vector3();
  constructor(private host: HTMLElement) {
    this.ui.className = 'overlay'; this.hud.className = 'hud'; host.append(this.hud, this.ui);
    this.ui.innerHTML = '<section class="panel loading"><span class="eyebrow">JOEY HERDS · 3D</span><h1>A little corgi.<br>A big day out.</h1><p>Getting Joey and the meadow ready…</p></section>';
    try { this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); }
    catch { this.fail('This browser could not start 3D graphics. Enable hardware acceleration or try another browser.'); return; }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0xdde7ce); this.renderer.domElement.setAttribute('aria-label', '3D pasture. Click or tap to move Joey. Use arrow keys or WASD to steer.');
    this.renderer.domElement.tabIndex = 0; host.prepend(this.renderer.domElement);
    this.scene.add(this.terrain, this.dog, this.marker);
    this.scene.add(new THREE.HemisphereLight(0xfff9e9, 0x637447, 2.1));
    const sun = new THREE.DirectionalLight(0xffefcd, 3.1); sun.position.set(-10, 22, 12); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 18, bottom: -18, near: .5, far: 65 }); sun.shadow.normalBias = .035; this.scene.add(sun);
    this.camera.position.set(8, 20, 25); this.camera.lookAt(0, 0, .4); this.camera.updateMatrixWorld();
    this.cameraRight.setFromMatrixColumn(this.camera.matrixWorld, 0).setY(0).normalize();
    this.cameraDown.setFromMatrixColumn(this.camera.matrixWorld, 1).setY(0).normalize().negate();
    this.marker.rotation.x = -Math.PI / 2; this.marker.position.y = .025; this.marker.visible = false;
    const options = { signal: this.abort.signal };
    this.renderer.domElement.addEventListener('pointerdown', this.pointer, options);
    window.addEventListener('keydown', this.keyDown, options); window.addEventListener('keyup', this.keyUp, options);
    window.addEventListener('blur', this.onBlur, options); document.addEventListener('visibilitychange', this.onVisibility, options);
    this.renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); this.fail('3D graphics were interrupted. Reload to return to the meadow.'); }, options);
    this.resizeObserver = new ResizeObserver(this.resize); this.resizeObserver.observe(host);
    this.buildLevel(1); this.resize(); this.raf = requestAnimationFrame(this.frame);
    new GLTFLoader().load(`${import.meta.env.BASE_URL}assets/models/joey.glb`, gltf => {
      if (this.disposed) { this.release(gltf.scene); return; }
      this.model = gltf.scene; this.model.scale.setScalar(.65); this.model.traverse(o => { if (o instanceof THREE.Mesh) o.castShadow = true; });
      this.dog.add(this.model); this.mixer = new THREE.AnimationMixer(this.model);
      gltf.animations.forEach(clip => this.mixer!.clipAction(clip).play());
      if (this.status === 'loading') this.menu();
    }, undefined, () => { if (!this.disposed) this.fail('Joey’s model could not load. Check your connection and reload to try again.'); });
  }
  private fail(message: string) {
    this.status = 'error'; this.keys.clear(); this.ui.hidden = false; this.hud.hidden = true;
    this.ui.innerHTML = `<section class="panel"><span class="eyebrow">JOEY HERDS</span><h1>A small hiccup</h1><p>${message}</p><button data-action="reload">Reload game</button></section>`;
    this.ui.querySelector('button')?.addEventListener('click', () => location.reload());
  }
  private mesh(geometry: THREE.BufferGeometry, material: THREE.Material, position: number[], scale: number[], parent: THREE.Object3D = this.terrain) {
    const m = new THREE.Mesh(geometry, material); m.position.set(position[0], position[1], position[2]); m.scale.set(scale[0], scale[1], scale[2]); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  private buildLevel(id: number) {
    this.release(this.terrain); this.terrain.clear(); this.flock = []; this.sheepLegs = []; this.gaitPhases = []; this.sim = new HerdSimulation(levels[id - 1]);
    const box = new THREE.BoxGeometry(1, 1, 1), sphere = new THREE.SphereGeometry(1, 10, 8);
    const grass = mat(palette.grass), wood = mat(palette.wood), darkWood = mat(0xab8054), wool = mat(palette.wool), face = mat(palette.ink);
    this.mesh(box, mat(0x769353), [0, -.38, .55], [26, .7, 13.6]);
    this.mesh(box, grass, [0, -.045, .55], [26.05, .18, 13.65]);
    // A simple repeatable scattering keeps the landscape stable when retrying.
    let seed = id * 891; const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const tufts = new THREE.InstancedMesh(new THREE.ConeGeometry(.035, .19, 3), mat(0x749d53), 400); const transform = new THREE.Object3D();
    for (let i = 0; i < 400; i++) { transform.position.set(rand() * 25 - 12.5, .1, rand() * 12.5 - 5.7); transform.rotation.y = rand() * Math.PI; transform.updateMatrix(); tufts.setMatrixAt(i, transform.matrix); } this.terrain.add(tufts);
    const flowerMat = mat(0xffe9a6);
    for (let i = 0; i < 35; i++) this.mesh(sphere, flowerMat, [rand() * 24 - 12, .08, rand() * 12 - 5.4], [.045, .045, .045]);
    const fence = (a: Vec, b: Vec, low = false) => {
      const length = Math.hypot(b.x - a.x, b.z - a.z), count = Math.ceil(length / 1.15);
      for (let i = 0; i <= count; i++) { const t = i / count; this.mesh(box, wood, [a.x + (b.x - a.x) * t, .39, a.z + (b.z - a.z) * t], [.12, .84, .12]); }
      for (const height of low ? [.27] : [.28, .61]) { const rail = this.mesh(box, wood, [(a.x + b.x) / 2, height, (a.z + b.z) / 2], [length, .085, .07]); rail.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x); }
    };
    fence({ x: -12.7, z: -5.8 }, { x: 12.7, z: -5.8 }); fence({ x: -12.7, z: -5.8 }, { x: -12.7, z: 6.95 }, true);
    fence({ x: 12.7, z: -5.8 }, { x: 12.7, z: 6.95 }, true);
    const c = this.sim.corral;
    this.mesh(box, mat(0xc6cb88), [(c.left + c.right) / 2, .055, (c.top + c.bottom) / 2], [c.right - c.left, .025, c.bottom - c.top]);
    fence({ x: c.left, z: c.top }, { x: c.right, z: c.top }); fence({ x: c.right, z: c.top }, { x: c.right, z: c.bottom }); fence({ x: c.left, z: c.bottom }, { x: c.right, z: c.bottom });
    this.mesh(box, darkWood, [c.right - .35, 1, c.top], [.09, 1.7, .09]);
    const flag = this.mesh(new THREE.PlaneGeometry(.62, .4), new THREE.MeshStandardMaterial({ color: 0xe6a453, side: THREE.DoubleSide }), [c.right - .03, 1.62, c.top], [1, 1, 1]); flag.rotation.y = .3;
    // Entrance arrows point toward the open side of the corral.
    for (let i = 0; i < 3; i++) { const arrow = this.mesh(new THREE.ConeGeometry(.12, .28, 3), mat(0xfff4cc), [c.left - .7 + i * .24, .07, (c.top + c.bottom) / 2], [1, 1, .25]); arrow.rotation.z = -Math.PI / 2; }
    for (const r of this.sim.rocks) { const rock = this.mesh(new THREE.DodecahedronGeometry(1, 0), mat(0x9aa094), [r.x, r.radius * .35, r.z], [r.radius, r.radius * .65, r.radius]); rock.rotation.set(.15, rand() * 3, .12); }
    for (const s of this.sim.sheep) {
      const group = new THREE.Group(); this.terrain.add(group);
      this.mesh(sphere, wool, [0, .46, 0], [.32, .31, .46], group);
      const legs: THREE.Group[] = [];
      for (const x of [-.17, .17]) for (const z of [-.23, .23]) {
        const hip = new THREE.Group(); hip.position.set(x, .31, z); group.add(hip);
        this.mesh(box, face, [0, -.15, 0], [.08, .3, .08], hip); legs.push(hip);
      }
      this.sheepLegs.push(legs); this.gaitPhases.push(this.flock.length * .9);
      this.mesh(sphere, face, [0, .53, .39], [.2, .2, .21], group);
      for (const x of [-.22, .22]) this.mesh(sphere, face, [x, .59, .32], [.13, .055, .07], group);
      for (const x of [-.09, .09]) this.mesh(sphere, wool, [x, .58, .565], [.035, .04, .024], group);
      this.mesh(sphere, wool, [0, .5, -.44], [.12, .12, .14], group);
      group.position.set(s.x, 0, s.z); this.flock.push(group);
    }
    this.sync(0); this.marker.visible = false;
  }
  private menu = () => {
    this.status = 'menu'; this.keys.clear(); this.hud.hidden = true; this.ui.hidden = false;
    this.ui.innerHTML = `<section class="panel menu splash"><div class="splash-art"><img src="${import.meta.env.BASE_URL}assets/art/joey-and-luka.webp" alt="Stylized illustration of Joey the corgi with Luka" width="1536" height="1024" /><span>JOEY &amp; LUKA</span></div><div class="splash-content"><span class="eyebrow">A LITTLE CORGI. A BIG DAY OUT.</span><h1>Joey Herds<span class="badge">3D</span></h1><p>Round up the flock. Find your rhythm.<br>Bring every sheep safely home.</p><div class="level-list">${levels.map(l => `<button class="level" data-level="${l.id}"><span class="level-number">0${l.id}</span><span><strong>${l.name}</strong><small>${l.sheep.length} sheep · ${l.seconds} seconds</small></span><span aria-hidden="true">↗</span></button>`).join('')}</div><p class="help">Click or tap to move · WASD / arrow keys<br>Stand behind the sheep to guide them into the open corral.</p></div></section>`;
    this.ui.querySelectorAll<HTMLButtonElement>('[data-level]').forEach(b => b.addEventListener('click', () => this.start(Number(b.dataset.level))));
  };
  private start(id: number) { this.buildLevel(id); this.status = 'playing'; this.keys.clear(); this.ui.hidden = true; this.hud.hidden = false; this.lastHud = ''; this.updateHud(); this.previous = performance.now(); this.renderer.domElement.focus({ preventScroll: true }); }
  private updateHud() {
    const text = `${this.sim.level.id}-${this.sim.captured}-${Math.ceil(this.sim.remaining)}`; if (text === this.lastHud) return; this.lastHud = text;
    this.hud.innerHTML = `<div class="brand"><strong>Joey Herds <em>3D</em></strong><small>${this.sim.level.name}</small></div><div class="score"><span>HOME</span><strong>${this.sim.captured}<i> / ${this.sim.sheep.length}</i></strong></div><div class="time ${this.sim.remaining < 15 ? 'urgent' : ''}"><span>TIME LEFT</span><strong>${Math.floor(Math.ceil(this.sim.remaining) / 60)}:${String(Math.ceil(this.sim.remaining) % 60).padStart(2, '0')}</strong></div><button class="pause" aria-label="Pause game">Ⅱ</button><div class="control-hint">Click to move · Herd toward the flag</div>`;
    this.hud.querySelector('button')?.addEventListener('click', this.pause);
  }
  private pause = () => {
    if (this.status !== 'playing') return; this.status = 'paused'; this.keys.clear(); this.sim.target = undefined; this.ui.hidden = false;
    this.ui.innerHTML = '<section class="panel compact"><span class="eyebrow">TAKE A BREATHER</span><h1>Good dog.<br>Short break.</h1><p>The flock will wait right here.</p><button data-resume>Back to the meadow</button><button class="secondary" data-menu>Choose a meadow</button></section>';
    this.ui.querySelector('[data-resume]')?.addEventListener('click', this.resume); this.ui.querySelector('[data-menu]')?.addEventListener('click', this.menu);
  };
  private resume = () => { if (this.status !== 'paused') return; this.status = 'playing'; this.ui.hidden = true; this.previous = performance.now(); this.renderer.domElement.focus({ preventScroll: true }); };
  private result() {
    this.status = 'result'; this.keys.clear(); this.ui.hidden = false; const won = this.sim.status === 'won';
    this.ui.innerHTML = `<section class="panel compact" role="status"><span class="eyebrow">${this.sim.level.name.toUpperCase()}</span><h1>${won ? 'Every sheep.<br>Safely home.' : 'One more<br>round, Joey?'}</h1><p>${won ? 'A very good dog, and a very happy flock.' : 'Time’s up. The meadow is ready for another try.'}</p><div class="result-score">${this.sim.captured}<span> / ${this.sim.sheep.length} sheep home</span></div><button data-retry>Play again</button>${won && this.sim.level.id < levels.length ? '<button data-next>Next meadow →</button>' : ''}<button class="secondary" data-menu>Choose a meadow</button></section>`;
    this.ui.querySelector('[data-retry]')?.addEventListener('click', () => this.start(this.sim.level.id)); this.ui.querySelector('[data-next]')?.addEventListener('click', () => this.start(this.sim.level.id + 1)); this.ui.querySelector('[data-menu]')?.addEventListener('click', this.menu);
  }
  private pointer = (event: PointerEvent) => {
    if (this.status !== 'playing' || event.button !== 0) return;
    this.renderer.domElement.focus({ preventScroll: true });
    const rect = this.renderer.domElement.getBoundingClientRect(); this.ray.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), this.camera);
    const point = this.ray.ray.intersectPlane(this.ground, new THREE.Vector3()); if (point) this.sim.moveTo({ x: point.x, z: point.z });
  };
  private keyDown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (key === 'escape' && !event.repeat) { this.status === 'paused' ? this.resume() : this.pause(); return; }
    if (this.status === 'playing' && ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) { event.preventDefault(); this.keys.add(key); }
  };
  private keyUp = (event: KeyboardEvent) => { this.keys.delete(event.key.toLowerCase()); };
  private onBlur = () => { this.keys.clear(); this.pause(); };
  private onVisibility = () => { if (document.hidden) this.onBlur(); };
  private resize = () => {
    if (this.disposed || !this.renderer) return;
    const w = Math.max(1, this.host.clientWidth), h = Math.max(1, this.host.clientHeight); this.renderer.setSize(w, h);
    // Project the pasture corners into camera space to fit every meadow at any aspect ratio.
    this.camera.position.set(...(w < h ? [30, 36, 4] : [8, 20, 25]) as [number, number, number]);
    this.camera.lookAt(0, 0, .4); this.camera.updateMatrixWorld();
    this.cameraRight.setFromMatrixColumn(this.camera.matrixWorld, 0).setY(0).normalize();
    this.cameraDown.setFromMatrixColumn(this.camera.matrixWorld, 1).setY(0).normalize().negate();
    let maxX = 0, maxY = 0;
    for (const x of [-13.5, 13.5]) for (const z of [-6.4, 7.5]) for (const y of [0, 2]) { const p = new THREE.Vector3(x, y, z).applyMatrix4(this.camera.matrixWorldInverse); maxX = Math.max(maxX, Math.abs(p.x)); maxY = Math.max(maxY, Math.abs(p.y)); }
    const halfH = Math.max(maxY * 1.16, maxX * h / w * 1.08); this.camera.left = -halfH * w / h; this.camera.right = halfH * w / h; this.camera.top = halfH; this.camera.bottom = -halfH; this.camera.updateProjectionMatrix();
  };
  private sync(dt: number) {
    this.dog.position.set(this.sim.joey.x, 0, this.sim.joey.z);
    const angle = this.sim.facing - this.dog.rotation.y; this.dog.rotation.y += Math.atan2(Math.sin(angle), Math.cos(angle)) * Math.min(1, dt * 15 || 1);
    if (this.mixer && this.status === 'playing') { if (this.sim.moving) this.mixer.update(dt * 1.9); else this.mixer.setTime(0); }
    this.flock.forEach((group, i) => {
      const s = this.sim.sheep[i];
      const speed = s.captured ? 0 : Math.hypot(s.vx, s.vz);
      const stride = Math.min(1, speed / 1.5);
      // Distance-driven phases make a calm walk become a quick trot when fleeing.
      this.gaitPhases[i] += speed * dt * 8;
      const phase = this.gaitPhases[i];
      this.sheepLegs[i].forEach((leg, j) => {
        const opposite = j === 0 || j === 3 ? 0 : Math.PI;
        leg.rotation.x = Math.sin(phase + opposite) * .65 * stride;
      });
      group.position.set(s.x, s.captured ? .025 : Math.abs(Math.sin(phase)) * .06 * stride, s.z);
      if (speed > .05) {
        const angle = Math.atan2(s.vx, s.vz) - group.rotation.y;
        group.rotation.y += Math.atan2(Math.sin(angle), Math.cos(angle)) * Math.min(1, dt * 12 || 1);
      }
      group.scale.setScalar(s.captured ? .9 : 1);
    });
    this.marker.visible = !!this.sim.target && this.status === 'playing'; if (this.sim.target) this.marker.position.set(this.sim.target.x, .13, this.sim.target.z);
  }
  private frame = (now: number) => {
    if (this.disposed) return; const dt = Math.min((now - (this.previous || now)) / 1000, .05); this.previous = now;
    if (this.status === 'playing') {
      this.elapsed += dt; const has = (...keys: string[]) => keys.some(k => this.keys.has(k)); const x = Number(has('d', 'arrowright')) - Number(has('a', 'arrowleft')), y = Number(has('s', 'arrowdown')) - Number(has('w', 'arrowup'));
      this.sim.step(dt, { x: this.cameraRight.x * x + this.cameraDown.x * y, z: this.cameraRight.z * x + this.cameraDown.z * y }); this.sync(dt); this.updateHud(); if (this.sim.status !== 'playing') this.result();
    }
    this.renderer.render(this.scene, this.camera); this.raf = requestAnimationFrame(this.frame);
  };
  private release(root: THREE.Object3D) {
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    root.traverse(o => { if (o instanceof THREE.Mesh) { geometries.add(o.geometry); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m)); } }); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
  }
  dispose() { this.disposed = true; cancelAnimationFrame(this.raf); this.abort.abort(); this.resizeObserver?.disconnect(); this.mixer?.stopAllAction(); if (this.model) this.mixer?.uncacheRoot(this.model); this.release(this.scene); this.renderer?.dispose(); this.host.replaceChildren(); }
}
