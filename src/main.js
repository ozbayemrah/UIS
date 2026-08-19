import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createGalaxy } from './galaxy/createGalaxy.js';
import { updatePointScale } from './galaxy/variablePointsMaterial.js';

const galaxyRoot = document.getElementById('galaxy-root');

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  45,
  galaxyRoot.clientWidth / galaxyRoot.clientHeight,
  0.05,
  200
);
camera.position.set(0, 1.05, 2.35);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(galaxyRoot.clientWidth, galaxyRoot.clientHeight);
renderer.setClearColor(0x000000, 1);
galaxyRoot.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = 0.35;
controls.maxDistance = 8;
controls.rotateSpeed = 0.45;
controls.zoomSpeed = 0.6;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.15;

let pointMaterials = [];

function onResize() {
  const width = galaxyRoot.clientWidth;
  const height = galaxyRoot.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  for (const material of pointMaterials) updatePointScale(material, renderer, camera);
}
window.addEventListener('resize', onResize);

function init() {
  const { group: galaxyGroup, materials } = createGalaxy();
  scene.add(galaxyGroup);
  pointMaterials = materials;
  for (const material of pointMaterials) updatePointScale(material, renderer, camera);

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}

init();
