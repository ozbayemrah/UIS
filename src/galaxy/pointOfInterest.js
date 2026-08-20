import * as THREE from 'three';

// A single clickable "you are here"-style marker: a map-pin shape (a
// vertical stem rising above the exact 3D point, fading in from transparent
// at the point to full opacity at the tip, capped with a plain dot and a
// label reading to its right) - all DOM (not WebGL), same approach the
// Earth version used for its capital-city markers, kept generic here so
// the same component can mark points of interest inside the Solar System
// scene too (e.g. planets), not just this one galaxy-level entry.
//
// `info` (optional) is a flat list of { label, value } facts shown in a
// popup card while the dot+label are hovered - purely presentational data
// owned by the caller, this component just renders whatever rows it's given.
export function createPointOfInterest({ root, group, position, label, info, onSelect }) {
  const el = document.createElement('div');
  el.className = 'poi';
  el.innerHTML = `
    <div class="poi__hit"></div>
    <div class="poi__pin">
      <div class="poi__stem"></div>
      <div class="poi__head">
        <div class="poi__dot"></div>
        <div class="poi__label">${label}</div>
        ${info ? renderPopup(label, info) : ''}
      </div>
    </div>
  `;
  root.appendChild(el);

  // `.poi__hit` is a direct child of `.poi` (not `.poi__pin`/`.poi__head`),
  // so its own (0,0) is the raw 3D anchor point - PIN_HEIGHT re-derives the
  // pin-tip offset .poi__pin/.poi__head use via CSS, so the hit rect lines
  // up with where the dot + label are actually drawn, not the anchor below.
  // Sized once from the label's rendered width/height (not a fixed guess)
  // so hovering/clicking anywhere over either the dot or the label works,
  // with extra padding on top of that for an easier target.
  const PIN_HEIGHT = 66;
  const hitEl = el.querySelector('.poi__hit');
  const labelEl = el.querySelector('.poi__label');
  if (onSelect || info) {
    const HIT_PAD_X = 14;
    const HIT_PAD_Y = 12;
    const DOT_RADIUS = 2.5;
    const LABEL_GAP = 8;

    const leftBound = -DOT_RADIUS;
    const rightBound = LABEL_GAP + labelEl.offsetWidth;
    const halfHeight = Math.max(DOT_RADIUS, labelEl.offsetHeight / 2) + HIT_PAD_Y;

    hitEl.style.left = `${leftBound - HIT_PAD_X}px`;
    hitEl.style.width = `${rightBound - leftBound + HIT_PAD_X * 2}px`;
    hitEl.style.top = `${-PIN_HEIGHT - halfHeight}px`;
    hitEl.style.height = `${halfHeight * 2}px`;
    hitEl.classList.add('poi__hit--interactive');
  }

  if (onSelect) {
    hitEl.classList.add('poi__hit--clickable');
    hitEl.addEventListener('click', () => onSelect());
  }

  if (info) {
    hitEl.addEventListener('mouseenter', () => el.classList.add('poi--hovered'));
    hitEl.addEventListener('mouseleave', () => el.classList.remove('poi--hovered'));
  }

  const worldPos = new THREE.Vector3();
  const screenPos = new THREE.Vector3();
  const toPoint = new THREE.Vector3();
  const camDir = new THREE.Vector3();

  function update(camera, width, height) {
    // `group` may be an orbiting planet's holder, whose local rotation can
    // change earlier in the same frame (updateOrbits) - matrixWorld is
    // otherwise only refreshed inside renderer.render(), so without this
    // the marker would reproject from last frame's transform.
    group.updateMatrixWorld();
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
  }

  return { el, update };
}

function renderPopup(title, rows) {
  const rowsHtml = rows
    .map(({ label: rowLabel, value }) => `
      <div class="poi__popup-row">
        <span>${rowLabel}</span>
        <span>${value}</span>
      </div>
    `)
    .join('');
  return `
    <div class="poi__popup">
      <div class="poi__popup-title">${title}</div>
      ${rowsHtml}
    </div>
  `;
}
