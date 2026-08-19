import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createGalaxy, getSunPosition } from './galaxy/createGalaxy.js';
import { createPointOfInterest } from './galaxy/pointOfInterest.js';
import { createSolarSystem, updateOrbits } from './solar-system/createSolarSystem.js';
import { updatePointScale } from './shared/variablePointsMaterial.js';
import { disposeGroup } from './shared/disposeGroup.js';

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
  hint: 'drag to rotate · scroll to zoom · click the marker to enter the solar system',
};
const SOLAR_SYSTEM_VIEW = {
  position: new THREE.Vector3(0, 2.8, 5.4),
  minDistance: 0.25,
  maxDistance: 8,
  autoRotateSpeed: 0.06,
  hint: 'drag to rotate · scroll to zoom',
};

const TRANSITION_MS = 650;

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

function buildGalaxyScene() {
  const { group, materials } = createGalaxy();
  scene.add(group);
  currentGroup = group;
  pointMaterials = materials;

  markers = [
    createPointOfInterest({
      root: poiRoot,
      group,
      position: getSunPosition(),
      label: 'Solar System',
      onSelect: enterSolarSystem,
    }),
  ];

  applyView(GALAXY_VIEW);
  backButtonEl.classList.remove('back-button--visible');
  currentView = 'galaxy';
}

function buildSolarSystemScene() {
  const { group, materials, orbits: builtOrbits, planetMarkers } = createSolarSystem();
  scene.add(group);
  currentGroup = group;
  pointMaterials = materials;
  orbits = builtOrbits;

  markers = planetMarkers.map(({ label, group: markerGroup, position }) =>
    createPointOfInterest({ root: poiRoot, group: markerGroup, position, label })
  );

  applyView(SOLAR_SYSTEM_VIEW);
  backButtonEl.classList.add('back-button--visible');
  currentView = 'solar-system';
}

async function enterSolarSystem() {
  if (transitioning || currentView === 'solar-system') return;
  transitioning = true;
  controls.autoRotate = false;
  controls.enabled = false;

  const markerWorldPos = getSunPosition().applyMatrix4(currentGroup.matrixWorld);
  startCameraDolly(markerWorldPos, TRANSITION_MS);

  await fadeVeil(true);
  teardownScene();
  buildSolarSystemScene();
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

backButtonEl.addEventListener('click', exitToGalaxy);

function init() {
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
    for (const marker of markers) marker.update(camera, sceneRoot.clientWidth, sceneRoot.clientHeight);
    renderer.render(scene, camera);
  }
  animate();
}

init();
