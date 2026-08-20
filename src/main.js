import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createGalaxy, getSunPosition } from './galaxy/createGalaxy.js';
import { createPointOfInterest } from './galaxy/pointOfInterest.js';
import { getNearbyStars } from './galaxy/nearbyStars.js';
import { getFarSystems } from './galaxy/farSystems.js';
import { createStarSystem, updateOrbits, SOL_CONFIG } from './solar-system/createSolarSystem.js';
import { EXOPLANET_SYSTEMS } from './solar-system/exoplanetSystems.js';
import { createEarth } from './earth/createEarth.js';
import { updatePointScale, updateWaveTime } from './shared/variablePointsMaterial.js';
import { disposeGroup } from './shared/disposeGroup.js';
import { initCustomCursor } from './shared/customCursor.js';

const sceneRoot = document.getElementById('scene-root');
const poiRoot = document.getElementById('poi-root');
const veilEl = document.getElementById('transition-veil');
const backButtonEl = document.getElementById('back-button');
const hudHintEl = document.querySelector('.hud__hint');

const GALAXY_VIEW = {
  position: new THREE.Vector3(0, 1.05, 2.35),
  minDistance: 0.35,
  maxDistance: 8,
  autoRotateSpeed: 0.15,
  hint: 'drag to rotate · scroll to zoom · click a marker to enter its system',
};
const SYSTEM_VIEW = {
  position: new THREE.Vector3(0, 6, 8),
  minDistance: 0.25,
  maxDistance: 12,
  autoRotateSpeed: 0.06,
  hint: 'drag to rotate · scroll to zoom',
};
const EARTH_VIEW = {
  position: new THREE.Vector3(0, 0, 2.7),
  minDistance: 1.6,
  maxDistance: 5,
  autoRotateSpeed: 0.2,
  hint: 'drag to rotate · scroll to zoom',
};

const TRANSITION_MS = 650;

// Real-world facts about the actual Sun/Solar System, shown in the hover
// popup - separate from the procedural, non-real-scale geometry the app
// otherwise builds. "Distance from galactic core" stands in for "distance
// from the center of the universe": the universe has no center under
// modern cosmology, but the galactic core is the nearest meaningful anchor
// and is what people usually mean by that question.
const SOLAR_SYSTEM_INFO = [
  { label: 'Planets', value: '8' },
  { label: 'Star type', value: 'G2V yellow dwarf' },
  { label: 'Star age', value: '~4.6 billion yrs' },
  { label: 'Star diameter', value: '~1.39M km (109× Earth)' },
  { label: 'Surface temp', value: '~5,500°C' },
  { label: 'Location', value: 'Orion Arm' },
  { label: 'Dist. from galactic core', value: '~26,000 ly' },
];

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, sceneRoot.clientWidth / sceneRoot.clientHeight, 0.05, 200);
camera.position.copy(GALAXY_VIEW.position);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(sceneRoot.clientWidth, sceneRoot.clientHeight);
renderer.setClearColor(0x000000, 1);
sceneRoot.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.rotateSpeed = 0.45;
controls.zoomSpeed = 0.6;
controls.autoRotate = true;

let pointMaterials = [];
let currentGroup = null;
let markers = [];
let orbits = [];
let currentView = 'galaxy';
let transitioning = false;
let cameraAnim = null;

function onResize() {
  const width = sceneRoot.clientWidth;
  const height = sceneRoot.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  for (const material of pointMaterials) updatePointScale(material, renderer, camera);
}
window.addEventListener('resize', onResize);

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// A short dolly toward the clicked point (not all the way - the veil fade
// covers the rest) so the transition reads as "zooming in", not just a cut.
function startCameraDolly(targetWorldPos, duration) {
  const fromPos = camera.position.clone();
  const distance = fromPos.distanceTo(targetWorldPos);
  const dir = targetWorldPos.clone().sub(fromPos).normalize();
  const toPos = fromPos.clone().add(dir.multiplyScalar(distance * 0.55));
  cameraAnim = { fromPos, toPos, start: performance.now(), duration };
}

function fadeVeil(visible) {
  veilEl.classList.toggle('veil--visible', visible);
  return new Promise((resolve) => setTimeout(resolve, TRANSITION_MS + 30));
}

function teardownScene() {
  if (currentGroup) {
    scene.remove(currentGroup);
    disposeGroup(currentGroup);
    currentGroup = null;
  }
  for (const marker of markers) marker.el.remove();
  markers = [];
  pointMaterials = [];
  orbits = [];
}

function applyView(viewConfig) {
  camera.position.copy(viewConfig.position);
  controls.minDistance = viewConfig.minDistance;
  controls.maxDistance = viewConfig.maxDistance;
  controls.autoRotateSpeed = viewConfig.autoRotateSpeed;
  controls.autoRotate = true;
  controls.target.set(0, 0, 0);
  controls.update();
  hudHintEl.textContent = viewConfig.hint;
  for (const material of pointMaterials) updatePointScale(material, renderer, camera);
}

// Builds a galaxy-scene marker, wiring up onSelect only when `label` has a
// matching real system to enter (the Sun always does; other stars do only
// if EXOPLANET_SYSTEMS has real planet data for them - most don't, and stay
// hover-only, same as before).
function createGalaxyMarker(group, { label, position, info }, config) {
  return createPointOfInterest({
    root: poiRoot,
    group,
    position,
    label,
    info,
    onSelect: config ? () => enterStarSystem(config, position) : undefined,
  });
}

function buildGalaxyScene() {
  const { group, materials } = createGalaxy();
  scene.add(group);
  currentGroup = group;
  pointMaterials = materials;

  markers = [
    createGalaxyMarker(group, { label: 'Solar System', position: getSunPosition(), info: SOLAR_SYSTEM_INFO }, SOL_CONFIG),
    // Real, well-known star systems fanned out near the Sun marker - only
    // the ones with a confirmed real planet (see EXOPLANET_SYSTEMS) are
    // clickable; the rest stay hover-only.
    ...getNearbyStars().map((star) => createGalaxyMarker(group, star, EXOPLANET_SYSTEMS[star.label])),
    // A few more real systems scattered further out across the galaxy, so
    // it doesn't read as only the Sun's immediate neighborhood.
    ...getFarSystems().map((star) => createGalaxyMarker(group, star, EXOPLANET_SYSTEMS[star.label])),
  ];

  applyView(GALAXY_VIEW);
  backButtonEl.classList.remove('back-button--visible');
  currentView = 'galaxy';
}

function buildStarSystemScene(config) {
  const { group, materials, orbits: builtOrbits, markers: markerSpecs } = createStarSystem(config);
  scene.add(group);
  currentGroup = group;
  pointMaterials = materials;
  orbits = builtOrbits;

  // Only the Solar System's own Earth opens the detailed globe scene - every
  // other planet (here and in every exoplanet system) stays hover-only,
  // there's nothing built for them to zoom into yet.
  markers = markerSpecs.map(({ label, group: markerGroup, position, info }) => {
    const isEarth = config === SOL_CONFIG && label === 'Earth';
    return createPointOfInterest({
      root: poiRoot,
      group: markerGroup,
      position,
      label,
      info,
      onSelect: isEarth ? () => enterEarthScene(markerGroup, position) : undefined,
    });
  });

  applyView(SYSTEM_VIEW);
  if (config === SOL_CONFIG) hudHintEl.textContent = `${SYSTEM_VIEW.hint} · click Earth to explore it`;
  backButtonEl.textContent = '← back to galaxy';
  backButtonEl.classList.add('back-button--visible');
  currentView = 'system';
}

async function buildEarthScene() {
  const { group, materials, markers: markerSpecs } = await createEarth();
  scene.add(group);
  currentGroup = group;
  pointMaterials = materials;

  markers = markerSpecs.map(({ label, group: markerGroup, position, info }) =>
    createPointOfInterest({ root: poiRoot, group: markerGroup, position, label, info })
  );

  applyView(EARTH_VIEW);
  backButtonEl.textContent = '← back to solar system';
  backButtonEl.classList.add('back-button--visible');
  currentView = 'earth';
}

async function enterStarSystem(config, localPosition) {
  if (transitioning || currentView === 'system') return;
  transitioning = true;
  controls.autoRotate = false;
  controls.enabled = false;

  const markerWorldPos = localPosition.clone().applyMatrix4(currentGroup.matrixWorld);
  startCameraDolly(markerWorldPos, TRANSITION_MS);

  await fadeVeil(true);
  teardownScene();
  buildStarSystemScene(config);
  // The dolly may not have finished its lerp yet (its 650ms window races
  // the veil-fade await) - cancel it outright so a stale in-flight frame
  // can't overwrite the new scene's camera position right after it's set.
  cameraAnim = null;
  await fadeVeil(false);

  controls.enabled = true;
  transitioning = false;
}

// `markerGroup` is Earth's own orbiting holder (not the star system's
// top-level group), since Earth is nested inside a pivot like every other
// planet - its world position has to come from its own group's matrix, not
// the scene root's.
async function enterEarthScene(markerGroup, localPosition) {
  if (transitioning || currentView === 'earth') return;
  transitioning = true;
  controls.autoRotate = false;
  controls.enabled = false;

  const markerWorldPos = localPosition.clone().applyMatrix4(markerGroup.matrixWorld);
  startCameraDolly(markerWorldPos, TRANSITION_MS);

  await fadeVeil(true);
  teardownScene();
  await buildEarthScene();
  cameraAnim = null;
  await fadeVeil(false);

  controls.enabled = true;
  transitioning = false;
}

async function exitToGalaxy() {
  if (transitioning || currentView === 'galaxy') return;
  transitioning = true;
  controls.autoRotate = false;
  controls.enabled = false;

  await fadeVeil(true);
  teardownScene();
  buildGalaxyScene();
  await fadeVeil(false);

  controls.enabled = true;
  transitioning = false;
}

async function exitToStarSystem() {
  if (transitioning || currentView !== 'earth') return;
  transitioning = true;
  controls.autoRotate = false;
  controls.enabled = false;

  await fadeVeil(true);
  teardownScene();
  buildStarSystemScene(SOL_CONFIG);
  await fadeVeil(false);

  controls.enabled = true;
  transitioning = false;
}

backButtonEl.addEventListener('click', () => (currentView === 'earth' ? exitToStarSystem() : exitToGalaxy()));

function init() {
  initCustomCursor();
  buildGalaxyScene();

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (cameraAnim) {
      const t = Math.min(1, (performance.now() - cameraAnim.start) / cameraAnim.duration);
      camera.position.lerpVectors(cameraAnim.fromPos, cameraAnim.toPos, easeInOutCubic(t));
      if (t >= 1) cameraAnim = null;
    }

    controls.update();
    if (orbits.length) updateOrbits(orbits, delta);
    for (const material of pointMaterials) updateWaveTime(material, clock.elapsedTime);
    for (const marker of markers) marker.update(camera, sceneRoot.clientWidth, sceneRoot.clientHeight);
    renderer.render(scene, camera);
  }
  animate();
}

init();
