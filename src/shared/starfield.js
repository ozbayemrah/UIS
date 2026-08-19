import { pointsFrom } from './points.js';

// A large, far-away sphere shell of small, mostly-white points - generic
// visual backdrop context for any scene, not tied to the galaxy or solar
// system's own scale. Radius should sit well outside that scene's
// OrbitControls.maxDistance so it reads as a fixed, never-reachable sky.
export function buildStarfield(sprite, { radius, count, pointSize }) {
  const positions = [];
  const colors = [];
  const sizes = [];
  const alphas = [];

  for (let i = 0; i < count; i++) {
    const theta = Math.acos(2 * Math.random() - 1);
    const phi = Math.random() * Math.PI * 2;
    const r = radius * (0.75 + Math.random() * 0.25);

    const x = r * Math.sin(theta) * Math.cos(phi);
    const y = r * Math.cos(theta);
    const z = r * Math.sin(theta) * Math.sin(phi);
    positions.push(x, y, z);

    const warmth = Math.random();
    const shade = 0.75 + Math.random() * 0.25;
    colors.push(shade, shade, shade * (0.92 + warmth * 0.08));

    sizes.push(pointSize * (0.5 + Math.random() * 0.9));
    alphas.push(0.5 + Math.random() * 0.5);
  }

  return pointsFrom(positions, colors, sizes, alphas, sprite);
}
