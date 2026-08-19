// Cheap multi-octave sine/cosine field over spherical angles.
// Not a "real" gradient noise, but gives smooth clumpy variation - used to
// scatter the halo into loose globular-cluster-like clumps rather than a
// uniform fuzzy shell.
export function angularFbm(theta, phi) {
  let n = 0;
  n += Math.sin(theta * 2.0) * Math.cos(phi * 3.0);
  n += 0.5 * Math.sin(theta * 5.0 + 1.3) * Math.cos(phi * 4.0 + 0.7);
  n += 0.25 * Math.sin(theta * 9.0 + 2.1) * Math.cos(phi * 7.0 + 1.9);
  // range is roughly [-1.75, 1.75], normalize to [0, 1]
  return n / 3.5 + 0.5;
}
