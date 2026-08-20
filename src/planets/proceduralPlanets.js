import * as THREE from 'three';
import { latLngToVector3 } from '../shared/latlng.js';
import { angularFbm } from '../shared/noise.js';
import { createParticlePlanet } from '../shared/createParticlePlanet.js';

// The other 7 planets, built on the same createParticlePlanet() engine
// Earth's real land/ocean texture uses - here `surfaceFn` is pure procedural
// math instead of an image lookup, since no real texture data exists in
// this workspace for these bodies (unlike Earth). Palettes are derived from
// each planet's own small-scale "dot" color already used in
// solar-system/createSolarSystem.js's PLANETS array, so the detailed scene
// reads as the same planet, not a different one. Every marker is one real,
// named surface/atmospheric feature with real facts, the same spirit as
// Earth's continents.js but scoped to one per planet.
const RADIUS = 1;

function toThetaPhi(lat, lon) {
  const theta = (90 - lat) * (Math.PI / 180);
  const phi = (lon + 180) * (Math.PI / 180);
  return [theta, phi];
}

// Any sum-of-sines field (including angularFbm, shared/noise.js - tuned for
// the galaxy halo's clumpy shell, not a full sphere surface) is prone to
// reading as coherent wave/moire bands once it's the *only* thing driving a
// whole planet's texture - tuning frequencies only changes the band shape,
// not the fact that it's there. Cellular hash noise has no large-scale
// coherent structure by construction (each cell is an independent random
// value), so it reads as genuinely patchy/cratered instead: a coarse
// ~6°-cell layer for blotches, a fine per-point layer for grain on top.
function hash2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function noiseAt(lat, lon) {
  const patch = hash2(Math.round(lat / 6), Math.round(lon / 6));
  const grain = hash2(lat * 3.7, lon * 3.7);
  return Math.min(1, Math.max(0, patch * 0.75 + grain * 0.3 - 0.05));
}

function mix(colorA, colorB, t) {
  return colorA.clone().lerp(colorB, Math.min(1, Math.max(0, t)));
}

function toArr(color) {
  return [color.r, color.g, color.b];
}

function surfacePosition(lat, lon) {
  return latLngToVector3(lat, lon, RADIUS * 1.01);
}

// ---------------------------------------------------------------------------
// Mercury - cratered, airless, gray-brown rock. No atmosphere at all.
// ---------------------------------------------------------------------------
const MERCURY_DARK = new THREE.Color(0x7d766f);
const MERCURY_LIGHT = new THREE.Color(0xd6d0c8);

function mercurySurface(lat, lon) {
  const n = noiseAt(lat, lon);
  const color = mix(MERCURY_DARK, MERCURY_LIGHT, n);
  return { value: n, size: 0.006 + n * 0.0025, alpha: 0.78 + n * 0.22, color: toArr(color) };
}

export function createMercury() {
  const { group, materials } = createParticlePlanet({ surfaceFn: mercurySurface, gridStep: 0.85 });
  const markers = [
    {
      label: 'Caloris Basin',
      group,
      position: surfacePosition(30, -165),
      info: [
        { label: 'Diameter', value: '~1,550 km' },
        { label: 'Formed', value: '~3.8 billion yrs ago' },
        { label: 'Type', value: 'Impact basin' },
        { label: 'Notable', value: 'One of the largest impact craters known' },
      ],
    },
  ];
  return { group, materials, markers };
}

// ---------------------------------------------------------------------------
// Venus - thick swirling cloud cover (the clouds ARE the visible surface),
// dense hazy atmosphere.
// ---------------------------------------------------------------------------
const VENUS_LIGHT = new THREE.Color(0xfff3d6);
const VENUS_DARK = new THREE.Color(0xc9a866);

function venusSurface(lat, lon) {
  const [theta, phi] = toThetaPhi(lat, lon);
  const swirl = 0.5 + 0.5 * Math.sin(phi * 5 + angularFbm(theta, phi) * 6);
  const color = mix(VENUS_DARK, VENUS_LIGHT, swirl);
  return { value: swirl, size: 0.005 + swirl * 0.0025, alpha: 0.5 + swirl * 0.4, color: toArr(color) };
}

export function createVenus() {
  const { group, materials } = createParticlePlanet({
    surfaceFn: venusSurface,
    gridStep: 1.1,
    atmosphere: { count: 12000, clumpThreshold: 0.3, color: [0.95, 0.85, 0.62], radiusVar: 0.12 },
  });
  const markers = [
    {
      label: 'Maxwell Montes',
      group,
      position: surfacePosition(65, 3),
      info: [
        { label: 'Height', value: '~11 km' },
        { label: 'Location', value: 'Ishtar Terra highlands' },
        { label: 'Type', value: 'Mountain range' },
        { label: 'Notable', value: "Venus's highest point" },
      ],
    },
  ];
  return { group, materials, markers };
}

// ---------------------------------------------------------------------------
// Mars - rusty cratered terrain with bright polar ice caps.
// ---------------------------------------------------------------------------
const MARS_DARK = new THREE.Color(0x7a3a1a);
const MARS_BASE = new THREE.Color(0xc1642f);
const MARS_ICE = new THREE.Color(0xf2ede6);

function marsSurface(lat, lon) {
  const n = noiseAt(lat, lon);
  const terrain = mix(MARS_DARK, MARS_BASE, n);
  const capT = (Math.abs(lat) - 65) / 20;
  const final = mix(terrain, MARS_ICE, capT);
  const value = Math.max(n, Math.min(1, Math.max(0, capT)));
  return { value, size: 0.0055 + value * 0.0025, alpha: 0.72 + value * 0.25, color: toArr(final) };
}

export function createMars() {
  const { group, materials } = createParticlePlanet({
    surfaceFn: marsSurface,
    gridStep: 0.85,
    atmosphere: { count: 4000, clumpThreshold: 0.55, color: [0.9, 0.62, 0.4], alphaBase: 0.08, alphaVar: 0.18 },
  });
  const markers = [
    {
      label: 'Olympus Mons',
      group,
      position: surfacePosition(18.4, -133.8),
      info: [
        { label: 'Height', value: '~21.9 km' },
        { label: 'Diameter', value: '~600 km' },
        { label: 'Type', value: 'Shield volcano' },
        { label: 'Notable', value: 'Tallest known volcano in the Solar System' },
      ],
    },
  ];
  return { group, materials, markers };
}

// ---------------------------------------------------------------------------
// Jupiter - turbulent horizontal bands plus the Great Red Spot.
// ---------------------------------------------------------------------------
const JUPITER_LIGHT = new THREE.Color(0xf0dcb8);
const JUPITER_DARK = new THREE.Color(0xa9764e);
const SPOT_COLOR = new THREE.Color(0xc1502f);
const SPOT_LAT = -22;
const SPOT_LON = 0;

function wrappedLonDelta(lon, targetLon) {
  return ((lon - targetLon + 540) % 360) - 180;
}

function jupiterSurface(lat, lon) {
  const [theta, phi] = toThetaPhi(lat, lon);
  const turbulence = angularFbm(theta, phi);
  const latRad = (lat * Math.PI) / 180;
  const band = 0.5 + 0.5 * Math.sin(latRad * 9 + turbulence * 2.5);
  let color = mix(JUPITER_DARK, JUPITER_LIGHT, band);
  let value = band;

  const dLat = lat - SPOT_LAT;
  const dLon = wrappedLonDelta(lon, SPOT_LON) * 0.6; // squash horizontally into an oval
  const dist = Math.sqrt(dLat * dLat + dLon * dLon);
  const spotT = Math.max(0, 1 - dist / 14);
  if (spotT > 0) {
    color = mix(color, SPOT_COLOR, spotT);
    value = Math.max(value, spotT);
  }

  return { value, size: 0.0048 + value * 0.0022, alpha: 0.55 + value * 0.35, color: toArr(color) };
}

export function createJupiter() {
  const { group, materials } = createParticlePlanet({
    surfaceFn: jupiterSurface,
    gridStep: 0.9,
    atmosphere: { count: 11000, clumpThreshold: 0.35, color: [0.95, 0.85, 0.7] },
  });
  const markers = [
    {
      label: 'Great Red Spot',
      group,
      position: surfacePosition(SPOT_LAT, SPOT_LON),
      info: [
        { label: 'Width', value: '~16,000 km' },
        { label: 'Observed for', value: '350+ years' },
        { label: 'Type', value: 'Anticyclonic storm' },
        { label: 'Notable', value: 'A storm larger than Earth' },
      ],
    },
  ];
  return { group, materials, markers };
}

// ---------------------------------------------------------------------------
// Saturn - subtler pale-gold bands, plus the ring system.
// ---------------------------------------------------------------------------
const SATURN_LIGHT = new THREE.Color(0xf5e6c0);
const SATURN_DARK = new THREE.Color(0xc7a86c);

function saturnSurface(lat, lon) {
  const [theta, phi] = toThetaPhi(lat, lon);
  const turbulence = angularFbm(theta, phi);
  const latRad = (lat * Math.PI) / 180;
  const band = 0.5 + 0.5 * Math.sin(latRad * 7 + turbulence * 1.8);
  const color = mix(SATURN_DARK, SATURN_LIGHT, band);
  return { value: band, size: 0.0045 + band * 0.002, alpha: 0.5 + band * 0.35, color: toArr(color) };
}

export function createSaturn() {
  const { group, materials } = createParticlePlanet({
    surfaceFn: saturnSurface,
    gridStep: 1.0,
    atmosphere: { count: 9000, clumpThreshold: 0.4, color: [0.95, 0.9, 0.75] },
    ring: { innerRadius: 1.35, outerRadius: 2.0, color: 0xd9c9a0, count: 6000 },
  });
  const markers = [
    {
      label: 'The Rings',
      group,
      position: new THREE.Vector3(1.6, 0, 0),
      info: [
        { label: 'Diameter', value: '~282,000 km' },
        { label: 'Thickness', value: '~10 m (avg)' },
        { label: 'Composition', value: 'Ice & rock' },
        { label: 'Notable', value: 'May be debris from a shattered moon' },
      ],
    },
  ];
  return { group, materials, markers };
}

// ---------------------------------------------------------------------------
// Uranus - smooth, pale ice-blue, almost no visible banding.
// ---------------------------------------------------------------------------
const URANUS_LIGHT = new THREE.Color(0xd7f5f2);
const URANUS_DARK = new THREE.Color(0x8fd0cc);

function uranusSurface(lat, lon) {
  const n = noiseAt(lat, lon);
  const value = 0.4 + 0.3 * n;
  const color = mix(URANUS_DARK, URANUS_LIGHT, value);
  return { value, size: 0.0042 + value * 0.0015, alpha: 0.55 + value * 0.3, color: toArr(color) };
}

export function createUranus() {
  const { group, materials } = createParticlePlanet({
    surfaceFn: uranusSurface,
    gridStep: 1.3,
    atmosphere: { count: 7000, clumpThreshold: 0.45, color: [0.85, 0.98, 0.97] },
  });
  const markers = [
    {
      label: 'Axial Tilt',
      group,
      position: surfacePosition(88, 0),
      info: [
        { label: 'Tilt', value: '~98°' },
        { label: 'Type', value: 'Rotational feature' },
        { label: 'Likely cause', value: 'An ancient collision' },
        { label: 'Notable', value: 'Only planet that rotates on its side' },
      ],
    },
  ];
  return { group, materials, markers };
}

// ---------------------------------------------------------------------------
// Neptune - deeper blue with storm bands and the Solar System's fastest winds.
// ---------------------------------------------------------------------------
const NEPTUNE_LIGHT = new THREE.Color(0x6fa0e6);
const NEPTUNE_DARK = new THREE.Color(0x24408f);

function neptuneSurface(lat, lon) {
  const [theta, phi] = toThetaPhi(lat, lon);
  const turbulence = angularFbm(theta, phi);
  const latRad = (lat * Math.PI) / 180;
  const band = 0.5 + 0.5 * Math.sin(latRad * 6 + turbulence * 3);
  const color = mix(NEPTUNE_DARK, NEPTUNE_LIGHT, band);
  return { value: band, size: 0.0045 + band * 0.002, alpha: 0.55 + band * 0.35, color: toArr(color) };
}

export function createNeptune() {
  const { group, materials } = createParticlePlanet({
    surfaceFn: neptuneSurface,
    gridStep: 1.1,
    atmosphere: { count: 9000, clumpThreshold: 0.4, color: [0.7, 0.85, 1.0] },
  });
  const markers = [
    {
      label: 'Supersonic Winds',
      group,
      position: surfacePosition(-40, 0),
      info: [
        { label: 'Speed', value: 'up to ~2,100 km/h' },
        { label: 'Type', value: 'Atmospheric feature' },
        { label: 'Notable', value: 'Fastest winds of any planet' },
      ],
    },
  ];
  return { group, materials, markers };
}

// Keyed by the exact marker label used in solar-system/createSolarSystem.js's
// PLANETS array, so main.js can look up "does this planet open a scene?" the
// same way it already does for exoplanet systems (see exoplanetSystems.js).
export const PLANET_SCENES = {
  Mercury: createMercury,
  Venus: createVenus,
  Mars: createMars,
  Jupiter: createJupiter,
  Saturn: createSaturn,
  Uranus: createUranus,
  Neptune: createNeptune,
};
