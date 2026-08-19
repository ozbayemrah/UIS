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

**UIS — Universe Information Center** — a Three.js (r0.169, plain `three`, no React/framework) WebGL app with two scenes sharing one renderer/camera: a procedurally generated spiral galaxy, and (reached by clicking a marker inside it) a procedural Solar System. Both are built from layered `THREE.Points` clouds using the same custom shader material and point-sprite texture — no meshes anywhere, everything is particles.

This is a sibling/successor project to `worldinformationcenter` (the particle-globe Earth visualizer) — it started as a copy of that repo and reuses its rendering engine (custom per-point shader material, radial-gradient point sprite) almost unchanged. What's different is the *shape*: instead of sampling a land/ocean texture over a sphere, everything here is procedural math (spiral-arm formulas, noise-based clumping, orbit geometry), since there's no equivalent "real data" source at these scales.

No UI framework — `src/main.js` wires up the Three.js scene directly, owns the render loop, and switches between the two scenes in place (same `WebGLRenderer`/`camera`/`OrbitControls`, content torn down and rebuilt).

| Path | Role |
|---|---|
| `src/main.js` | Scene/camera/renderer/`OrbitControls` setup, resize handling, the `requestAnimationFrame` loop, and the galaxy ↔ solar-system scene-switching state machine (fade transition, camera dolly, dispose/rebuild) |
| `src/shared/` | Engine pieces used by **both** scenes — see below |
| `src/galaxy/createGalaxy.js` | Builds the galaxy: background starfield, halo, spiral-arm disk, core glow, bulge. Also exports `getSunPosition()` |
| `src/galaxy/pointOfInterest.js` | Generic clickable DOM "map pin" marker (stem + dot + label), reprojected every frame from a 3D point. Currently only used for the one "Solar System" marker in the galaxy, but written to be reusable for future markers (e.g. planets) |
| `src/solar-system/createSolarSystem.js` | Builds the Solar System: Sun (solid-looking core + soft glow), 8 planets each on an animated orbit, Saturn's ring, per-planet orbit-path rings, background starfield. Also exports `updateOrbits()` |

### `src/shared/` — engine code used by every scene

| File | Role |
|---|---|
| `pointSprite.js` | Generates the radial-gradient dot texture (`CanvasTexture`) used as every point sprite — unchanged from the original globe project |
| `variablePointsMaterial.js` | Custom `ShaderMaterial` (GLSL inline as template strings) — per-point size/alpha/color via `pointSize`/`pointAlpha` attributes, plus optional `fadeBackface` (sphere-normal backface cull) and scan-line `wave` uniforms carried over from the globe version |
| `points.js` | `pointsFrom(positions, colors, sizes, alphas, sprite, materialOptions)` — builds the `BufferGeometry` + calls `createVariablePointsMaterial`, shared by every `build*` function in both scenes |
| `starfield.js` | `buildStarfield(sprite, { radius, count, pointSize })` — a large far-away sphere shell of small stars, generic backdrop for any scene |
| `disposeGroup.js` | `disposeGroup(group)` — frees geometry/material/texture GPU resources on scene teardown (each scene builds its own point-sprite texture from scratch on entry, so switching scenes must explicitly dispose the previous one) |

There is currently **no equivalent** of the globe project's `latlng.js`/`locations.js`/`capitalsList.js` — no lat/lon coordinate system, and no sidebar list. `pointOfInterest.js` is the one piece of that system that *does* have an equivalent, generalized rather than ported wholesale.

---

## How the galaxy is built (`createGalaxy.js`)

Five independently-generated `THREE.Points` clouds, added to one `THREE.Group`:

1. **`buildDisk`** — the spiral arms. Classic particle-galaxy technique: for each of `DISK_STAR_COUNT` points, pick a random radius (uniform random, *not* area-uniform — this deliberately over-samples small radii so the inner disk reads denser, like a real galaxy's profile), assign it to one of `ARM_COUNT` branches by angular offset, add `radius * SPIN` extra rotation. `SPIN = Math.PI * 2` — one full revolution from center to edge — is what makes the arms wind convincingly instead of reading as short curved streaks; branches stay a constant `2π/ARM_COUNT` apart at every radius (same `spinAngle(r)` for all of them), so they spiral in parallel and never cross no matter how tight `SPIN` is. Each point then scatters off the exact arm centerline by an amount that grows with radius (`RANDOMNESS`), biased toward small offsets by `RANDOMNESS_POWER`. Color lerps from a warm `INSIDE_COLOR` to a cool `OUTSIDE_COLOR` by radius fraction.
2. **`buildBulge`** — the bright core. Radius is sampled from an **exponential** distribution (rejection-sampled to bound the rare long tail via `BULGE_MAX_RADIUS`), not a hard-cutoff uniform-sphere sample — density and per-point brightness/size both taper continuously to zero, so the bulge fades into the disk instead of showing a visible sharp-edged sphere from any viewing angle (an earlier hard-cutoff version had exactly that problem — see git history / prior session notes if it recurs).
3. **`buildCoreGlow`** — ~70 large, very-low-alpha sprites tightly clustered at the very center, additively overlapping into one continuous soft glow *underneath* the bulge's sharper points. Exists specifically to mask the "visible gaps between individual dots" graininess a sparse point cloud otherwise shows exactly where it's brightest.
4. **`buildHalo`** — sparse, dim, mostly-spherical shell between `HALO_INNER`/`HALO_OUTER`, clumped by `angularFbm` (`shared/noise.js`) and thresholded so it reads as loose star clusters, not a smooth haze.
5. **Background starfield** — via `shared/starfield.js`, radius well outside `OrbitControls.maxDistance` so it reads as a fixed backdrop.

`getSunPosition()` (also exported from this file) computes a stylized "you are here" position by reusing the disk's *exact* arm-centerline formula with no random scatter (`SUN_RADIUS_FRACTION = 0.62` of the way out, on arm index `SUN_ARM_INDEX`) — guarantees the marker always lands precisely on a visible arm even if `SPIN`/`ARM_COUNT` change later, since it's derived from the same constants rather than a hand-picked coordinate.

## How the Solar System is built (`createSolarSystem.js`)

Not to real scale — real Mercury:Neptune orbital-radius spacing is roughly 80:1, which would leave the inner planets invisibly bunched at any scale that also fits Neptune on screen. Orbit radii in the `PLANETS` array are chosen purely so all eight stay legible at once.

- **Sun** — two layers, same "solid sphere via backface-fade" trick the Earth globe used for its surface: `buildSun` returns a dense small-radius point-shell with `fadeBackface: true` (reads as an opaque glowing sphere) plus a `coreGlow`-style large/faint/overlapping halo layer for bleed-through glow.
- **Planets** — `buildPlanetBody` per planet: a small uniform-sphere point cluster (`fadeBackface: true`, same solid-sphere trick), `pointSize` scaled to `bodyRadius` so small and large planets both read as filled rather than the small ones showing gaps.
- **Orbits** — each planet's body (and Saturn's ring, if any) lives in a `holder` Group offset to `(orbitRadius, 0, 0)`, nested inside a `pivot` Group at the origin. `pivot.rotation.y` is animated every frame by `updateOrbits(orbits, deltaSeconds)` (called from `main.js`'s render loop) at a Kepler-ish speed (`ORBIT_SPEED_BASE / orbitRadius^1.5` — farther planets orbit slower). Each pivot starts at a **random** `rotation.y` so planets don't all spawn collinear.
- **`buildOrbitRing`** — a static, faint, jittered circle of points at each planet's orbit radius (visual reference path, not itself animated — a perfect circle looks identical whether or not it spins).
- **`buildSaturnRing`** — an annulus of points around Saturn specifically (distinct from the generic orbit-path ring), parented to Saturn's own `holder` so it travels with the planet.

## Custom shader material (`shared/variablePointsMaterial.js`)

Same shader used by every layer in both scenes:

- Custom attributes `pointSize` and `pointAlpha` (per-vertex, set by each scene's `build*` functions) drive `gl_PointSize` and fragment alpha.
- `scale` uniform mirrors three.js's internal size-attenuation formula (`canvasHeight / (2*tan(fov/2))`) — recomputed via `updatePointScale()` on resize and on every scene switch (camera FOV/distance ranges differ between the two scenes) so `pointSize` behaves like a world-space size rather than a raw pixel count.
- `fadeBackface` (sphere-normal backface cull, used for the Sun/planet bodies) and the scan-line `wave*`/`uTime`/`waveAxes` uniforms (carried over from the globe project, not currently used anywhere here) are opt-in via `materialOptions` on `pointsFrom`/`createVariablePointsMaterial` — default is both off, since most layers (galaxy disk/bulge/halo, orbit rings, starfields) aren't spherical point clouds where local position doubles as the surface normal.
- Blending is `THREE.AdditiveBlending` with `depthWrite: false` and `vertexColors: true` — same glow-stacking approach as the globe.

## Scene switching, the marker, and the transition (`main.js` + `galaxy/pointOfInterest.js`)

- **The marker** (`pointOfInterest.js`) is a DOM element (not WebGL), reprojected from a 3D world position to screen space every frame — same category of technique the globe project used for its capital-city markers, but drawn as a map-pin shape: a vertical `.poi__stem` rising a fixed pixel height from the exact anchor point, capped with a `.poi__head` (glowing pulsing dot + label) at the top. The hit target (`.poi__hit`) is aligned with the head, not the base, so hover/click lands where the marker is actually visible. Only clickable (`pointer-events: auto`, cursor pointer) when constructed with an `onSelect` callback.
- **`main.js`** holds `currentGroup`/`pointMaterials`/`sunMarker`/`orbits`/`currentView` as module state and exposes `buildGalaxyScene()`/`buildSolarSystemScene()` (each disposes nothing itself — that's `teardownScene()`'s job) plus `enterSolarSystem()`/`exitToGalaxy()`, both async and guarded by a `transitioning` flag so double-clicks/rapid re-entry can't overlap two scenes.
- **Transition sequence**: on click, `OrbitControls` is disabled and `autoRotate` stopped, a short camera dolly toward the clicked point starts (`startCameraDolly` — moves the camera 55% of the remaining distance over `TRANSITION_MS`, purely cosmetic since the fade covers the actual cut), `#transition-veil` fades to opaque, then (after the CSS transition duration) `teardownScene()` + the new scene's `build*Scene()` run while hidden, then the veil fades back out and controls re-enable. `GALAXY_VIEW`/`SOLAR_SYSTEM_VIEW` constants hold each scene's camera start position and `OrbitControls` distance/rotate-speed ranges (the two scenes are at very different scales, so these can't be shared).
- **Back button** (`#back-button`, shown only while in the solar-system view) calls `exitToGalaxy()`, which mirrors the same fade/teardown/rebuild sequence without a camera dolly (there's no specific point to dolly toward on the way out).

## Where this differs from `worldinformationcenter` on purpose

- **No real data source.** The globe's shape came from an actual land/ocean texture; everything here is procedural math. If real star-catalog data (e.g. HYG database) is ever wanted, it would replace/augment `buildDisk`/`buildBulge`.
- **No capitals-style sidebar.** `pointOfInterest.js` is the spiritual successor to `markerOverlay.js`, generalized to a single reusable component rather than a whole list-plus-sidebar system, since there's currently exactly one point of interest (and, inside the Solar System scene, none yet — planets aren't individually clickable).
- **Units are arbitrary,** not real light-years or AU — every `*_RADIUS`/`orbitRadius` constant is tuned by eye against the camera-distance ranges each scene uses, not derived from any real astronomical scale.
