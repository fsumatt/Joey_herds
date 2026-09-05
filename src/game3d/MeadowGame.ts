import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { levels } from '../game/levels';
import { HerdSimulation, type Vec, type Ability } from './simulation';

import { AnimalRig } from './animals';
import { addCountryside } from './scenery';

const palette = { grass: 0x88ab68, wood: 0xe7c591, wool: 0xfff3dc, ink: 0x514935 };
const mat = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: .88 });
export class MeadowGame {
  private renderer!: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-18, 18, 12, -12, .1, 120);
  private terrain = new THREE.Group();
  private dog = new THREE.Group();
  private flock: THREE.Group[] = [];
  private sheepRigs: AnimalRig[] = [];
  private dogRig = new AnimalRig(true);
  private powers = document.createElement('div');
  private audio?: AudioContext;
  private soundMuted = false;
  private barkRing = new THREE.Mesh(new THREE.RingGeometry(.96, 1, 64), new THREE.MeshBasicMaterial({ color: 0xffd16c, side: THREE.DoubleSide, transparent: true, opacity: 0 }));
  private freezeRings: THREE.Mesh[] = [];
  private boostRing = new THREE.Mesh(new THREE.RingGeometry(.45, .52, 32), new THREE.MeshBasicMaterial({ color: 0xffce65, side: THREE.DoubleSide, transparent: true }));

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
    this.powers.className = 'ability-bar'; this.powers.hidden = true;
    this.powers.innerHTML = `<button data-power="boost" title="Move 2.15× faster for 1 second. Recharges in 5 seconds. Space key."><b>↯ Boost</b><small>1 sec · Space</small><span>Ready</span></button><button data-power="bark" title="Guide nearby sheep toward the corral for 3 seconds. Recharges in 15 seconds. B key."><b>◖ Bark</b><small>Nearby sheep · B</small><span>Ready</span></button><button data-power="freeze" title="Stop sheep for 1 second. Recharges in 10 seconds. F key."><b>❄ Sheep Stop</b><small>1 sec · F</small><span>Ready</span></button><button class="sound-toggle" aria-label="Mute bark sound" title="Mute bark sound">♪</button>`;
    this.powers.querySelectorAll<HTMLButtonElement>('[data-power]').forEach(button => button.addEventListener('click', () => this.useAbility(button.dataset.power as Ability)));
    this.powers.querySelector('.sound-toggle')?.addEventListener('click', event => { this.soundMuted = !this.soundMuted; const button = event.currentTarget as HTMLButtonElement; button.textContent = this.soundMuted ? '♩' : '♪'; button.setAttribute('aria-label', this.soundMuted ? 'Enable bark sound' : 'Mute bark sound'); button.setAttribute('aria-pressed', String(this.soundMuted)); });
    host.append(this.powers);
    this.ui.className = 'overlay'; this.hud.className = 'hud'; host.append(this.hud, this.ui);
    this.ui.innerHTML = '<section class="panel loading"><span class="eyebrow">JOEY HERDS · 3D</span><h1>A little corgi.<br>A big day out.</h1><p>Getting Joey and the meadow ready…</p></section>';
    try { this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); }
    catch { this.fail('This browser could not start 3D graphics. Enable hardware acceleration or try another browser.'); return; }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.15;
    this.renderer.setClearColor(0xdde7ce); this.renderer.domElement.setAttribute('aria-label', '3D pasture. Click or tap to move Joey. Use arrow keys or WASD to steer.');
    this.renderer.domElement.tabIndex = 0; host.prepend(this.renderer.domElement);
    this.scene.add(this.terrain, this.dog, this.marker, this.barkRing);
    this.dog.add(this.dogRig.root, this.boostRing);
    this.barkRing.rotation.x = this.boostRing.rotation.x = -Math.PI / 2;
    this.barkRing.position.y = .15; this.boostRing.position.y = .13; this.boostRing.visible = false;
    this.scene.fog = new THREE.Fog(0xdde7ce, 48, 85);
    this.scene.add(new THREE.HemisphereLight(0xfff9e9, 0x718057, 1.8));
    const sun = new THREE.DirectionalLight(0xffefcd, 2.4); sun.position.set(-10, 22, 12); sun.castShadow = true;
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
      // Replace the old rigid leg pieces with two-joint limbs and planted foot paths.
      this.model.traverse(o => { if (/^(Front|Rear)[ _]/.test(o.name)) o.visible = false; });
      this.dogRig.body.add(this.model); this.dogRig.update(.1, 0);
      if (this.status === 'loading') this.menu();
    }, undefined, () => { if (!this.disposed) this.fail('Joey’s model could not load. Check your connection and reload to try again.'); });
  }
  private fail(message: string) {
    this.status = 'error'; this.powers.hidden = true; this.keys.clear(); this.ui.hidden = false; this.hud.hidden = true;
    this.ui.innerHTML = `<section class="panel"><span class="eyebrow">JOEY HERDS</span><h1>A small hiccup</h1><p>${message}</p><button data-action="reload">Reload game</button></section>`;
    this.ui.querySelector('button')?.addEventListener('click', () => location.reload());
  }
  private mesh(geometry: THREE.BufferGeometry, material: THREE.Material, position: number[], scale: number[], parent: THREE.Object3D = this.terrain) {
    const m = new THREE.Mesh(geometry, material); m.position.set(position[0], position[1], position[2]); m.scale.set(scale[0], scale[1], scale[2]); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  private buildLevel(id: number) {
    this.release(this.terrain); this.terrain.clear(); this.flock = []; this.sheepRigs = []; this.freezeRings = []; this.sim = new HerdSimulation(levels[id - 1]);
    const box = new THREE.BoxGeometry(1, 1, 1), sphere = new THREE.SphereGeometry(1, 10, 8);
    const grass = mat(palette.grass), wood = mat(palette.wood), darkWood = mat(0xab8054), wool = mat(palette.wool), face = mat(palette.ink);
    this.mesh(box, mat(0x769353), [0, -.38, .55], [26, .7, 13.6]);
    this.mesh(box, grass, [0, -.045, .55], [26.05, .18, 13.65]);
    // A simple repeatable scattering keeps the landscape stable when retrying.
    let seed = id * 891; const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    addCountryside(this.terrain, rand);
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
      const rig = new AnimalRig(); this.terrain.add(rig.root); rig.root.position.set(s.x, 0, s.z); rig.update(.1, 0);
      this.sheepRigs.push(rig); this.flock.push(rig.root);
      const ring = new THREE.Mesh(new THREE.RingGeometry(.43, .49, 32), new THREE.MeshBasicMaterial({ color: 0xa9edff, side: THREE.DoubleSide, transparent: true, opacity: .9 }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = .14; ring.visible = false; rig.root.add(ring); this.freezeRings.push(ring);
    }
    this.sync(0); this.marker.visible = false;
  }
  private menu = () => {
    this.status = 'menu'; this.powers.hidden = true; this.keys.clear(); this.hud.hidden = true; this.ui.hidden = false;
    this.ui.innerHTML = `<section class="panel menu splash"><div class="splash-art"><img src="${import.meta.env.BASE_URL}assets/art/joey-and-luka.webp" alt="Stylized illustration of Joey the corgi with Luka" width="1536" height="1024" /><span>JOEY &amp; LUKA</span></div><div class="splash-content"><span class="eyebrow">A LITTLE CORGI. A BIG DAY OUT.</span><h1>Joey Herds<span class="badge">3D</span></h1><p>Round up the flock. Find your rhythm.<br>Bring every sheep safely home.</p><div class="level-list">${levels.map(l => `<button class="level" data-level="${l.id}"><span class="level-number">0${l.id}</span><span><strong>${l.name}</strong><small>${l.sheep.length} sheep · ${l.seconds} seconds</small></span><span aria-hidden="true">↗</span></button>`).join('')}</div><p class="help">Click or tap to move · WASD / arrow keys<br>Stand behind the sheep to guide them into the open corral.</p></div></section>`;
    this.ui.querySelectorAll<HTMLButtonElement>('[data-level]').forEach(b => b.addEventListener('click', () => this.start(Number(b.dataset.level))));
  };
  private start(id: number) { this.buildLevel(id); this.status = 'playing'; this.keys.clear(); this.ui.hidden = true; this.hud.hidden = false; this.lastHud = ''; this.updateHud(); this.previous = performance.now(); this.renderer.domElement.focus({ preventScroll: true }); }
  private useAbility(ability: Ability) {
    if (this.status !== 'playing' || !this.sim.activate(ability)) return;
    if (ability === 'bark') {
      this.barkRing.position.set(this.sim.joey.x, .15, this.sim.joey.z); this.playBark();
    }
    this.updatePowers(); this.renderer.domElement.focus({ preventScroll: true });
  }
  private playBark() {
    if (this.soundMuted) return;
    try {
      this.audio ??= new AudioContext(); void this.audio.resume();
      for (const delay of [0, .16]) {
        const start = this.audio.currentTime + delay, oscillator = this.audio.createOscillator(), gain = this.audio.createGain(), filter = this.audio.createBiquadFilter();
        oscillator.type = 'sawtooth'; oscillator.frequency.setValueAtTime(190, start); oscillator.frequency.exponentialRampToValueAtTime(75, start + .12);
        filter.type = 'lowpass'; filter.frequency.value = 650; gain.gain.setValueAtTime(.001, start); gain.gain.exponentialRampToValueAtTime(.07, start + .018); gain.gain.exponentialRampToValueAtTime(.001, start + .13);
        oscillator.connect(filter); filter.connect(gain); gain.connect(this.audio.destination); oscillator.start(start); oscillator.stop(start + .15); oscillator.onended = () => { oscillator.disconnect(); filter.disconnect(); gain.disconnect(); };
      }
    } catch { /* The visual bark and gameplay effect work without audio support. */ }
  }
  private updatePowers() {
    this.powers.hidden = this.status !== 'playing';
    for (const button of this.powers.querySelectorAll<HTMLButtonElement>('[data-power]')) {
      const ability = button.dataset.power as Ability, remaining = this.sim.cooldowns[ability];
      const active = ability === 'boost' ? this.sim.boostRemaining > .001 : ability === 'freeze' ? this.sim.freezeRemaining > .001 : this.sim.barkPulse > 0;
      button.disabled = this.status !== 'playing' || remaining > .0001;
      button.classList.toggle('active', active);
      button.querySelector('span')!.textContent = active ? 'Active!' : remaining > .0001 ? `${Math.ceil(remaining)}s` : 'Ready';
    }
  }
  private updateHud() {
    this.updatePowers();
    const text = `${this.sim.level.id}-${this.sim.captured}-${Math.ceil(this.sim.remaining)}`; if (text === this.lastHud) return; this.lastHud = text;
    this.hud.innerHTML = `<div class="brand"><strong>Joey Herds <em>3D</em></strong><small>${this.sim.level.name}</small></div><div class="score"><span>HOME</span><strong>${this.sim.captured}<i> / ${this.sim.sheep.length}</i></strong></div><div class="time ${this.sim.remaining < 15 ? 'urgent' : ''}"><span>TIME LEFT</span><strong>${Math.floor(Math.ceil(this.sim.remaining) / 60)}:${String(Math.ceil(this.sim.remaining) % 60).padStart(2, '0')}</strong></div><button class="pause" aria-label="Pause game">Ⅱ</button><div class="control-hint">Click to move · Herd toward the flag</div>`;
    this.hud.querySelector('button')?.addEventListener('click', this.pause);
  }
  private pause = () => {
    if (this.status !== 'playing') return; this.status = 'paused'; this.powers.hidden = true; this.keys.clear(); this.sim.target = undefined; this.ui.hidden = false;
    this.ui.innerHTML = '<section class="panel compact"><span class="eyebrow">TAKE A BREATHER</span><h1>Good dog.<br>Short break.</h1><p>The flock will wait right here.</p><button data-resume>Back to the meadow</button><button class="secondary" data-menu>Choose a meadow</button></section>';
    this.ui.querySelector('[data-resume]')?.addEventListener('click', this.resume); this.ui.querySelector('[data-menu]')?.addEventListener('click', this.menu);
  };
  private resume = () => { if (this.status !== 'paused') return; this.status = 'playing'; this.ui.hidden = true; this.previous = performance.now(); this.renderer.domElement.focus({ preventScroll: true }); };
  private result() {
    this.status = 'result'; this.powers.hidden = true; this.keys.clear(); this.ui.hidden = false; const won = this.sim.status === 'won';
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
    if (this.status === 'playing' && [' ', 'b', 'f'].includes(key)) { event.preventDefault(); if (!event.repeat) this.useAbility(key === ' ' ? 'boost' : key === 'b' ? 'bark' : 'freeze'); return; }
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
    this.dogRig.update(dt, this.sim.joeySpeed);
    this.boostRing.visible = this.sim.boostRemaining > .001;
    const bark = this.sim.barkPulse / .7; this.barkRing.visible = bark > 0;
    this.barkRing.scale.setScalar(1 + (1 - bark) * 5.5); this.barkRing.material.opacity = bark * .75;
    this.flock.forEach((group, i) => {
      const s = this.sim.sheep[i];
      const speed = s.captured ? 0 : Math.hypot(s.vx, s.vz);
      this.sheepRigs[i].update(dt, speed, s.captured || this.sim.freezeRemaining > .001);
      this.freezeRings[i].visible = !s.captured && this.sim.freezeRemaining > .001;
      group.position.set(s.x, .02, s.z);
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
  dispose() { this.disposed = true; cancelAnimationFrame(this.raf); this.abort.abort(); this.resizeObserver?.disconnect(); void this.audio?.close(); this.release(this.scene); this.renderer?.dispose(); this.host.replaceChildren(); }
}
