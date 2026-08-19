import * as THREE from 'three';
import { angularFbm } from './noise.js';
import { createPointSprite } from './pointSprite.js';
import { createVariablePointsMaterial } from './variablePointsMaterial.js';

// There is no real astronomical data source here (unlike the Earth version's
// land/ocean texture) - the whole shape is procedural. A logarithmic spiral
// per arm, with per-point scatter that grows with radius, is the standard
// "particle galaxy" technique: it reads as spiral structure without having
// to simulate any actual orbital mechanics.
const DISK_RADIUS = 1;
const ARM_COUNT = 3;
const SPIN = 1.4; // radians of extra rotation per unit radius - winding tightness
const RANDOMNESS = 0.42; // scatter magnitude, scaled by radius
const RANDOMNESS_POWER = 2.4; // higher = scatter clumps closer to the arm centerline
const DISK_STAR_COUNT = 42000;
const DISK_POINT_SIZE = 0.0062;

const BULGE_RADIUS = 0.16;
const BULGE_FLATTEN = 0.55; // y-axis squash for the core's ellipsoid shape
const BULGE_STAR_COUNT = 7000;
const BULGE_POINT_SIZE = 0.0105;

const HALO_INNER = DISK_RADIUS * 1.05;
const HALO_OUTER = DISK_RADIUS * 1.75;
const HALO_STAR_COUNT = 3200;
const HALO_CLUMP_THRESHOLD = 0.48;
const HALO_POINT_SIZE = 0.0048;

const BACKGROUND_RADIUS = 30;
const BACKGROUND_STAR_COUNT = 6500;
const BACKGROUND_POINT_SIZE = 0.075;

const INSIDE_COLOR = new THREE.Color(0xffe3ae); // warm old stars near the core
const OUTSIDE_COLOR = new THREE.Color(0x9fc9ff); // hot young stars at the arm tips

export function createGalaxy() {
  const group = new THREE.Group();
  const sprite = createPointSprite();

  const background = buildBackground(sprite);
  const halo = buildHalo(sprite);
  const disk = buildDisk(sprite);
  const bulge = buildBulge(sprite);

  group.add(background, halo, disk, bulge);

  return {
    group,
    materials: [background.material, halo.material, disk.material, bulge.material],
  };
}

// Signed random in [-1, 1] biased toward 0 by `power` (higher = tighter clump).
function biasedSigned(power) {
  const magnitude = Math.pow(Math.random(), power);
  return (Math.random() < 0.5 ? -1 : 1) * magnitude;
}

function buildDisk(sprite) {
  const positions = [];
  const colors = [];
  const sizes = [];
  const alphas = [];

  for (let i = 0; i < DISK_STAR_COUNT; i++) {
    // Uniform random radius (not area-uniform) deliberately over-samples
    // small radii, which reads as the denser inner disk real spirals have.
    const radius = Math.random() * DISK_RADIUS;
    const branchAngle = ((i % ARM_COUNT) / ARM_COUNT) * Math.PI * 2;
    const spinAngle = radius * SPIN;

    const scatter = RANDOMNESS * radius;
    const randomX = biasedSigned(RANDOMNESS_POWER) * scatter;
    const randomY = biasedSigned(RANDOMNESS_POWER) * scatter * 0.28;
    const randomZ = biasedSigned(RANDOMNESS_POWER) * scatter;

    const angle = branchAngle + spinAngle;
    const x = Math.cos(angle) * radius + randomX;
    const y = randomY;
    const z = Math.sin(angle) * radius + randomZ;
    positions.push(x, y, z);

    const radiusFrac = radius / DISK_RADIUS;
    const mixed = INSIDE_COLOR.clone().lerp(OUTSIDE_COLOR, radiusFrac);
    const shade = 0.9 + Math.random() * 0.2;
    colors.push(mixed.r * shade, mixed.g * shade, mixed.b * shade);

    sizes.push(DISK_POINT_SIZE * (0.7 + Math.random() * 0.6));
    alphas.push((0.9 - radiusFrac * 0.35) * (0.75 + Math.random() * 0.25));
  }

  return pointsFrom(positions, colors, sizes, alphas, sprite);
}

function buildBulge(sprite) {
  const positions = [];
  const colors = [];
  const sizes = [];
  const alphas = [];

  for (let i = 0; i < BULGE_STAR_COUNT; i++) {
    // Uniform-in-volume sphere sample (cube-root radius), then flatten on y
    // into a squat ellipsoid - the classic galactic bulge silhouette.
    const r = BULGE_RADIUS * Math.cbrt(Math.random());
    const theta = Math.acos(2 * Math.random() - 1);
    const phi = Math.random() * Math.PI * 2;

    const x = r * Math.sin(theta) * Math.cos(phi);
    const y = r * Math.cos(theta) * BULGE_FLATTEN;
    const z = r * Math.sin(theta) * Math.sin(phi);
    positions.push(x, y, z);

    const core = 1 - r / BULGE_RADIUS; // brighter/whiter right at the center
    const mixed = INSIDE_COLOR.clone().lerp(new THREE.Color(0xffffff), core * 0.6);
    colors.push(mixed.r, mixed.g, mixed.b);

    sizes.push(BULGE_POINT_SIZE * (0.6 + core * 0.8) * (0.8 + Math.random() * 0.4));
    alphas.push(Math.min(1, 0.55 + core * 0.5) * (0.8 + Math.random() * 0.2));
  }

  return pointsFrom(positions, colors, sizes, alphas, sprite);
}

function buildHalo(sprite) {
  const positions = [];
  const colors = [];
  const sizes = [];
  const alphas = [];

  for (let i = 0; i < HALO_STAR_COUNT; i++) {
    const theta = Math.acos(2 * Math.random() - 1);
    const phi = Math.random() * Math.PI * 2;

    const clump = angularFbm(theta, phi);
    if (clump < HALO_CLUMP_THRESHOLD) continue;

    const radius = HALO_INNER + (HALO_OUTER - HALO_INNER) * Math.pow(Math.random(), 1.6);
    const x = radius * Math.sin(theta) * Math.cos(phi);
    const y = radius * Math.cos(theta);
    const z = radius * Math.sin(theta) * Math.sin(phi);
    positions.push(x, y, z);

    const shade = 0.75 + clump * 0.25;
    colors.push(shade, shade, shade * 0.96);

    sizes.push(HALO_POINT_SIZE * (0.6 + clump * 0.7));
    alphas.push(0.12 + clump * 0.28);
  }

  return pointsFrom(positions, colors, sizes, alphas, sprite);
}

function buildBackground(sprite) {
  const positions = [];
  const colors = [];
  const sizes = [];
  const alphas = [];

  for (let i = 0; i < BACKGROUND_STAR_COUNT; i++) {
    const theta = Math.acos(2 * Math.random() - 1);
    const phi = Math.random() * Math.PI * 2;
    const radius = BACKGROUND_RADIUS * (0.75 + Math.random() * 0.25);

    const x = radius * Math.sin(theta) * Math.cos(phi);
    const y = radius * Math.cos(theta);
    const z = radius * Math.sin(theta) * Math.sin(phi);
    positions.push(x, y, z);

    const warmth = Math.random();
    const shade = 0.75 + Math.random() * 0.25;
    colors.push(shade, shade, shade * (0.92 + warmth * 0.08));

    sizes.push(BACKGROUND_POINT_SIZE * (0.5 + Math.random() * 0.9));
    alphas.push(0.5 + Math.random() * 0.5);
  }

  return pointsFrom(positions, colors, sizes, alphas, sprite);
}

function pointsFrom(positions, colors, sizes, alphas, sprite) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('pointSize', new THREE.Float32BufferAttribute(sizes, 1));
  geometry.setAttribute('pointAlpha', new THREE.Float32BufferAttribute(alphas, 1));

  const material = createVariablePointsMaterial(sprite);
  return new THREE.Points(geometry, material);
}
