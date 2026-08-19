import * as THREE from 'three';
import { createVariablePointsMaterial } from './variablePointsMaterial.js';

// Shared by every point-cloud layer across scenes (galaxy arms/bulge/halo,
// solar system planets/orbit rings/sun) - same attribute layout in, same
// shader material out, per createVariablePointsMaterial's uniforms.
export function pointsFrom(positions, colors, sizes, alphas, sprite, materialOptions) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('pointSize', new THREE.Float32BufferAttribute(sizes, 1));
  geometry.setAttribute('pointAlpha', new THREE.Float32BufferAttribute(alphas, 1));

  const material = createVariablePointsMaterial(sprite, materialOptions);
  return new THREE.Points(geometry, material);
}
