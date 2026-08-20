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

**UIS — Universe Information Center** — a Three.js (r0.169, plain `three`, no React/framework) WebGL app with three nested kinds of scene sharing one renderer/camera: a procedurally generated spiral galaxy; a star system reached by clicking a marker inside it (the Solar System, plus a handful of real exoplanet-hosting systems - TRAPPIST-1, 51 Pegasi, HD 209458, Kepler-452, PSR B1257+12, and Proxima Centauri via the "Alpha Centauri" marker - built from the same generic engine with different data); and, one level deeper still, any of the Solar System's own 8 planets, each its own detailed particle-sphere scene (Earth's real land/ocean texture ported from `worldinformationcenter`; the other 7 procedurally patterned, since no real texture data for them exists in this workspace). The galaxy and star systems are built from layered `THREE.Points` clouds plus lit `THREE.Mesh` spheres for star/planet bodies; every entered planet scene is `THREE.Points` clouds only (no mesh at all).

This is a sibling/successor project to `worldinformationcenter` (the particle-globe Earth visualizer) — it started as a copy of that repo and reuses its rendering engine (custom per-point shader material, radial-gradient point sprite) almost unchanged. What's different is the *shape*: the galaxy and star systems are procedural math (spiral-arm formulas, noise-based clumping, orbit geometry), since there's no equivalent "real data" source at those scales - Earth is the one body with a real texture; the other 7 planets are procedural too, but built on the same particle-sphere engine Earth's port introduced (`shared/createParticlePlanet.js`), just with a math-generated surface instead of an image lookup.

No UI framework — `src/main.js` wires up the Three.js scene directly, owns the render loop, and switches between the galaxy, whichever star system was entered, and (from that star system, if it's the Solar System) whichever planet was entered, all in place (same `WebGLRenderer`/`camera`/`OrbitControls`, content torn down and rebuilt).

| Path | Role |
|---|---|
| `src/main.js` | Scene/camera/renderer/`OrbitControls` setup, resize handling, the `requestAnimationFrame` loop, and the galaxy ↔ star-system ↔ planet scene-switching state machine (fade transition, camera dolly, dispose/rebuild) |
| `src/shared/` | Engine pieces used by **every** scene — see below |
| `src/galaxy/createGalaxy.js` | Builds the galaxy: background starfield, halo, spiral-arm disk, core glow, bulge. Also exports `getSunPosition()` and `getArmPoint(radiusFraction, armIndex)` (the generalized version of the same arm-centerline formula, used to place other markers precisely on a visible arm) |
| `src/galaxy/pointOfInterest.js` | Generic DOM "map pin" marker (stem + dot + label), reprojected every frame from a 3D point. A single enlarged invisible hit-rect (sized from the label's rendered size, not a fixed guess) covers both the dot and the label, so hovering or clicking either one works. Optional `info` (an array of `{ label, value }` facts) shows a hover popup card; optional `onSelect` makes it clickable |
| `src/galaxy/nearbyStars.js` | ~9 real, well-known star systems (Alpha Centauri, Sirius, Altair, Arcturus, Polaris, Betelgeuse, Antares, Rigel, Deneb) fanned out in a small rosette around the Sun's own marker via `getNearbyStars()` — not real positions, just close together on screen since they're our real neighbors |
| `src/galaxy/farSystems.js` | A handful more real systems (TRAPPIST-1, 51 Pegasi, Cygnus X-1, HD 209458, Kepler-452, PSR B1257+12) scattered across different spiral arms via `getFarSystems()`, so the galaxy doesn't read as only the Sun's neighborhood |
| `src/solar-system/createSolarSystem.js` | The generic star-system engine: `createStarSystem(config)` builds a star (solid-looking core + soft glow) plus each of `config.planets` on an animated orbit, optional ring, per-planet orbit-path rings, background starfield. Also exports `updateOrbits()` and `SOL_CONFIG` (the Solar System's own config - the default when `createStarSystem()` is called with no argument) |
| `src/solar-system/exoplanetSystems.js` | `EXOPLANET_SYSTEMS`, keyed by the exact marker label used in `nearbyStars.js`/`farSystems.js` - each value is a full `createStarSystem()` config (real planet data) for the systems that are clickable. Not every marker has an entry (most nearby/far stars have no confirmed planets and stay hover-only) - `main.js` looks a marker's label up in this map to decide whether to wire up `onSelect` |
| `src/earth/createEarth.js` | Ported from `worldinformationcenter`'s `createGlobe.js`, now built on `shared/createParticlePlanet.js`: samples the real land/ocean texture into a `surfaceFn`, adds the atmosphere shell, then places 7 continent markers. |
| `src/earth/landMask.js` | Ported near-verbatim: loads `public/textures/earth-landmask.jpg` into an offscreen canvas and exposes `brightnessAt(u, v)`, memoized so re-entering Earth doesn't refetch/redecode the same image |
| `src/earth/continents.js` | `CONTINENTS` — 7 hand-placed continent markers (one representative lat/lon each, not true centroids) with real area/population/country-count/notable-fact data - the coarse replacement for the original project's country/capital marker system, which was deliberately **not** ported (see below) |
| `src/planets/proceduralPlanets.js` | `PLANET_SCENES`, keyed by planet name (Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune) - each a `createX()` function building that planet on `shared/createParticlePlanet.js` with a hand-written procedural `surfaceFn` (craters, cloud swirl, bands, ice caps...) instead of a texture, plus one real named-feature marker (Olympus Mons, the Great Red Spot, Saturn's rings, ...) |

### `src/shared/` — engine code used by every scene

| File | Role |
|---|---|
| `pointSprite.js` | Generates the radial-gradient dot texture (`CanvasTexture`) used as every point sprite — unchanged from the original globe project |
| `variablePointsMaterial.js` | Custom `ShaderMaterial` (GLSL inline as template strings) — per-point size/alpha/color via `pointSize`/`pointAlpha` attributes, plus optional `fadeBackface` (sphere-normal backface cull) and scan-line `wave` uniforms carried over from the globe version |
| `points.js` | `pointsFrom(positions, colors, sizes, alphas, sprite, materialOptions)` — builds the `BufferGeometry` + calls `createVariablePointsMaterial`, shared by every `build*` function in every scene |
| `starfield.js` | `buildStarfield(sprite, { radius, count, pointSize })` — a large far-away sphere shell of small stars, generic backdrop for any scene |
| `disposeGroup.js` | `disposeGroup(group)` — frees geometry/material/texture GPU resources on scene teardown (each scene builds its own point-sprite texture from scratch on entry, so switching scenes must explicitly dispose the previous one) |
| `latlng.js` | Ported verbatim from the original globe project: `latLngToUV`/`latLngToVector3`, the single conversion authority so texture/procedural sampling and marker placement agree. Used by every planet scene (Earth and the 7 procedural ones) |
| `createParticlePlanet.js` | The generic particle-sphere planet engine, factored out of Earth's port so every planet scene shares one grid-walk/atmosphere/ring implementation - see "How planets are built" below |
| `customCursor.js` | `initCustomCursor()` - a DOM-positioned crosshair reticle (not a native `cursor: url()` image, so it can be CSS-animated) that tracks the mouse and gets a `cursor-reticle--active` class while hovering anything matching `.poi__hit--clickable, #back-button`, which triggers a breathing/blinking `@keyframes` animation in `style.css` |

There is still **no equivalent** of `locations.js`/`capitalsList.js`/`markerOverlay.js` (the country/capital marker system) — `pointOfInterest.js` is the generalized replacement for `markerOverlay.js`, used everywhere including every planet scene, and `continents.js` is the coarse-grained stand-in for `locations.js`, not a port of it.

---

## How the galaxy is built (`createGalaxy.js`)

Five independently-generated `THREE.Points` clouds, added to one `THREE.Group`:

1. **`buildDisk`** — the spiral arms. Classic particle-galaxy technique: for each of `DISK_STAR_COUNT` points, pick a random radius (uniform random, *not* area-uniform — this deliberately over-samples small radii so the inner disk reads denser, like a real galaxy's profile), assign it to one of `ARM_COUNT` branches by angular offset, add `radius * SPIN` extra rotation. `SPIN = Math.PI * 2` — one full revolution from center to edge — is what makes the arms wind convincingly instead of reading as short curved streaks; branches stay a constant `2π/ARM_COUNT` apart at every radius (same `spinAngle(r)` for all of them), so they spiral in parallel and never cross no matter how tight `SPIN` is. Each point then scatters off the exact arm centerline by an amount that grows with radius (`RANDOMNESS`), biased toward small offsets by `RANDOMNESS_POWER`. Color lerps from a warm `INSIDE_COLOR` to a cool `OUTSIDE_COLOR` by radius fraction.
2. **`buildBulge`** — the bright core. Radius is sampled from an **exponential** distribution (rejection-sampled to bound the rare long tail via `BULGE_MAX_RADIUS`), not a hard-cutoff uniform-sphere sample — density and per-point brightness/size both taper continuously to zero, so the bulge fades into the disk instead of showing a visible sharp-edged sphere from any viewing angle (an earlier hard-cutoff version had exactly that problem — see git history / prior session notes if it recurs).
3. **`buildCoreGlow`** — ~70 large, very-low-alpha sprites tightly clustered at the very center, additively overlapping into one continuous soft glow *underneath* the bulge's sharper points. Exists specifically to mask the "visible gaps between individual dots" graininess a sparse point cloud otherwise shows exactly where it's brightest.
4. **`buildHalo`** — sparse, dim, mostly-spherical shell between `HALO_INNER`/`HALO_OUTER`, clumped by `angularFbm` (`shared/noise.js`) and thresholded so it reads as loose star clusters, not a smooth haze.
5. **Background starfield** — via `shared/starfield.js`, radius well outside `OrbitControls.maxDistance` so it reads as a fixed backdrop.

`getSunPosition()` (also exported from this file) computes a stylized "you are here" position by reusing the disk's *exact* arm-centerline formula with no random scatter (`SUN_RADIUS_FRACTION = 0.62` of the way out, on arm index `SUN_ARM_INDEX`) — guarantees the marker always lands precisely on a visible arm even if `SPIN`/`ARM_COUNT` change later, since it's derived from the same constants rather than a hand-picked coordinate.

## How star systems are built (`createStarSystem.js`)

One generic engine, `createStarSystem(config = SOL_CONFIG)`, builds every enterable system - the Solar System is just its default config, not a special case. A config is `{ starLabel, starColor, starInfo, planets: [{ name, color, orbitRadius, bodyRadius, hasRing?, info }] }`; `SOL_CONFIG` (Sun + the 8 real planets) lives at the top of this file, the exoplanet configs live in `exoplanetSystems.js`. Every star renders at the same fixed `STAR_SURFACE_RADIUS`/`STAR_GLOW_RADIUS` regardless of its real size, and every config's planets are scaled to roughly the same `orbitRadius` envelope (~0.35-2.5) Sol's 8 planets use - real orbital spacing varies wildly (TRAPPIST-1's whole system would fit inside Mercury's real orbit), so keeping every system in the same visual envelope means `main.js` can reuse one `SYSTEM_VIEW` camera config for all of them, no per-system tuning needed. `info` on each planet/star is real published astronomical data (unlike the geometry, which is stylized).

- **Star** — two layers, same "solid sphere via backface-fade"-adjacent trick the Earth globe used for its surface: `buildStar` returns a lit `MeshBasicMaterial` sphere at `STAR_SURFACE_RADIUS`, tinted `config.starColor`, plus a large/faint/overlapping point-sprite halo layer for bleed-through glow.
- **Planets** — `buildPlanetBody` per planet: a lit `MeshLambertMaterial` sphere sized to `bodyRadius`, lit by a `PointLight` at the star's position.
- **Orbits** — each planet's body (and its ring, if `hasRing`) lives in a `holder` Group offset to `(orbitRadius, 0, 0)`, nested inside a `pivot` Group at the origin. `pivot.rotation.y` is animated every frame by `updateOrbits(orbits, deltaSeconds)` (called from `main.js`'s render loop) at a Kepler-ish speed (`ORBIT_SPEED_BASE / orbitRadius^1.5` — farther planets orbit slower). Each pivot starts at a **random** `rotation.y` so planets don't all spawn collinear.
- **`buildOrbitRing`** — a static, jittered circle of points at each planet's orbit radius (visual reference path, not itself animated — a perfect circle looks identical whether or not it spins).
- **`buildPlanetRing`** — an annulus of points around any planet with `hasRing: true` (currently only Saturn), parented to that planet's own `holder` so it travels with the planet.

## How Earth is built (`earth/createEarth.js`)

A near-verbatim port of `worldinformationcenter`'s `createGlobe.js` - see that project's own `CLAUDE.md` for the full original writeup. The short version: there's **no sphere mesh**, the globe is two `THREE.Points` clouds.

- **Land/ocean classification is image-based, not geometric.** `landMask.js` draws `public/textures/earth-landmask.jpg` (equirectangular, land = near-black, ocean = lighter gray) onto an offscreen canvas and exposes `brightnessAt(u, v)`, a luma lookup. `OCEAN_BRIGHTNESS_CEILING = 0.18` is the threshold for "fully open ocean".
- **`buildSurfacePoints`** walks a lat/lon grid (`0.85°` steps, narrowed near the poles by `1/cos(lat)` for uniform density), samples `brightnessAt` per cell to get a `landness` value, randomly drops ocean cells (`OCEAN_MIN_DENSITY = 0.3` keep-fraction) so land reads visibly denser, jitters each kept point, and derives size/alpha/color by lerping `OCEAN_*`/`LAND_*` constants by `landness`.
- **`buildAtmospherePoints`** scatters ~9000 points on a shell just outside the surface, keeping only points where `angularFbm` (shared with the galaxy's halo) clumps them above a threshold, so the dust reads as clumpy rather than a uniform haze.
- Both layers share one point sprite and a set of `waveAxes` (4 random unit vectors) driving the traveling scan-line effect - `main.js`'s render loop calls `updateWaveTime()` on every active material each frame (harmless no-op for the galaxy/star-system materials, which have `waves: false` and so `waveStrength = 0`).
- **What changed in the port**: `buildSurfacePoints`/`buildAtmospherePoints` now build their geometry via `shared/points.js`'s `pointsFrom()` instead of constructing `BufferGeometry` inline (the original project predates that helper); `landMask.js` gained a memoized cache so re-entering the Earth scene doesn't refetch/redecode the texture; the marker system was swapped for `continents.js` + `pointOfInterest.js` (see below) instead of porting `locations.js`/`markerOverlay.js`/`capitalsList.js`.
- **Camera**: `EARTH_VIEW` in `main.js` reuses the original project's own tuned values (`position (0,0,2.7)`, `minDistance 1.6`, `maxDistance 5` against `RADIUS = 1`) rather than the compressed envelope `SYSTEM_VIEW` uses - Earth is rendered full-detail/full-size as its own dedicated scene, not shrunk down to "one of 8 planets" scale.

## Custom shader material (`shared/variablePointsMaterial.js`)

Same shader used by every layer in both scenes:

- Custom attributes `pointSize` and `pointAlpha` (per-vertex, set by each scene's `build*` functions) drive `gl_PointSize` and fragment alpha.
- `scale` uniform mirrors three.js's internal size-attenuation formula (`canvasHeight / (2*tan(fov/2))`) — recomputed via `updatePointScale()` on resize and on every scene switch (camera FOV/distance ranges differ between the two scenes) so `pointSize` behaves like a world-space size rather than a raw pixel count.
- `fadeBackface` (sphere-normal backface cull, used for the Sun/planet bodies) and the scan-line `wave*`/`uTime`/`waveAxes` uniforms (carried over from the globe project, not currently used anywhere here) are opt-in via `materialOptions` on `pointsFrom`/`createVariablePointsMaterial` — default is both off, since most layers (galaxy disk/bulge/halo, orbit rings, starfields) aren't spherical point clouds where local position doubles as the surface normal.
- Blending is `THREE.AdditiveBlending` with `depthWrite: false` and `vertexColors: true` — same glow-stacking approach as the globe.

## Scene switching, the marker, and the transition (`main.js` + `galaxy/pointOfInterest.js`)

- **The marker** (`pointOfInterest.js`) is a DOM element (not WebGL), reprojected from a 3D world position to screen space every frame — same category of technique the globe project used for its capital-city markers, but drawn as a map-pin shape: a vertical `.poi__stem` rising a fixed pixel height from the exact anchor point, capped with a `.poi__head` (dot + label) at the top. A single invisible `.poi__hit` rect (sized in JS from the label's actual rendered width/height, plus padding, once at creation) covers both the dot and the label, and is what receives hover/click - not a fixed-size circle around just the dot. Hovering it toggles a `.poi--hovered` class that reveals a `.poi__popup` info card (only built when the marker was given `info`); clicking it calls `onSelect` (only wired up when the marker was given one).
- **`main.js`** holds `currentGroup`/`pointMaterials`/`markers`/`orbits`/`currentView` (`'galaxy' | 'system' | 'earth'`) as module state and exposes `buildGalaxyScene()`/`buildStarSystemScene(config)`/`buildEarthScene()` (each disposes nothing itself — that's `teardownScene()`'s job) plus `enterStarSystem(config, localPosition)`/`enterEarthScene(markerGroup, localPosition)`/`exitToGalaxy()`/`exitToStarSystem()`, all async and guarded by a `transitioning` flag so double-clicks/rapid re-entry can't overlap two scenes. `createGalaxyMarker()` decides per-marker whether to attach `onSelect` by looking the marker's label up in `EXOPLANET_SYSTEMS` (the Sun always resolves to `SOL_CONFIG`); inside `buildStarSystemScene`, Earth's marker gets `onSelect` only when `config === SOL_CONFIG`. `enterEarthScene` takes Earth's own orbiting `holder` group (not the top-level scene group) since its world position depends on where its orbit pivot currently is, same as any other planet marker.
- **Transition sequence**: on click, `OrbitControls` is disabled and `autoRotate` stopped, a short camera dolly toward the clicked point starts (`startCameraDolly` — moves the camera 55% of the remaining distance over `TRANSITION_MS`, purely cosmetic since the fade covers the actual cut), `#transition-veil` fades to opaque, then (after the CSS transition duration) `teardownScene()` + the new scene's `build*Scene()` run while hidden, then the veil fades back out and controls re-enable. `GALAXY_VIEW`/`SYSTEM_VIEW`/`EARTH_VIEW` constants hold each scene kind's camera start position and `OrbitControls` distance/rotate-speed ranges - `SYSTEM_VIEW` is shared by every star system (see the visual-envelope note above), `EARTH_VIEW` and `GALAXY_VIEW` are each distinct. `buildEarthScene()` is the one `async` scene builder (it awaits `createEarth()`, which awaits the land-mask texture) - the veil stays opaque for however long that takes, same mechanism either way.
- **Back button** (`#back-button`, shown while inside a star system or Earth) routes based on `currentView`: `exitToStarSystem()` (Earth → the Solar System specifically, not wherever you logically "came from" - there's only one path into Earth) when `currentView === 'earth'`, otherwise `exitToGalaxy()`. Both mirror the same fade/teardown/rebuild sequence without a camera dolly. The button's label text is set directly in each scene builder (`'← back to galaxy'` vs `'← back to solar system'`), not derived from `currentView` at click time.

## Where this differs from `worldinformationcenter` on purpose

- **No real data source for the galaxy or star systems' shape - Earth is the one exception.** The galaxy and every star system are procedural math; `src/earth/` is a direct port of the original project's real land/ocean texture sampling, since Earth is the one body here where "what does it actually look like" has a real answer at a renderable scale. Star/planet *facts* (popup `info`, every exoplanet system's real planet data, `continents.js`) are real, published data everywhere else too - only the positions/sizes/orbits are stylized.
- **No capitals-style sidebar.** `pointOfInterest.js` is the spiritual successor to `markerOverlay.js`, generalized to a single reusable component with an inline hover-info popup rather than a whole list-plus-sidebar system - used for the galaxy's star markers, star systems' planet markers, and Earth's continent markers alike, not a bespoke system for each.
- **Units are arbitrary,** not real light-years or AU — every `*_RADIUS`/`orbitRadius` constant is tuned by eye against the camera-distance ranges each scene uses, not derived from any real astronomical scale. Marker *positions* in the galaxy are similarly stylized (nearby real stars are clustered near the Sun's marker just for legibility, not placed at real relative distances).
