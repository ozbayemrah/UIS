// Each scene (galaxy, solar system) builds its own point sprite texture and
// shader materials from scratch on entry, so switching scenes must free the
// previous ones explicitly - three.js doesn't garbage-collect GPU resources
// just because a Group is removed from the scene graph.
export function disposeGroup(group) {
  group.traverse((object) => {
    if (object.geometry) object.geometry.dispose();
    if (!object.material) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (material.map) material.map.dispose();
      if (material.uniforms?.map?.value) material.uniforms.map.value.dispose();
      material.dispose();
    }
  });
}
