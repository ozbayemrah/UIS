// Continent-level markers - the coarse-grained stand-in for
// worldinformationcenter's country/capital marker system (locations.js/
// markerOverlay.js/capitalsList.js), which this scene deliberately doesn't
// port. Positions are a single representative lat/lon per continent (not a
// true area-weighted centroid, just a point that reads as "on the
// landmass"), since nothing in the source project provides continent
// geometry - `info` facts are real.
export const CONTINENTS = [
  {
    name: 'Africa',
    lat: 1,
    lon: 21,
    info: [
      { label: 'Area', value: '~30.4M km²' },
      { label: 'Population', value: '~1.5B' },
      { label: 'Countries', value: '54' },
      { label: 'Notable', value: 'Cradle of humankind' },
    ],
  },
  {
    name: 'Asia',
    lat: 34,
    lon: 100,
    info: [
      { label: 'Area', value: '~44.6M km²' },
      { label: 'Population', value: '~4.7B' },
      { label: 'Countries', value: '48' },
      { label: 'Notable', value: 'Largest and most populous continent' },
    ],
  },
  {
    name: 'Europe',
    lat: 54,
    lon: 25,
    info: [
      { label: 'Area', value: '~10.2M km²' },
      { label: 'Population', value: '~745M' },
      { label: 'Countries', value: '44' },
      { label: 'Notable', value: 'Smallest continent besides Oceania' },
    ],
  },
  {
    name: 'North America',
    lat: 45,
    lon: -100,
    info: [
      { label: 'Area', value: '~24.7M km²' },
      { label: 'Population', value: '~600M' },
      { label: 'Countries', value: '23' },
      { label: 'Notable', value: 'Home to the Grand Canyon' },
    ],
  },
  {
    name: 'South America',
    lat: -15,
    lon: -60,
    info: [
      { label: 'Area', value: '~17.8M km²' },
      { label: 'Population', value: '~435M' },
      { label: 'Countries', value: '12' },
      { label: 'Notable', value: "Contains Earth's largest rainforest" },
    ],
  },
  {
    name: 'Oceania',
    lat: -25,
    lon: 135,
    info: [
      { label: 'Area', value: '~8.5M km²' },
      { label: 'Population', value: '~45M' },
      { label: 'Countries', value: '14' },
      { label: 'Notable', value: "Includes Earth's largest reef system" },
    ],
  },
  {
    name: 'Antarctica',
    lat: -82,
    lon: 0,
    info: [
      { label: 'Area', value: '~14.2M km²' },
      { label: 'Population', value: 'No permanent residents' },
      { label: 'Countries', value: 'Governed by treaty' },
      { label: 'Notable', value: 'Coldest, driest, windiest continent' },
    ],
  },
];
