// Real exoplanet systems, playable the same way the Solar System is: each
// entry is a config for createStarSystem() (see createSolarSystem.js),
// keyed by the exact marker label used in nearbyStars.js/farSystems.js so
// main.js can look up "does this marker have a system to enter?" by name.
//
// Orbit/body radii are stylized to fit the same visual envelope Sol's
// planets use (roughly 0.35-2.5 for orbits) - same "legible over accurate"
// rule as everywhere else, since real exoplanet orbits are often far
// tighter than our own (TRAPPIST-1's whole system fits inside Mercury's
// real orbit). Everything in each `info` array is real published data.
export const EXOPLANET_SYSTEMS = {
  'Alpha Centauri': {
    starLabel: 'Proxima Centauri',
    starColor: 0xff6b4a,
    starInfo: [
      { label: 'Type', value: 'M5.5V red dwarf' },
      { label: 'Part of', value: 'Alpha Centauri triple system' },
      { label: 'Distance from Sun', value: '4.24 ly' },
      { label: 'Known planets', value: '1 confirmed' },
    ],
    planets: [
      {
        name: 'Proxima b',
        color: 0x8faa6e,
        orbitRadius: 0.55,
        bodyRadius: 0.03,
        info: [
          { label: 'Order from star', value: '1st' },
          { label: 'Radius', value: '~1.07× Earth' },
          { label: 'Orbital period', value: '11.2 d' },
          { label: 'Distance from star', value: '0.05 AU' },
        ],
      },
    ],
  },
  'TRAPPIST-1': {
    starLabel: 'TRAPPIST-1',
    starColor: 0xcc4f3a,
    starInfo: [
      { label: 'Type', value: 'M8V ultracool dwarf' },
      { label: 'Distance from Sun', value: '~40 ly' },
      { label: 'Known planets', value: '7 confirmed' },
      { label: 'Notable', value: 'Most Earth-sized planets around one star' },
    ],
    planets: [
      {
        name: 'TRAPPIST-1b',
        color: 0xaa8f7a,
        orbitRadius: 0.35,
        bodyRadius: 0.031,
        info: [
          { label: 'Order from star', value: '1st' },
          { label: 'Radius', value: '~1.12× Earth' },
          { label: 'Orbital period', value: '1.51 d' },
          { label: 'Distance from star', value: '0.0115 AU' },
        ],
      },
      {
        name: 'TRAPPIST-1c',
        color: 0xc9a876,
        orbitRadius: 0.68,
        bodyRadius: 0.031,
        info: [
          { label: 'Order from star', value: '2nd' },
          { label: 'Radius', value: '~1.10× Earth' },
          { label: 'Orbital period', value: '2.42 d' },
          { label: 'Distance from star', value: '0.0158 AU' },
        ],
      },
      {
        name: 'TRAPPIST-1d',
        color: 0x8f7d6b,
        orbitRadius: 1.02,
        bodyRadius: 0.022,
        info: [
          { label: 'Order from star', value: '3rd' },
          { label: 'Radius', value: '~0.79× Earth' },
          { label: 'Orbital period', value: '4.05 d' },
          { label: 'Distance from star', value: '0.0223 AU' },
        ],
      },
      {
        name: 'TRAPPIST-1e',
        color: 0x5b8fc9,
        orbitRadius: 1.35,
        bodyRadius: 0.026,
        info: [
          { label: 'Order from star', value: '4th' },
          { label: 'Radius', value: '~0.92× Earth' },
          { label: 'Orbital period', value: '6.10 d' },
          { label: 'Distance from star', value: '0.0293 AU' },
        ],
      },
      {
        name: 'TRAPPIST-1f',
        color: 0x6fa8c9,
        orbitRadius: 1.68,
        bodyRadius: 0.029,
        info: [
          { label: 'Order from star', value: '5th' },
          { label: 'Radius', value: '~1.04× Earth' },
          { label: 'Orbital period', value: '9.21 d' },
          { label: 'Distance from star', value: '0.0385 AU' },
        ],
      },
      {
        name: 'TRAPPIST-1g',
        color: 0x7a95a8,
        orbitRadius: 2.02,
        bodyRadius: 0.032,
        info: [
          { label: 'Order from star', value: '6th' },
          { label: 'Radius', value: '~1.13× Earth' },
          { label: 'Orbital period', value: '12.35 d' },
          { label: 'Distance from star', value: '0.0469 AU' },
        ],
      },
      {
        name: 'TRAPPIST-1h',
        color: 0xb8c4cc,
        orbitRadius: 2.35,
        bodyRadius: 0.021,
        info: [
          { label: 'Order from star', value: '7th' },
          { label: 'Radius', value: '~0.76× Earth' },
          { label: 'Orbital period', value: '18.77 d' },
          { label: 'Distance from star', value: '0.0619 AU' },
        ],
      },
    ],
  },
  '51 Pegasi': {
    starLabel: '51 Pegasi',
    starColor: 0xfff3cc,
    starInfo: [
      { label: 'Type', value: 'G2IV, Sun-like' },
      { label: 'Distance from Sun', value: '~51 ly' },
      { label: 'Known planets', value: '1 confirmed' },
      { label: 'Notable', value: 'First exoplanet found around a Sun-like star' },
    ],
    planets: [
      {
        name: '51 Pegasi b',
        color: 0xd9a66d,
        orbitRadius: 0.45,
        bodyRadius: 0.075,
        info: [
          { label: 'Order from star', value: '1st' },
          { label: 'Mass', value: '~0.46× Jupiter' },
          { label: 'Orbital period', value: '4.23 d' },
          { label: 'Distance from star', value: '0.053 AU' },
        ],
      },
    ],
  },
  'HD 209458': {
    starLabel: 'HD 209458',
    starColor: 0xfff8e0,
    starInfo: [
      { label: 'Type', value: 'G0V' },
      { label: 'Distance from Sun', value: '~159 ly' },
      { label: 'Known planets', value: '1 confirmed' },
      { label: 'Notable', value: 'First exoplanet caught transiting its star' },
    ],
    planets: [
      {
        name: 'HD 209458 b',
        color: 0xcf8f5a,
        orbitRadius: 0.45,
        bodyRadius: 0.09,
        info: [
          { label: 'Order from star', value: '1st' },
          { label: 'Radius', value: '~1.4× Jupiter' },
          { label: 'Orbital period', value: '3.52 d' },
          { label: 'Distance from star', value: '0.047 AU' },
        ],
      },
    ],
  },
  'Kepler-452': {
    starLabel: 'Kepler-452',
    starColor: 0xffedc2,
    starInfo: [
      { label: 'Type', value: 'G2V, Sun-like' },
      { label: 'Distance from Sun', value: '~1,800 ly' },
      { label: 'Known planets', value: '1 confirmed' },
      { label: 'Notable', value: 'Called "Earth\'s cousin"' },
    ],
    planets: [
      {
        name: 'Kepler-452b',
        color: 0x6fa87a,
        orbitRadius: 1.0,
        bodyRadius: 0.045,
        info: [
          { label: 'Order from star', value: '1st' },
          { label: 'Radius', value: '~1.6× Earth' },
          { label: 'Orbital period', value: '385 d' },
          { label: 'Distance from star', value: '1.05 AU' },
        ],
      },
    ],
  },
  'PSR B1257+12': {
    starLabel: 'PSR B1257+12',
    starColor: 0xdfe8ff,
    starInfo: [
      { label: 'Type', value: 'Millisecond pulsar' },
      { label: 'Distance from Sun', value: '~2,300 ly' },
      { label: 'Known planets', value: '3 confirmed' },
      { label: 'Notable', value: 'First exoplanets ever confirmed (1992)' },
    ],
    planets: [
      {
        name: 'Draugr',
        color: 0x9c9691,
        orbitRadius: 0.6,
        bodyRadius: 0.012,
        info: [
          { label: 'Order from star', value: '1st' },
          { label: 'Mass', value: '~0.02× Earth' },
          { label: 'Orbital period', value: '25.3 d' },
          { label: 'Distance from star', value: '0.19 AU' },
        ],
      },
      {
        name: 'Poltergeist',
        color: 0xa89a8c,
        orbitRadius: 1.3,
        bodyRadius: 0.032,
        info: [
          { label: 'Order from star', value: '2nd' },
          { label: 'Mass', value: '~4.3× Earth' },
          { label: 'Orbital period', value: '66.5 d' },
          { label: 'Distance from star', value: '0.36 AU' },
        ],
      },
      {
        name: 'Phobetor',
        color: 0x8f8478,
        orbitRadius: 2.0,
        bodyRadius: 0.031,
        info: [
          { label: 'Order from star', value: '3rd' },
          { label: 'Mass', value: '~3.9× Earth' },
          { label: 'Orbital period', value: '98.2 d' },
          { label: 'Distance from star', value: '0.46 AU' },
        ],
      },
    ],
  },
};
