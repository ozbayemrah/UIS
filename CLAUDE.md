# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

```bash
npm install                    # Install deps
npm run dev                    # Vite dev server
npm run build                  # Production build → dist/
npm run preview                # Preview the production build locally
```

No lint/test scripts are configured — `package.json` only defines `dev`/`build`/`preview`.

Deploy: push to `main` → `.github/workflows/deploy.yml` runs `npm ci && npm run build` and publishes `dist/` to GitHub Pages. Live at `https://ozbayemrah.github.io/UIS/` (repo name and Pages URL are both case-sensitive).

---

## Project at a Glance

**UIS — Universe Information Center** — a Three.js (r0.169, plain `three`, no React/framework) WebGL scene: a procedurally generated spiral galaxy built as layered `THREE.Points` clouds (core bulge, spiral-arm disk, halo, distant background stars), with drag-to-rotate/zoom camera via `OrbitControls`.

This is a sibling/successor project to `worldinformationcenter` (the particle-globe Earth visualizer) — it started as a copy of that repo and reuses its rendering engine (custom per-point shader material, radial-gradient point sprite) almost unchanged. What's different is the *shape*: instead of sampling a land/ocean texture over a sphere, the galaxy is entirely procedural (logarithmic spiral arm math + noise-based clumping), since there's no equivalent "real data" source at this scale yet.

No UI framework — `src/main.js` wires up the Three.js scene directly and owns the render loop. All galaxy-building logic lives under `src/galaxy/`.

| File | Role |
|---|---|
| `src/main.js` | Scene/camera/renderer/`OrbitControls` setup, resize handling, the `requestAnimationFrame` loop |
| `src/galaxy/createGalaxy.js` | Builds the four `THREE.Points` clouds that make up the galaxy: background starfield, halo, spiral-arm disk, core bulge |
| `src/galaxy/variablePointsMaterial.js` | Custom `ShaderMaterial` (GLSL inline as template strings) — per-point size/alpha/color. Carries over the globe version's backface-fade and scan-line "wave" uniforms (both sphere-only effects) but neither is currently enabled by any galaxy layer |
| `src/galaxy/pointSprite.js` | Generates the radial-gradient dot texture (`CanvasTexture`) used as the point sprite — unchanged from the globe project |
| `src/galaxy/noise.js` | Cheap sine/cosine `angularFbm`, reused to clump the halo into loose globular-cluster-like groups instead of a uniform shell |

There is currently **no equivalent** of the globe project's `latlng.js`, `locations.js`, `markerOverlay.js`, or `capitalsList.js` — no lat/lon coordinate system and no clickable points of interest yet (no "Sun" or star markers). Adding real points of interest (solar system bodies, notable stars) would need a new coordinate/placement convention appropriate to this scale.

---

## How the galaxy is built (`createGalaxy.js`)

Four independently-generated `THREE.Points` clouds, added to one `THREE.Group` in back-to-front order (`background`, `halo`, `disk`, `bulge`):

1. **`buildDisk`** — the spiral arms. Classic particle-galaxy technique: for each of `DISK_STAR_COUNT` points, pick a random radius (uniform random, *not* area-uniform — this deliberately over-samples small radii so the inner disk reads denser, like a real galaxy's profile), assign it to one of `ARM_COUNT` branches by angular offset, add `radius * SPIN` extra rotation (this is what makes the branches wind into logarithmic spirals rather than straight lines), then scatter the point off the exact arm centerline by an amount that grows with radius (`RANDOMNESS`) and is biased toward small offsets by `RANDOMNESS_POWER` (higher = tighter arms, more visible gaps between them). Color lerps from a warm `INSIDE_COLOR` to a cool `OUTSIDE_COLOR` by radius fraction, mimicking older-core / younger-arm-tip star populations.
2. **`buildBulge`** — the bright core. Uniform-in-volume sphere sampling (`cbrt(random())` for radius) squashed on Y by `BULGE_FLATTEN` into the classic squat-ellipsoid bulge shape, brighter/whiter toward dead center.
3. **`buildHalo`** — sparse, dim, mostly-spherical shell between `HALO_INNER`/`HALO_OUTER`, clumped by `angularFbm` (same technique the globe project used for its atmosphere-dust shell) and thresholded (`HALO_CLUMP_THRESHOLD`) so it reads as loose star clusters, not a smooth haze.
4. **`buildBackground`** — a large, far-away sphere shell (`BACKGROUND_RADIUS = 30`, well outside `OrbitControls.maxDistance`) of small, mostly-white points — just visual context so the galaxy doesn't float in pure black.

All four share one `pointSprite.js` texture and go through `createVariablePointsMaterial(sprite)` with default options (no backface fade, no wave effect) — those two features only make sense for a spherical point cloud where local position doubles as the surface normal, which none of these four clouds are (the disk/bulge aren't spheres at all, and even the halo isn't rendered as a single coherent front/back surface the way the globe was).

## Custom shader material (`variablePointsMaterial.js`)

Same shader as the globe project, kept intentionally generic:

- Custom attributes `pointSize` and `pointAlpha` (per-vertex, set in `createGalaxy.js`) drive `gl_PointSize` and fragment alpha.
- `scale` uniform mirrors three.js's internal size-attenuation formula (`canvasHeight / (2*tan(fov/2))`) — recomputed via `updatePointScale()` on resize and camera setup so `pointSize` behaves like a world-space size rather than a raw pixel count.
- `fadeBackface` and the scan-line `wave*`/`uTime`/`waveAxes` uniforms are still present (for potential reuse on a future spherical layer, e.g. a planet) but every current galaxy layer passes the defaults (`fadeBackface: false, waves: false`), so both are inert.
- Blending is `THREE.AdditiveBlending` with `depthWrite: false` and `vertexColors: true` — same glow-stacking approach as the globe.

## Camera / interaction (`main.js`)

- Camera control is entirely `OrbitControls`: damped, pan disabled, `autoRotate` on by default (slower than the globe's, `autoRotateSpeed = 0.15`, since the galaxy reads better with a slow drift), zoom clamped `minDistance 0.35` (close enough to see into the core) / `maxDistance 8` (never reaches the background starfield at radius 30, which is intentional — it should stay a fixed backdrop).
- No click-to-select / camera-animation system yet (the globe's marker-click camera slerp doesn't have an equivalent here — there's nothing to click on).

## Where this differs from `worldinformationcenter` on purpose

- **No real data source.** The globe's shape came from an actual land/ocean texture; the galaxy's shape is 100% procedural math. If real star-catalog data (e.g. HYG database) is ever wanted, it would replace/augment `buildDisk`/`buildBulge`, similar to how `landMask.js` drove the globe.
- **No markers/sidebar.** Removed rather than adapted, since "capital cities" has no galaxy-scale analog yet. A future "points of interest" layer (Sun position, notable named stars) would need new code, not a port of `markerOverlay.js`.
- **Units are arbitrary,** not real light-years — `DISK_RADIUS = 1` is just "however big the globe's `RADIUS = 1` felt," tuned by eye against the same camera-distance constants the globe used, not derived from any real galaxy's scale.
