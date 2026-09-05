# Joey Herds · 3D

A cozy browser herding game starring Joey, a tan-and-white corgi modeled in Blender from family photos. Guide sheep into the open side of the corral before time runs out.

## The 3D upgrade

- Three.js replaces the Phaser sprite renderer with a real 3D meadow, sheep, rocks, fences, lighting and shadows.
- Joey uses the included GLB model and its walk animation. He turns toward travel and rests when stopped.
- An orthographic, elevated three-quarter camera keeps the whole pasture visible. Portrait screens use a rotated angle to make better use of the display.
- All five original levels, flock sizes and time limits remain. Sheep flee from Joey and avoid rocks and one another. The corral has three solid sides and an open left entrance.
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

`src/game3d/simulation.ts` contains the independently tested movement, collision, flock and scoring logic. `src/game3d/MeadowGame.ts` owns rendering, animation, input and the game screens. Original level data remains in `src/game/levels.ts`.

## Joey model

`public/assets/models/joey.glb` is a self-contained, approximately 35,000-triangle model with a one-second `Walk` clip. Its animation uses object pivots, not a skeletal rig. The character faces +Z in Three.js and is scaled by 0.65 in the game. See `public/assets/README.md` for asset details.

## GitHub Pages

Vite uses `/Joey_herds/` as its base path, including the GLB request. The existing Pages workflow tests and builds on pushes to `main`, then deploys `dist`. Pull requests run the same tests and build without deploying. In repository settings, select **GitHub Actions** as the Pages source.

## Flock movement and splash screen

Sheep keep a small margin from the outer pasture bounds so Joey can flank them. Nearby fence normals redirect blocked steering inward, and corral walls encourage sliding toward an open end. Collision-adjusted velocity drives alternating sheep leg animation: slow wandering walks, faster fleeing trots, and still legs when resting or captured. Edge/corner regressions cover all four sides and corners under sustained pressure, flanking, corral sliding and entrance capture.

The welcome screen features a transparent, stylized Joey-and-Luka illustration and adapts its layout for phones.
