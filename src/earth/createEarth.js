import { latLngToVector3, latLngToUV } from '../shared/latlng.js';
import { createParticlePlanet } from '../shared/createParticlePlanet.js';
import { loadLandMask } from './landMask.js';
import { CONTINENTS } from './continents.js';

// Ported from worldinformationcenter's createGlobe.js: the globe is two
// THREE.Points clouds (surface + atmosphere) built from a real land/ocean
// texture, not a sphere mesh - see that project's CLAUDE.md for the full
// algorithm writeup. Surface/atmosphere generation itself now goes through
// the shared createParticlePlanet() engine (factored out so every other
// planet can reuse the same grid-walk/atmosphere machinery with a
// procedural surfaceFn instead of an image lookup) - what stays specific to
// Earth here is the land-mask image sampling and the 7 continent markers
// (continents.js), replacing the original project's per-country/capital
// marker system.
const RADIUS = 1;

// Ocean brightness in the source texture tops out well below 1.0 (mostly
// 0.03-0.08, occasionally ~0.2 for cloud/ice haze). Anything at or above
// this reads as "fully open ocean" for density/size/alpha purposes.
const OCEAN_BRIGHTNESS_CEILING = 0.18;

// grid spacing at gridStep=0.85deg, radius=1 is ~0.0148 world units;
// point sizes must stay under that or adjacent dots fully tile and
// additive-blend into a solid blown-out white sheet.
const LAND_POINT_SIZE = 0.0075;
const OCEAN_POINT_SIZE = 0.003;
const LAND_ALPHA = 0.95;
const OCEAN_ALPHA = 0.22;
const OCEAN_MIN_DENSITY = 0.3; // fraction of ocean grid cells kept

const TEXTURE_URL = `${import.meta.env.BASE_URL}textures/earth-landmask.jpg`;

export async function createEarth() {
  const { brightnessAt } = await loadLandMask(TEXTURE_URL);

  const surfaceFn = (lat, lon) => {
    const [u, v] = latLngToUV(lat, lon);
    const brightness = brightnessAt(u, v);
    const landness = 1 - Math.min(brightness / OCEAN_BRIGHTNESS_CEILING, 1);

    const size = (OCEAN_POINT_SIZE + (LAND_POINT_SIZE - OCEAN_POINT_SIZE) * landness) * (0.85 + Math.random() * 0.3);
    const alpha = (OCEAN_ALPHA + (LAND_ALPHA - OCEAN_ALPHA) * landness) * (0.8 + Math.random() * 0.2);
    const shade = 0.5 + landness * 0.45 + Math.random() * 0.1;

    return { value: landness, size, alpha, color: [shade, shade, shade * 0.97] };
  };

  // Thin out ocean cells so land reads as visibly denser - keepChance is
  // OCEAN_MIN_DENSITY at landness=0, 1.0 at landness=1.
  const keepChanceFn = (landness) => OCEAN_MIN_DENSITY + (1 - OCEAN_MIN_DENSITY) * landness;

  const { group, materials } = createParticlePlanet({
    surfaceFn,
    keepChanceFn,
    gridStep: 0.85,
    atmosphere: { count: 9000, clumpThreshold: 0.42 },
  });

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

  return { group, materials, markers };
}
