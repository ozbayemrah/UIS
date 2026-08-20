import * as THREE from 'three';
import { latLngToVector3, latLngToUV } from './latlng.js';
import { loadLandMask } from './landMask.js';
import { angularFbm } from '../shared/noise.js';
import { createPointSprite } from '../shared/pointSprite.js';
import { pointsFrom } from '../shared/points.js';
import { CONTINENTS } from './continents.js';

// Ported from worldinformationcenter's createGlobe.js: the globe is two
// THREE.Points clouds (surface + atmosphere) built from a real land/ocean
// texture, not a sphere mesh - see that project's CLAUDE.md for the full
// algorithm writeup. Differences here: geometry-building goes through UIS's
// shared pointsFrom() instead of building BufferGeometry inline, and the
// per-country/capital marker system is replaced with 7 continent markers
// (continents.js) using the same generic pointOfInterest hover-popup this
// app already uses everywhere else, not a bespoke DOM overlay.
const RADIUS = 1;

// Ocean brightness in the source texture tops out well below 1.0 (mostly
// 0.03-0.08, occasionally ~0.2 for cloud/ice haze). Anything at or above
// this reads as "fully open ocean" for density/size/alpha purposes.
const OCEAN_BRIGHTNESS_CEILING = 0.18;

// grid spacing at latStep=0.85deg, radius=1 is ~0.0148 world units;
// point sizes must stay under that or adjacent dots fully tile and
// additive-blend into a solid blown-out white sheet.
const LAND_POINT_SIZE = 0.0075;
const OCEAN_POINT_SIZE = 0.003;
const LAND_ALPHA = 0.95;
const OCEAN_ALPHA = 0.22;
const OCEAN_MIN_DENSITY = 0.3; // fraction of ocean grid cells kept

const ATMOSPHERE_COUNT = 9000;
const WAVE_AXIS_COUNT = 4;

const TEXTURE_URL = `${import.meta.env.BASE_URL}textures/earth-landmask.jpg`;

export async function createEarth() {
  const group = new THREE.Group();
  const sprite = createPointSprite();

  const { brightnessAt } = await loadLandMask(TEXTURE_URL);
  const waveAxes = randomSphereOrigins(WAVE_AXIS_COUNT);
  const surface = buildSurfacePoints(brightnessAt, sprite, waveAxes);
  const atmosphere = buildAtmospherePoints(sprite, waveAxes);

  group.add(surface, atmosphere);

  // Anchored to the top-level `group` at each continent's own point (not
  // the origin) - Earth doesn't orbit anything internally, so unlike
  // planet markers in createStarSystem.js there's no per-marker holder
  // Group needed, just a fixed position on the sphere.
  const markers = CONTINENTS.map(({ name, lat, lon, info }) => ({
    label: name,
    group,
    position: latLngToVector3(lat, lon, RADIUS * 1.01),
    info,
  }));

  return { group, materials: [surface.material, atmosphere.material], markers };
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

function buildSurfacePoints(brightnessAt, sprite, waveAxes) {
  const positions = [];
  const colors = [];
  const sizes = [];
  const alphas = [];

  const latStep = 0.85;
  const lonStep = 0.85;

  for (let lat = -90; lat <= 90; lat += latStep) {
    const circumferenceScale = Math.max(Math.cos((lat * Math.PI) / 180), 0.05);
    const stepAtLat = lonStep / circumferenceScale;

    for (let lon = -180; lon < 180; lon += stepAtLat) {
      const [u, v] = latLngToUV(lat, lon);
      const brightness = brightnessAt(u, v);
      const landness = 1 - Math.min(brightness / OCEAN_BRIGHTNESS_CEILING, 1);

      // thin out ocean cells so land reads as visibly denser
      const keepChance = OCEAN_MIN_DENSITY + (1 - OCEAN_MIN_DENSITY) * landness;
      if (Math.random() > keepChance) continue;

      const latJ = lat + (Math.random() - 0.5) * latStep * 0.85;
      const lonJ = lon + (Math.random() - 0.5) * stepAtLat * 0.85;
      const radiusJitter = 1 + (Math.random() - 0.5) * 0.004;
      const p = latLngToVector3(latJ, lonJ, RADIUS * radiusJitter);
      positions.push(p.x, p.y, p.z);

      const size = OCEAN_POINT_SIZE + (LAND_POINT_SIZE - OCEAN_POINT_SIZE) * landness;
      sizes.push(size * (0.85 + Math.random() * 0.3));

      const alpha = OCEAN_ALPHA + (LAND_ALPHA - OCEAN_ALPHA) * landness;
      alphas.push(alpha * (0.8 + Math.random() * 0.2));

      const shade = 0.5 + landness * 0.45 + Math.random() * 0.1;
      colors.push(shade, shade, shade * 0.97);
    }
  }

  return pointsFrom(positions, colors, sizes, alphas, sprite, { fadeBackface: true, waves: true, waveAxes });
}

function buildAtmospherePoints(sprite, waveAxes) {
  const positions = [];
  const colors = [];
  const sizes = [];
  const alphas = [];

  for (let i = 0; i < ATMOSPHERE_COUNT; i++) {
    const theta = Math.acos(2 * Math.random() - 1);
    const phi = Math.random() * Math.PI * 2;

    const clump = angularFbm(theta, phi);
    if (clump < 0.42) continue;

    const radius = RADIUS * (1.01 + clump * 0.09 + Math.random() * 0.02);

    const x = radius * Math.sin(theta) * Math.cos(phi);
    const y = radius * Math.cos(theta);
    const z = radius * Math.sin(theta) * Math.sin(phi);
    positions.push(x, y, z);

    sizes.push(0.004 + clump * 0.0035);
    alphas.push(0.15 + clump * 0.35);

    const shade = 0.6 + clump * 0.3;
    colors.push(shade, shade, shade);
  }

  return pointsFrom(positions, colors, sizes, alphas, sprite, { waves: true, waveAxes });
}
