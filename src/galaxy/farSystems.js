import { getArmPoint } from './createGalaxy.js';

// A handful of real, notable star systems scattered across the wider
// galaxy - unlike nearbyStars.js (clustered near the Sun, our actual
// stellar neighborhood), these are placed at very different points on the
// disk/arms so the galaxy reads as having known systems "all around" it,
// not just next door. Distances are real; positions are not - same
// stylized-not-to-scale rule as everywhere else here.
//
// Anchored to a spiral arm via getArmPoint(radiusFraction, armIndex) so
// each one lands on the visible structure, not adrift in empty space.
const FAR_SYSTEMS = [
  {
    name: 'TRAPPIST-1',
    place: { radiusFraction: 0.3, armIndex: 1 },
    info: [
      { label: 'Distance from Sun', value: '~40 ly' },
      { label: 'Type', value: 'M8V ultracool dwarf' },
      { label: 'Known planets', value: '7 confirmed' },
      { label: 'Notable', value: 'Most Earth-sized planets around one star' },
    ],
  },
  {
    name: '51 Pegasi',
    place: { radiusFraction: 0.45, armIndex: 2 },
    info: [
      { label: 'Distance from Sun', value: '~51 ly' },
      { label: 'Type', value: 'G2IV, Sun-like' },
      { label: 'Known planets', value: '1 confirmed' },
      { label: 'Notable', value: 'First exoplanet found around a Sun-like star' },
    ],
  },
  {
    name: 'Cygnus X-1',
    place: { radiusFraction: 0.15, armIndex: 0 },
    info: [
      { label: 'Distance from Sun', value: '~7,200 ly' },
      { label: 'Type', value: 'Blue supergiant + black hole' },
      { label: 'Known planets', value: 'None' },
      { label: 'Notable', value: 'One of the first confirmed black holes' },
    ],
  },
  {
    name: 'HD 209458',
    place: { radiusFraction: 0.9, armIndex: 0 },
    info: [
      { label: 'Distance from Sun', value: '~159 ly' },
      { label: 'Type', value: 'G0V' },
      { label: 'Known planets', value: '1 confirmed ("Osiris")' },
      { label: 'Notable', value: 'First exoplanet caught transiting its star' },
    ],
  },
  {
    name: 'Kepler-452',
    place: { radiusFraction: 0.75, armIndex: 1 },
    info: [
      { label: 'Distance from Sun', value: '~1,800 ly' },
      { label: 'Type', value: 'G2V, Sun-like' },
      { label: 'Known planets', value: '1 confirmed' },
      { label: 'Notable', value: 'Called "Earth\'s cousin"' },
    ],
  },
  {
    name: 'PSR B1257+12',
    place: { radiusFraction: 0.85, armIndex: 2 },
    info: [
      { label: 'Distance from Sun', value: '~2,300 ly' },
      { label: 'Type', value: 'Millisecond pulsar' },
      { label: 'Known planets', value: '3 confirmed' },
      { label: 'Notable', value: 'First exoplanets ever confirmed (1992)' },
    ],
  },
];

export function getFarSystems() {
  return FAR_SYSTEMS.map(({ name, place, info }) => {
    const position = getArmPoint(place.radiusFraction, place.armIndex);
    return { label: name, position, info };
  });
}
