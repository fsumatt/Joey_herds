# Joey Herds · 3D

A cozy browser herding game starring Joey, a tan-and-white corgi modeled in Blender from family photos. Guide sheep into the open side of the corral before time runs out.

## The 3D upgrade

- Three.js replaces the Phaser sprite renderer with a real 3D meadow, sheep, rocks, fences, lighting and shadows.
- Joey uses a refined Blender GLB body and an articulated, distance-driven leg rig. He turns toward travel and settles when stopped.
- An orthographic, elevated three-quarter camera keeps the whole pasture visible. Portrait screens use a rotated angle to make better use of the display.
- Five redesigned meadows introduce ponds, an orchard, divided paddocks and a final combined challenge, with 4–12 sheep and 90–205 second timers. Sheep flee from Joey and avoid rocks and one another. The corral has three solid sides and an open left entrance.
- Pause, resume, retry, next level and level selection are supported. Switching tabs pauses the game.

## Controls

Click or tap the pasture to set Joey’s destination. WASD or arrow keys steer relative to the screen and cancel the current destination. Press Escape or the pause button to pause/resume. Position Joey on the opposite side of the sheep from the corral to push them toward its entrance. Direct movement does not automatically find a path around rocks or fences; steer around them.

## Development

Use Node.js 22.12+ (Node 24 recommended).

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

The development URL includes `/Joey_herds/`. A WebGL 2 capable browser is required. The game displays a reload message if graphics initialization or the model request fails. Desktop and landscape screens provide the largest play area; portrait adapts the camera to retain the full field.

`src/game3d/simulation.ts` contains the independently tested movement, collision, flock and scoring logic. `src/game3d/MeadowGame.ts` owns rendering, animation, input and the game screens. Level layouts and terrain data live in `src/game/levels.ts`.

## Joey model

`public/assets/models/joey.glb` is a self-contained refined Blender model with continuous sculpted body/head surfaces and smaller inset eyes. Its legacy rigid leg pieces are hidden in game and replaced by the two-joint limb rig in `animals.ts`. The model faces +Z in Three.js and is scaled by 0.65. Foot placement, knee bending and body motion are generated at runtime; the GLB no longer contains the old rigid walk clip. See `public/assets/README.md` for asset details.

## GitHub Pages

Vite uses `/Joey_herds/` as its base path, including the GLB request. The existing Pages workflow tests and builds on pushes to `main`, then deploys `dist`. Pull requests run the same tests and build without deploying. In repository settings, select **GitHub Actions** as the Pages source.

## Flock movement and splash screen

Sheep can reach the visible fence with only body clearance. When crowded against it, they briefly turn and travel along it; corners trigger an inward escape turn. There is no invisible outer turning lane. The simulation uses the same fence segments and pasture outline as the renderer. Ponds have gradual shallow edges and slow both Joey and sheep to 52% speed in deeper water. Trees and hay are solid obstacles.

The five meadows progress from an open field to water, orchard routes, gated paddocks and a combined farmyard. Flock sizes are 4 / 6 / 8 / 10 / 12 and starting timers are 90 / 115 / 145 / 175 / 205 seconds. Later levels allow more total time but less time per sheep. These are initial design tuning values; actual player completion times should inform further balancing. Automated checks verify every spawn has a body-width route into the corral.

The welcome screen features a transparent, stylized Joey-and-Luka illustration and adapts its layout for phones.


## Abilities

| Ability | Button / key | Effect | Recharge from activation |
| --- | --- | --- | --- |
| Boost | Boost / Space | Joey moves 2.15× faster for **1 second** while moving | 5 seconds |
| Bark | Bark / B | Sheep within 4.2 world units receive a fading 28% directional nudge toward home for 0.85 seconds; no added speed | **15 seconds** |

Buttons show active effects and remaining recharge. Abilities cannot stack, pause freezes their timers, and retry/new levels reset them. Bark has a visible ripple and an audible, voiced/noise two-pulse bark scheduled after audio unlock, with a mute toggle. Obstacles and fences remain solid during abilities.

## Animation and scenery references

The gait uses a longer planted stance, a smooth lifted swing, offset front/rear footfalls, analytical two-joint knees, and restrained body weight shifts. Animation advances from actual travel rather than from a fixed playback speed. Walking blends into diagonal trotting as speed rises. Wool curls are instanced to reduce rendering cost. Continuous tapered limb surfaces conceal joints, front elbows bend backward and rear knees forward, and restrained paw lift avoids marching. Trees and hay also appear inside the field as obstacles; a barn and stepping stones decorate the surroundings.

Research references from 3D software makers:
- [Autodesk: Animating a Quadruped Walk](https://download.autodesk.com/us/3dsmax/2011/help/files/WS1a9193826455f5ff-e569a012180ce589113f6.htm)
- [Autodesk: Polish the Walk Cycle](https://download.autodesk.com/us/3dsmax/2011/help/files/WS1a9193826455f5ff-e569a012180ce5891150a.htm)
- [Blender Studio: Caminandes quadruped animation training](https://studio.blender.org/projects/caminandes-2/55f345692beb330030df625f/?asset=2357) (catalog reference; the lesson could not be retrieved during research).

These inform the original procedural gait; no third-party models or motion files were imported.
