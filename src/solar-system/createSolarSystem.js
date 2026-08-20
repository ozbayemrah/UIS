import * as THREE from 'three';
import { createPointSprite } from '../shared/pointSprite.js';
import { pointsFrom } from '../shared/points.js';
import { buildStarfield } from '../shared/starfield.js';

// Same "same format" rule as the galaxy: no real distances or sizes here,
// just enough separation for all eight planets to read clearly at once.
// Real Mercury:Neptune spacing spans ~80:1, which would leave the inner
// planets invisibly bunched at any scale that also fits Neptune - orbits
// are compressed, not to scale, chosen purely so gaps stay legible.
//
// `info` on each entry is real astronomical data (unlike the geometry above,
// which is stylized) - shown in the hover popup via each planet's marker.
const PLANETS = [
  {
    name: 'Mercury',
    color: 0x9c9691,
    orbitRadius: 0.42,
    bodyRadius: 0.018,
    info: [
      { label: 'Order from Sun', value: '1st' },
      { label: 'Diameter', value: '4,879 km' },
      { label: 'Day length', value: '59 d' },
      { label: 'Year length', value: '88 d' },
      { label: 'Moons', value: '0' },
      { label: 'Distance from Sun', value: '57.9M km' },
    ],
  },
  {
    name: 'Venus',
    color: 0xe8cfa0,
    orbitRadius: 0.6,
    bodyRadius: 0.026,
    info: [
      { label: 'Order from Sun', value: '2nd' },
      { label: 'Diameter', value: '12,104 km' },
      { label: 'Day length', value: '243 d' },
      { label: 'Year length', value: '225 d' },
      { label: 'Moons', value: '0' },
      { label: 'Distance from Sun', value: '108.2M km' },
    ],
  },
  {
    name: 'Earth',
    color: 0x4f8fd1,
    orbitRadius: 0.8,
    bodyRadius: 0.028,
    info: [
      { label: 'Order from Sun', value: '3rd' },
      { label: 'Diameter', value: '12,742 km' },
      { label: 'Day length', value: '24 hrs' },
      { label: 'Year length', value: '365 d' },
      { label: 'Moons', value: '1' },
      { label: 'Distance from Sun', value: '149.6M km' },
    ],
  },
  {
    name: 'Mars',
    color: 0xc1642f,
    orbitRadius: 1.02,
    bodyRadius: 0.022,
    info: [
      { label: 'Order from Sun', value: '4th' },
      { label: 'Diameter', value: '6,779 km' },
      { label: 'Day length', value: '24.6 hrs' },
      { label: 'Year length', value: '687 d' },
      { label: 'Moons', value: '2' },
      { label: 'Distance from Sun', value: '227.9M km' },
    ],
  },
  {
    name: 'Jupiter',
    color: 0xd9b98d,
    orbitRadius: 1.42,
    bodyRadius: 0.078,
    info: [
      { label: 'Order from Sun', value: '5th' },
      { label: 'Diameter', value: '139,820 km' },
      { label: 'Day length', value: '9.9 hrs' },
      { label: 'Year length', value: '11.9 yrs' },
      { label: 'Moons', value: '95' },
      { label: 'Distance from Sun', value: '778.5M km' },
    ],
  },
  {
    name: 'Saturn',
    color: 0xe3cf9e,
    orbitRadius: 1.82,
    bodyRadius: 0.066,
    hasRing: true,
    info: [
      { label: 'Order from Sun', value: '6th' },
      { label: 'Diameter', value: '116,460 km' },
      { label: 'Day length', value: '10.7 hrs' },
      { label: 'Year length', value: '29.5 yrs' },
      { label: 'Moons', value: '146' },
      { label: 'Distance from Sun', value: '1.43B km' },
    ],
  },
  {
    name: 'Uranus',
    color: 0x9fdde0,
    orbitRadius: 2.18,
    bodyRadius: 0.046,
    info: [
      { label: 'Order from Sun', value: '7th' },
      { label: 'Diameter', value: '50,724 km' },
      { label: 'Day length', value: '17.2 hrs' },
      { label: 'Year length', value: '84 yrs' },
      { label: 'Moons', value: '28' },
      { label: 'Distance from Sun', value: '2.87B km' },
    ],
  },
  {
    name: 'Neptune',
    color: 0x3d63d1,
    orbitRadius: 2.52,
    bodyRadius: 0.044,
    info: [
      { label: 'Order from Sun', value: '8th' },
      { label: 'Diameter', value: '49,244 km' },
      { label: 'Day length', value: '16.1 hrs' },
      { label: 'Year length', value: '165 yrs' },
      { label: 'Moons', value: '16' },
      { label: 'Distance from Sun', value: '4.5B km' },
    ],
  },
];

const SUN_INFO = [
  { label: 'Type', value: 'G2V yellow dwarf' },
  { label: 'Age', value: '~4.6 billion yrs' },
  { label: 'Diameter', value: '1.39M km (109× Earth)' },
  { label: 'Mass', value: '~333,000× Earth' },
  { label: 'Surface temp', value: '~5,500°C' },
  { label: 'Core temp', value: '~15 million °C' },
  { label: 'Rotation', value: '~27 d' },
];

// The Solar System is just the default configuration of the generic engine
// below - other real systems (see exoplanetSystems.js) plug into the exact
// same createStarSystem(), just with their own star color/info and planets.
export const SOL_CONFIG = {
  starLabel: 'Sun',
  starColor: 0xfff1c2,
  starInfo: SUN_INFO,
  planets: PLANETS,
};

// Every star renders at the same stylized surface/glow size regardless of
// its real size - scale here is already arbitrary (see PLANETS' comment),
// and keeping it fixed means every system shares one visual envelope, so
// the same camera view (main.js) works unmodified for all of them.
const STAR_SURFACE_RADIUS = 0.13;
const STAR_GLOW_COUNT = 90;
const STAR_GLOW_RADIUS = 0.34;

const ORBIT_SPEED_BASE = 0.16; // radians/sec at orbitRadius = 1, Kepler-ish falloff beyond that

// Kept well outside OrbitControls.maxDistance (main.js) so the camera never
// reaches the shell, same rule the galaxy's background uses.
const BACKGROUND_RADIUS = 25;
const BACKGROUND_STAR_COUNT = 8000;
const BACKGROUND_POINT_SIZE = 0.065;

export function createStarSystem(config = SOL_CONFIG) {
  const group = new THREE.Group();
  const sprite = createPointSprite();
  const materials = [];
  const orbits = [];
  const markers = [];

  // Planets are lit mesh spheres, not glow-sprite points - they need an
  // actual light to read as solid 3D bodies. A point light at the star's
  // position (the only "star" in this scene) plus a low ambient fill so the
  // unlit side isn't pure black.
  const starLight = new THREE.PointLight(0xffffff, 3.2, 0, 0.6);
  group.add(starLight);
  group.add(new THREE.AmbientLight(0xffffff, 0.35));

  const background = buildStarfield(sprite, {
    radius: BACKGROUND_RADIUS,
    count: BACKGROUND_STAR_COUNT,
    pointSize: BACKGROUND_POINT_SIZE,
  });
  group.add(background);
  materials.push(background.material);

  const { surface, glow } = buildStar(sprite, config.starColor);
  group.add(glow, surface);
  materials.push(glow.material);

  // Anchored to the top-level `group` (which never moves - the star sits at
  // the scene origin) at (0,0,0), same pattern the galaxy's own system
  // markers use for their non-orbiting anchor.
  markers.push({ label: config.starLabel, group, position: new THREE.Vector3(0, 0, 0), info: config.starInfo });

  for (const planet of config.planets) {
    const ring = buildOrbitRing(sprite, planet.orbitRadius);
    group.add(ring);
    materials.push(ring.material);

    const pivot = new THREE.Group();
    pivot.rotation.y = Math.random() * Math.PI * 2; // random starting phase, else every planet lines up at spawn
    const holder = new THREE.Group();
    holder.position.set(planet.orbitRadius, 0, 0);

    const body = buildPlanetBody(planet);
    holder.add(body);

    if (planet.hasRing) {
      const saturnRing = buildPlanetRing(sprite, planet);
      holder.add(saturnRing);
      materials.push(saturnRing.material);
    }

    pivot.add(holder);
    group.add(pivot);

    // Kepler-ish: farther planets orbit slower. Direction is the same for
    // all of them (counter-clockwise from above), like the real solar system.
    const speed = ORBIT_SPEED_BASE / Math.pow(planet.orbitRadius, 1.5);
    orbits.push({ pivot, speed });

    // `holder` is the planet's own local space (the body sits at its
    // origin), so anchoring a marker to it - rather than to the top-level
    // `group` - means the marker's per-frame reprojection automatically
    // follows the orbit, no separate position-tracking needed.
    markers.push({ label: planet.name, group: holder, position: new THREE.Vector3(0, 0, 0), info: planet.info });
  }

  return { group, materials, orbits, markers };
}

export function updateOrbits(orbits, deltaSeconds) {
  for (const orbit of orbits) {
    orbit.pivot.rotation.y += orbit.speed * deltaSeconds;
  }
}

function buildStar(sprite, starColorHex) {
  const starColor = new THREE.Color(starColorHex);

  // Same fix as the planets: a crisp lit-looking mesh sphere instead of a
  // point-sprite cluster, which read as a grainy/hollow blob at this size.
  // MeshBasicMaterial (unlit) rather than the planets' MeshLambertMaterial -
  // the star is the scene's own light source, so it should read as constantly
  // self-lit rather than shaded by it. The soft glow halo below is unchanged.
  const surface = new THREE.Mesh(
    new THREE.SphereGeometry(STAR_SURFACE_RADIUS, 32, 24),
    new THREE.MeshBasicMaterial({ color: starColor })
  );

  const glowPositions = [];
  const glowColors = [];
  const glowSizes = [];
  const glowAlphas = [];
  const white = new THREE.Color(0xffffff);

  for (let i = 0; i < STAR_GLOW_COUNT; i++) {
    const r = STAR_GLOW_RADIUS * Math.pow(Math.random(), 0.6);
    const theta = Math.acos(2 * Math.random() - 1);
    const phi = Math.random() * Math.PI * 2;

    glowPositions.push(
      r * Math.sin(theta) * Math.cos(phi),
      r * Math.cos(theta),
      r * Math.sin(theta) * Math.sin(phi)
    );

    const mixed = starColor.clone().lerp(white, 0.3);
    glowColors.push(mixed.r, mixed.g, mixed.b);
    glowSizes.push(0.16 * (0.7 + Math.random() * 0.6));
    glowAlphas.push(0.07 + Math.random() * 0.06);
  }

  const glow = pointsFrom(glowPositions, glowColors, glowSizes, glowAlphas, sprite);

  return { surface, glow };
}

function buildPlanetBody({ color, bodyRadius }) {
  // A real lit mesh sphere, not a point-sprite. Points here (even a single
  // one) go through the additive-blended glow shader every other layer in
  // this app uses - fine for stars/dust, but a bright soft-edged sprite at
  // planet size just reads as a blurry "flashlight" rather than a body.
  // MeshLambertMaterial (no specular) + the sun's PointLight gives a flat,
  // matte, crisply-edged sphere instead.
  const geometry = new THREE.SphereGeometry(bodyRadius, 24, 16);
  const material = new THREE.MeshLambertMaterial({ color });
  return new THREE.Mesh(geometry, material);
}

function buildOrbitRing(sprite, radius) {
  const positions = [];
  const colors = [];
  const sizes = [];
  const alphas = [];
  const count = Math.round(340 + radius * 220);

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const jitterR = radius + (Math.random() - 0.5) * radius * 0.004;

    positions.push(
      Math.cos(angle) * jitterR,
      (Math.random() - 0.5) * radius * 0.0015,
      Math.sin(angle) * jitterR
    );

    const shade = 0.85 + Math.random() * 0.15;
    colors.push(shade, shade, shade);
    sizes.push(0.005 + Math.random() * 0.002);
    alphas.push(0.4 + Math.random() * 0.25);
  }

  return pointsFrom(positions, colors, sizes, alphas, sprite);
}

function buildPlanetRing(sprite, { bodyRadius, color }) {
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
