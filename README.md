# Joey Herds

Joey Herds is a cute top-down browser herding game built with Vite, React, TypeScript, and Phaser 3. The player guides Joey, a tan-and-white corgi, around a pasture to herd sheep into a fenced corral before time runs out.

## Controls

- **Primary control:** tap or click anywhere on the pasture to send Joey to that destination.
- A small marker appears where Joey is headed and disappears once he arrives.
- **Desktop fallback:** WASD and arrow keys still move Joey directly.
- Sheep react to Joey by proximity, so tap/click movement continues to push the flock while Joey travels.
- Placeholder sound effects play for barks, sheep captures, and level completion.
- The game view is sized for touch devices such as iPad as well as desktop browsers.

## Local development

Install dependencies:

```bash
npm install
```

Start the Vite development server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## GitHub Pages deployment

This project is configured for GitHub Pages under the repository path `/Joey_herds/` via Vite's `base` setting in `vite.config.ts`.

The workflow at `.github/workflows/deploy-pages.yml` runs on pushes to `main` and can also be started manually from the GitHub Actions tab. It:

1. Checks out the repository.
2. Installs dependencies with `npm install`.
3. Builds the project with `npm run build`.
4. Uploads the `dist` folder as a Pages artifact.
5. Deploys that artifact to GitHub Pages.

Before using it, enable GitHub Pages for the repository and choose **GitHub Actions** as the Pages source in the repository settings.
