import * as THREE from 'three';
import { getSunPosition } from './createGalaxy.js';

// A curated set of real, well-known star systems - not the galaxy's actual
// stellar neighborhood (nothing here is to scale, same rule as the rest of
// the app), just fanned out in a small rosette around the Sun's own marker
// so each one stays independently hoverable rather than piling up on one
// point. Ordered roughly by real distance from the Sun, nearest first, so
// the fan-out radius grows outward with it - a loose nod to real distance
// without attempting actual placement.
const NEARBY_STARS = [
  {
    name: 'Alpha Centauri',
    info: [
      { label: 'Distance from Sun', value: '4.37 ly' },
      { label: 'Type', value: 'G2V + K1V + M5.5V' },
      { label: 'Known planets', value: '1+ (Proxima b)' },
      { label: 'Notable', value: 'Nearest star system to us' },
    ],
  },
  {
    name: 'Sirius',
    info: [
      { label: 'Distance from Sun', value: '8.66 ly' },
      { label: 'Type', value: 'A1V + white dwarf' },
      { label: 'Known planets', value: 'None confirmed' },
      { label: 'Notable', value: 'Brightest star in the night sky' },
    ],
  },
  {
    name: 'Altair',
    info: [
      { label: 'Distance from Sun', value: '16.7 ly' },
      { label: 'Type', value: 'A7V' },
      { label: 'Known planets', value: 'None confirmed' },
      { label: 'Notable', value: 'Spins fast enough to bulge at the equator' },
    ],
  },
  {
    name: 'Arcturus',
    info: [
      { label: 'Distance from Sun', value: '37 ly' },
      { label: 'Type', value: 'K1.5III red giant' },
      { label: 'Known planets', value: 'None confirmed' },
      { label: 'Notable', value: 'Brightest star in the northern sky' },
    ],
  },
  {
    name: 'Polaris',
    info: [
      { label: 'Distance from Sun', value: '~433 ly' },
      { label: 'Type', value: 'F7Ib supergiant' },
      { label: 'Known planets', value: 'None confirmed' },
      { label: 'Notable', value: 'The current North Star' },
    ],
  },
  {
    name: 'Betelgeuse',
    info: [
      { label: 'Distance from Sun', value: '~548 ly' },
      { label: 'Type', value: 'M1-2 red supergiant' },
      { label: 'Known planets', value: 'None confirmed' },
      { label: 'Notable', value: 'Expected to go supernova' },
    ],
  },
  {
    name: 'Antares',
    info: [
      { label: 'Distance from Sun', value: '~550 ly' },
      { label: 'Type', value: 'M1.5 red supergiant' },
      { label: 'Known planets', value: 'None confirmed' },
      { label: 'Notable', value: 'The "heart" of Scorpius' },
    ],
  },
  {
    name: 'Rigel',
    info: [
      { label: 'Distance from Sun', value: '~860 ly' },
      { label: 'Type', value: 'B8 blue supergiant' },
      { label: 'Known planets', value: 'None confirmed' },
      { label: 'Notable', value: '~120,000× the Sun\'s luminosity' },
    ],
  },
  {
    name: 'Deneb',
    info: [
      { label: 'Distance from Sun', value: '~2,600 ly' },
      { label: 'Type', value: 'A2 blue-white supergiant' },
      { label: 'Known planets', value: 'None confirmed' },
      { label: 'Notable', value: 'One of the most luminous stars known' },
    ],
  },
];

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ~137.5°, evenly fans out a ring without spokes lining up
const CLUSTER_MIN_RADIUS = 0.045; // just outside the Sun marker itself
const CLUSTER_RADIUS_STEP = 0.011;

export function getNearbyStars() {
  const sun = getSunPosition();

  return NEARBY_STARS.map((star, i) => {
    const radius = CLUSTER_MIN_RADIUS + i * CLUSTER_RADIUS_STEP;
    const angle = i * GOLDEN_ANGLE;
    const position = new THREE.Vector3(sun.x + Math.cos(angle) * radius, sun.y, sun.z + Math.sin(angle) * radius);
    return { label: star.name, position, info: star.info };
  });
}
