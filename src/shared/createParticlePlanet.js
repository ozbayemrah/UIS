import * as THREE from 'three';
import { latLngToVector3 } from './latlng.js';
import { angularFbm } from './noise.js';
import { createPointSprite } from './pointSprite.js';
import { pointsFrom } from './points.js';

// Generic particle-sphere planet engine, factored out of earth/createEarth.js
// so Earth's real-texture globe and every other (procedurally patterned)
// planet share one grid-walk/atmosphere/ring implementation - only *how a
// point's value is computed* differs (an image lookup for Earth, math for
// everything else).
const RADIUS = 1;

// config:
//   surfaceFn(lat, lon) => { value, size, alpha, color: [r,g,b] } - value in
//     [0,1] is whatever the caller wants it to mean (landness, ice-cap-ness,
//     band brightness, ...); size/alpha/color are already resolved per point.
//   keepChanceFn?(value) => number in (0,1] - optional per-point density
//     thinning (Earth uses this to make ocean read sparser than land).
//   gridStep? - degrees between grid samples (default 1.2, coarser than
//     Earth's 0.85 since procedural patterns don't need photograph-level
//     density to read clearly).
//   atmosphere?: { color:[r,g,b], count, clumpThreshold, sizeBase, sizeVar,
//     alphaBase, alphaVar, radiusBase, radiusVar } | null
//   ring?: { innerRadius, outerRadius, color, count? } | null
//   waves?: boolean (default true)
export function createParticlePlanet({ surfaceFn, keepChanceFn, gridStep = 1.2, atmosphere = null, ring = null, waves = true }) {
  const group = new THREE.Group();
  const sprite = createPointSprite();
  const waveAxes = waves ? randomSphereOrigins(4) : [];

  const surface = buildSurface(surfaceFn, keepChanceFn, gridStep, sprite, waveAxes, waves);
  group.add(surface);
  const materials = [surface.material];

  if (atmosphere) {
    const atmo = buildAtmosphere(atmosphere, sprite, waveAxes, waves);
    group.add(atmo);
    materials.push(atmo.material);
  }

  if (ring) {
    const ringPoints = buildRing(ring, sprite);
    group.add(ringPoints);
    materials.push(ringPoints.material);
  }

  return { group, materials };
}

function randomSphereOrigins(count) {
  const origins = [];
  for (let i = 0; i < count; i++) {
    const lat = 90 - (Math.acos(2 * Math.random() - 1) * 180) / Math.PI;
    const lon = Math.random() * 360 - 180;
    origins.push(latLngToVector3(lat, lon, 1));
  }
  return origins;
}

function buildSurface(surfaceFn, keepChanceFn, gridStep, sprite, waveAxes, waves) {
  const positions = [];
  const colors = [];
  const sizes = [];
  const alphas = [];

  for (let lat = -90; lat <= 90; lat += gridStep) {
    const circumferenceScale = Math.max(Math.cos((lat * Math.PI) / 180), 0.05);
    const stepAtLat = gridStep / circumferenceScale;

    for (let lon = -180; lon < 180; lon += stepAtLat) {
      const point = surfaceFn(lat, lon);
      const keepChance = keepChanceFn ? keepChanceFn(point.value) : 1;
      if (keepChance < 1 && Math.random() > keepChance) continue;

      const latJ = lat + (Math.random() - 0.5) * gridStep * 0.85;
      const lonJ = lon + (Math.random() - 0.5) * stepAtLat * 0.85;
      const radiusJitter = 1 + (Math.random() - 0.5) * 0.004;
      const p = latLngToVector3(latJ, lonJ, RADIUS * radiusJitter);
      positions.push(p.x, p.y, p.z);

      sizes.push(point.size);
      alphas.push(point.alpha);
      colors.push(point.color[0], point.color[1], point.color[2]);
    }
  }

  return pointsFrom(positions, colors, sizes, alphas, sprite, { fadeBackface: true, waves, waveAxes });
}

function buildAtmosphere(cfg, sprite, waveAxes, waves) {
  const positions = [];
  const colors = [];
  const sizes = [];
  const alphas = [];
  const {
    count = 9000,
    clumpThreshold = 0.42,
    color = [1, 1, 1],
    sizeBase = 0.004,
    sizeVar = 0.0035,
    alphaBase = 0.15,
    alphaVar = 0.35,
    radiusBase = 1.01,
    radiusVar = 0.09,
  } = cfg;
  const [r, g, b] = color;

  for (let i = 0; i < count; i++) {
    const theta = Math.acos(2 * Math.random() - 1);
    const phi = Math.random() * Math.PI * 2;

    const clump = angularFbm(theta, phi);
    if (clump < clumpThreshold) continue;

    const radius = RADIUS * (radiusBase + clump * radiusVar + Math.random() * 0.02);
    const x = radius * Math.sin(theta) * Math.cos(phi);
    const y = radius * Math.cos(theta);
    const z = radius * Math.sin(theta) * Math.sin(phi);
    positions.push(x, y, z);

    sizes.push(sizeBase + clump * sizeVar);
    alphas.push(alphaBase + clump * alphaVar);

    const shade = 0.6 + clump * 0.3;
    colors.push(r * shade, g * shade, b * shade);
  }

  return pointsFrom(positions, colors, sizes, alphas, sprite, { waves, waveAxes });
}

function buildRing({ innerRadius, outerRadius, color, count = 3000 }, sprite) {
  const positions = [];
  const colors = [];
  const sizes = [];
  const alphas = [];
  const base = new THREE.Color(color);

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = innerRadius + Math.random() * (outerRadius - innerRadius);

    positions.push(Math.cos(angle) * r, (Math.random() - 0.5) * 0.004, Math.sin(angle) * r);

    const shade = 0.7 + Math.random() * 0.3;
    colors.push(base.r * shade, base.g * shade, base.b * shade);
    sizes.push(0.006 + Math.random() * 0.004);
    alphas.push(0.45 + Math.random() * 0.35);
  }

  return pointsFrom(positions, colors, sizes, alphas, sprite);
}
