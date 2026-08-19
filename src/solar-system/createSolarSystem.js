import * as THREE from 'three';
import { createPointSprite } from '../shared/pointSprite.js';
import { pointsFrom } from '../shared/points.js';
import { buildStarfield } from '../shared/starfield.js';

// Same "same format" rule as the galaxy: no real distances or sizes here,
// just enough separation for all eight planets to read clearly at once.
// Real Mercury:Neptune spacing spans ~80:1, which would leave the inner
// planets invisibly bunched at any scale that also fits Neptune - orbits
// are compressed, not to scale, chosen purely so gaps stay legible.
const PLANETS = [
  { name: 'Mercury', color: 0x9c9691, orbitRadius: 0.42, bodyRadius: 0.018, pointCount: 260 },
  { name: 'Venus', color: 0xe8cfa0, orbitRadius: 0.6, bodyRadius: 0.026, pointCount: 320 },
  { name: 'Earth', color: 0x4f8fd1, orbitRadius: 0.8, bodyRadius: 0.028, pointCount: 340 },
  { name: 'Mars', color: 0xc1642f, orbitRadius: 1.02, bodyRadius: 0.022, pointCount: 280 },
  { name: 'Jupiter', color: 0xd9b98d, orbitRadius: 1.42, bodyRadius: 0.078, pointCount: 700 },
  { name: 'Saturn', color: 0xe3cf9e, orbitRadius: 1.82, bodyRadius: 0.066, pointCount: 620, hasRing: true },
  { name: 'Uranus', color: 0x9fdde0, orbitRadius: 2.18, bodyRadius: 0.046, pointCount: 420 },
  { name: 'Neptune', color: 0x3d63d1, orbitRadius: 2.52, bodyRadius: 0.044, pointCount: 420 },
];

const SUN_SURFACE_RADIUS = 0.13;
const SUN_SURFACE_COUNT = 5000;
const SUN_GLOW_COUNT = 90;
const SUN_GLOW_RADIUS = 0.34;
const SUN_COLOR = new THREE.Color(0xfff1c2);

const ORBIT_SPEED_BASE = 0.16; // radians/sec at orbitRadius = 1, Kepler-ish falloff beyond that

const BACKGROUND_RADIUS = 10;
const BACKGROUND_STAR_COUNT = 5000;
const BACKGROUND_POINT_SIZE = 0.028;

export function createSolarSystem() {
  const group = new THREE.Group();
  const sprite = createPointSprite();
  const materials = [];
  const orbits = [];

  const background = buildStarfield(sprite, {
    radius: BACKGROUND_RADIUS,
    count: BACKGROUND_STAR_COUNT,
    pointSize: BACKGROUND_POINT_SIZE,
  });
  group.add(background);
  materials.push(background.material);

  const { surface, glow } = buildSun(sprite);
  group.add(glow, surface);
  materials.push(glow.material, surface.material);

  for (const planet of PLANETS) {
    const ring = buildOrbitRing(sprite, planet.orbitRadius);
    group.add(ring);
    materials.push(ring.material);

    const pivot = new THREE.Group();
    pivot.rotation.y = Math.random() * Math.PI * 2; // random starting phase, else every planet lines up at spawn
    const holder = new THREE.Group();
    holder.position.set(planet.orbitRadius, 0, 0);

    const body = buildPlanetBody(sprite, planet);
    holder.add(body);
    materials.push(body.material);

    if (planet.hasRing) {
      const saturnRing = buildSaturnRing(sprite, planet);
      holder.add(saturnRing);
      materials.push(saturnRing.material);
    }

    pivot.add(holder);
    group.add(pivot);

    // Kepler-ish: farther planets orbit slower. Direction is the same for
    // all of them (counter-clockwise from above), like the real solar system.
    const speed = ORBIT_SPEED_BASE / Math.pow(planet.orbitRadius, 1.5);
    orbits.push({ pivot, speed });
  }

  return { group, materials, orbits };
}

export function updateOrbits(orbits, deltaSeconds) {
  for (const orbit of orbits) {
    orbit.pivot.rotation.y += orbit.speed * deltaSeconds;
  }
}

function buildSun(sprite) {
  const surfacePositions = [];
  const surfaceColors = [];
  const surfaceSizes = [];
  const surfaceAlphas = [];

  for (let i = 0; i < SUN_SURFACE_COUNT; i++) {
    // Uniform-in-volume sphere sample + backface fade reads as a solid
    // glowing sphere rather than a hollow point shell - the same trick the
    // Earth globe used for its land/ocean surface.
    const r = SUN_SURFACE_RADIUS * Math.cbrt(Math.random());
    const theta = Math.acos(2 * Math.random() - 1);
    const phi = Math.random() * Math.PI * 2;

    surfacePositions.push(
      r * Math.sin(theta) * Math.cos(phi),
      r * Math.cos(theta),
      r * Math.sin(theta) * Math.sin(phi)
    );

    const shade = 0.9 + Math.random() * 0.2;
    surfaceColors.push(SUN_COLOR.r * shade, SUN_COLOR.g * shade, SUN_COLOR.b);
    surfaceSizes.push(0.02 * (0.8 + Math.random() * 0.4));
    surfaceAlphas.push(0.9 + Math.random() * 0.1);
  }

  const surface = pointsFrom(surfacePositions, surfaceColors, surfaceSizes, surfaceAlphas, sprite, {
    fadeBackface: true,
  });

  const glowPositions = [];
  const glowColors = [];
  const glowSizes = [];
  const glowAlphas = [];
  const white = new THREE.Color(0xffffff);

  for (let i = 0; i < SUN_GLOW_COUNT; i++) {
    const r = SUN_GLOW_RADIUS * Math.pow(Math.random(), 0.6);
    const theta = Math.acos(2 * Math.random() - 1);
    const phi = Math.random() * Math.PI * 2;

    glowPositions.push(
      r * Math.sin(theta) * Math.cos(phi),
      r * Math.cos(theta),
      r * Math.sin(theta) * Math.sin(phi)
    );

    const mixed = SUN_COLOR.clone().lerp(white, 0.3);
    glowColors.push(mixed.r, mixed.g, mixed.b);
    glowSizes.push(0.16 * (0.7 + Math.random() * 0.6));
    glowAlphas.push(0.07 + Math.random() * 0.06);
  }

  const glow = pointsFrom(glowPositions, glowColors, glowSizes, glowAlphas, sprite);

  return { surface, glow };
}

function buildPlanetBody(sprite, { color, bodyRadius, pointCount }) {
  const positions = [];
  const colors = [];
  const sizes = [];
  const alphas = [];
  const base = new THREE.Color(color);
  // Scales with bodyRadius so small and large planets both read as filled
  // spheres rather than the small ones showing visible gaps between dots.
  const pointSize = bodyRadius * 0.5;

  for (let i = 0; i < pointCount; i++) {
    const r = bodyRadius * Math.cbrt(Math.random());
    const theta = Math.acos(2 * Math.random() - 1);
    const phi = Math.random() * Math.PI * 2;

    positions.push(
      r * Math.sin(theta) * Math.cos(phi),
      r * Math.cos(theta),
      r * Math.sin(theta) * Math.sin(phi)
    );

    const shade = 0.8 + Math.random() * 0.35;
    colors.push(base.r * shade, base.g * shade, base.b * shade);
    sizes.push(pointSize * (0.8 + Math.random() * 0.4));
    alphas.push(0.85 + Math.random() * 0.15);
  }

  return pointsFrom(positions, colors, sizes, alphas, sprite, { fadeBackface: true });
}

function buildOrbitRing(sprite, radius) {
  const positions = [];
  const colors = [];
  const sizes = [];
  const alphas = [];
  const count = Math.round(160 + radius * 90);

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const jitterR = radius + (Math.random() - 0.5) * radius * 0.008;

    positions.push(
      Math.cos(angle) * jitterR,
      (Math.random() - 0.5) * radius * 0.003,
      Math.sin(angle) * jitterR
    );

    const shade = 0.6 + Math.random() * 0.2;
    colors.push(shade, shade, shade);
    sizes.push(0.005 + Math.random() * 0.003);
    alphas.push(0.1 + Math.random() * 0.12);
  }

  return pointsFrom(positions, colors, sizes, alphas, sprite);
}

function buildSaturnRing(sprite, { bodyRadius, color }) {
  const positions = [];
  const colors = [];
  const sizes = [];
  const alphas = [];
  const innerR = bodyRadius * 1.5;
  const outerR = bodyRadius * 2.6;
  const count = 1400;
  const base = new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.3);

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = innerR + Math.random() * (outerR - innerR);

    positions.push(Math.cos(angle) * r, (Math.random() - 0.5) * bodyRadius * 0.02, Math.sin(angle) * r);

    const shade = 0.75 + Math.random() * 0.25;
    colors.push(base.r * shade, base.g * shade, base.b * shade);
    sizes.push(bodyRadius * 0.12 * (0.6 + Math.random() * 0.6));
    alphas.push(0.5 + Math.random() * 0.4);
  }

  return pointsFrom(positions, colors, sizes, alphas, sprite);
}
