import * as THREE from 'three';

// A single clickable "you are here"-style marker: a map-pin shape (a
// vertical stem rising from the exact 3D point, capped with a glowing dot
// and label at the top) - all DOM (not WebGL), same approach the Earth
// version used for its capital-city markers, kept generic here so the same
// component can mark points of interest inside the Solar System scene too
// (e.g. planets), not just this one galaxy-level entry.
export function createPointOfInterest({ root, group, position, label, onSelect }) {
  const el = document.createElement('div');
  el.className = 'poi';
  el.innerHTML = `
    <div class="poi__hit"></div>
    <div class="poi__pin">
      <div class="poi__stem"></div>
      <div class="poi__head">
        <div class="poi__dot"></div>
        <div class="poi__label">${label}</div>
      </div>
    </div>
  `;
  root.appendChild(el);

  const hitEl = el.querySelector('.poi__hit');
  if (onSelect) {
    hitEl.classList.add('poi__hit--clickable');
    hitEl.addEventListener('click', () => onSelect());
  }

  const worldPos = new THREE.Vector3();
  const screenPos = new THREE.Vector3();
  const toPoint = new THREE.Vector3();
  const camDir = new THREE.Vector3();

  function update(camera, width, height) {
    worldPos.copy(position).applyMatrix4(group.matrixWorld);

    toPoint.copy(worldPos).sub(camera.position);
    camera.getWorldDirection(camDir);
    const inFront = toPoint.dot(camDir) > 0;

    if (!inFront) {
      el.style.opacity = '0';
      return;
    }

    screenPos.copy(worldPos).project(camera);
    const x = (screenPos.x * 0.5 + 0.5) * width;
    const y = (-screenPos.y * 0.5 + 0.5) * height;

    el.style.transform = `translate(${x}px, ${y}px)`;
    el.style.opacity = '1';
    el.classList.toggle('poi--flip', x > width / 2);
  }

  return { el, update };
}
