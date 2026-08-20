import * as THREE from 'three';

// Standard equirectangular mapping: u=0 at lon=-180 (west edge), v=0 at lat=90 (north pole).
// Kept in one place so texture sampling and marker placement always agree.
export function latLngToUV(lat, lon) {
  const u = (lon + 180) / 360;
  const v = (90 - lat) / 180;
  return [u, v];
}

export function latLngToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
}
