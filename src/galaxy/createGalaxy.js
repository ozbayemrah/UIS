import * as THREE from 'three';
import { angularFbm } from '../shared/noise.js';
import { createPointSprite } from '../shared/pointSprite.js';
import { pointsFrom } from '../shared/points.js';
import { buildStarfield } from '../shared/starfield.js';

// There is no real astronomical data source here (unlike the Earth version's
// land/ocean texture) - the whole shape is procedural. A logarithmic spiral
// per arm, with per-point scatter that grows with radius, is the standard
// "particle galaxy" technique: it reads as spiral structure without having
// to simulate any actual orbital mechanics.
const DISK_RADIUS = 1;
const ARM_COUNT = 3;
// Total extra rotation an arm picks up from center to edge. Branches stay
// offset by a constant 2*PI/ARM_COUNT at every radius (same spinAngle(r) for
// all arms, just different starting angle), so they spiral in parallel and
// never cross regardless of how tightly wound this makes them - SPIN is
// purely "how many tours does one arm make", here one full revolution.
const SPIN = Math.PI * 2;
const RANDOMNESS = 0.42; // scatter magnitude, scaled by radius
const RANDOMNESS_POWER = 2.4; // higher = scatter clumps closer to the arm centerline
// Tighter winding means the same star count is spread over a much longer
// spiral path, so the count is scaled up to keep the arms reading as
// continuous lines rather than thinning out into broken dashes.
const DISK_STAR_COUNT = 60000;
const DISK_POINT_SIZE = 0.0058;

const BULGE_SCALE = 0.16; // e-folding radius - most bulge stars land within a few of these
const BULGE_MAX_RADIUS = BULGE_SCALE * 3.2; // resample tail beyond this instead of a hard cutoff
const BULGE_FLATTEN = 0.55; // y-axis squash for the core's ellipsoid shape
const BULGE_STAR_COUNT = 9000;
const BULGE_POINT_SIZE = 0.0105;

const CORE_GLOW_COUNT = 70; // large, faint, heavily-overlapping sprites
const CORE_GLOW_RADIUS = BULGE_SCALE * 0.55; // that additively blend into one soft core glow
const CORE_GLOW_SIZE = 0.05; // instead of the bulge reading as individually visible dots

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

// Stylized "you are here" marker position - not real light-year units (none
// of this galaxy is), but roughly matches where the real Sun sits: inside
// one of the arms, a bit more than halfway out from center to the edge.
// Reuses the disk's exact arm-centerline formula (no random scatter) so the
// marker always lands precisely on the visible arm, even if SPIN/ARM_COUNT
// change later.
const SUN_RADIUS_FRACTION = 0.62;
const SUN_ARM_INDEX = 0;

export function getSunPosition() {
  const radius = DISK_RADIUS * SUN_RADIUS_FRACTION;
  const branchAngle = (SUN_ARM_INDEX / ARM_COUNT) * Math.PI * 2;
  const angle = branchAngle + radius * SPIN;
  return new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
}

export function createGalaxy() {
  const group = new THREE.Group();
  const sprite = createPointSprite();

  const background = buildStarfield(sprite, {
    radius: BACKGROUND_RADIUS,
    count: BACKGROUND_STAR_COUNT,
    pointSize: BACKGROUND_POINT_SIZE,
  });
  const halo = buildHalo(sprite);
  const disk = buildDisk(sprite);
  const coreGlow = buildCoreGlow(sprite);
  const bulge = buildBulge(sprite);

  group.add(background, halo, disk, coreGlow, bulge);

  return {
    group,
    materials: [background.material, halo.material, disk.material, coreGlow.material, bulge.material],
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
    // Exponential radius (rejection-sampled to bound the rare long tail),
    // then flatten on y into a squat ellipsoid - the classic galactic bulge
    // silhouette. Unlike a uniform-in-volume sphere sample (hard-cutoff
    // cube-root radius), this has no fixed edge: density and brightness
    // both taper continuously to zero, so the bulge fades into the disk
    // instead of showing a visible sharp-edged sphere from any angle.
    let r, brightness;
    do {
      brightness = 1 - Math.random(); // reuse as the exponential's (0, 1] complement
      r = -BULGE_SCALE * Math.log(brightness);
    } while (r > BULGE_MAX_RADIUS);

    const theta = Math.acos(2 * Math.random() - 1);
    const phi = Math.random() * Math.PI * 2;

    const x = r * Math.sin(theta) * Math.cos(phi);
    const y = r * Math.cos(theta) * BULGE_FLATTEN;
    const z = r * Math.sin(theta) * Math.sin(phi);
    positions.push(x, y, z);

    const mixed = INSIDE_COLOR.clone().lerp(new THREE.Color(0xffffff), brightness * 0.6);
    colors.push(mixed.r, mixed.g, mixed.b);

    sizes.push(BULGE_POINT_SIZE * (0.55 + brightness * 0.85) * (0.8 + Math.random() * 0.4));
    alphas.push(Math.min(1, 0.35 + brightness * 0.6) * (0.8 + Math.random() * 0.2));
  }

  return pointsFrom(positions, colors, sizes, alphas, sprite);
}

function buildCoreGlow(sprite) {
  const positions = [];
  const colors = [];
  const sizes = [];
  const alphas = [];
  const white = new THREE.Color(0xffffff);

  for (let i = 0; i < CORE_GLOW_COUNT; i++) {
    // A handful of large, low-alpha sprites clustered tightly around the
    // origin. Individually invisible, but stacked with additive blending
    // they overlap into one continuous soft glow underneath the bulge's
    // sharper points - masks the "gaps between dots" graininess a sparse
    // point cloud otherwise shows at the center where it's brightest.
    const r = CORE_GLOW_RADIUS * Math.pow(Math.random(), 0.5);
    const theta = Math.acos(2 * Math.random() - 1);
    const phi = Math.random() * Math.PI * 2;

    const x = r * Math.sin(theta) * Math.cos(phi);
    const y = r * Math.cos(theta) * BULGE_FLATTEN;
    const z = r * Math.sin(theta) * Math.sin(phi);
    positions.push(x, y, z);

    const mixed = INSIDE_COLOR.clone().lerp(white, 0.5);
    colors.push(mixed.r, mixed.g, mixed.b);

    sizes.push(CORE_GLOW_SIZE * (0.7 + Math.random() * 0.6));
    alphas.push(0.09 + Math.random() * 0.07);
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

