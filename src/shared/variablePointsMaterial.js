import * as THREE from 'three';

const WAVE_COUNT = 4;
const WAVE_CYCLE = 12.0; // seconds for one line-sweep to cross a spherical cloud
const WAVE_BAND = 0.055; // thickness of the sweeping line (small on purpose)

// Standard "variable size point sprite" shader: THREE.PointsMaterial only
// exposes a single uniform size for the whole cloud, but per-cloud layers
// here need each point's size AND alpha to vary individually (denser/
// brighter toward the galactic core, sparser/dimmer in the halo), plus an
// optional traveling scan-line for spherical clouds (unused by the galaxy
// disk/arms, which aren't sphere-shaped, but still available for e.g. the
// halo shell).
//
// `scale` mirrors what three.js computes internally for size-attenuated
// points (canvasHeight / (2 * tan(fov/2))) so `pointSize` attribute values
// behave like ordinary world-space sizes, not magic pixel numbers.
const VERTEX_SHADER = /* glsl */ `
  attribute float pointSize;
  attribute float pointAlpha;
  uniform float scale;
  uniform float fadeBackface;
  uniform float waveStrength;
  uniform float uTime;
  uniform vec3 waveAxes[${WAVE_COUNT}];
  varying vec3 vColor;
  varying float vAlpha;

  const float WAVE_COUNT = ${WAVE_COUNT.toFixed(1)};
  const float WAVE_CYCLE = ${WAVE_CYCLE.toFixed(2)};
  const float WAVE_BAND = ${WAVE_BAND.toFixed(3)};

  void main() {
    vec3 normal = normalize(position);

    // Each wave is a plane slicing through a unit sphere, swept along a
    // fixed axis: the intersection is a straight line (great circle), not a
    // ring expanding from a point. Overshooting past [-1, 1] lets it
    // enter/exit cleanly at the sphere's edge instead of popping in and out.
    // Only meaningful for a spherical point cloud (assumes position also
    // doubles as the surface normal) - leave waveStrength at 0 otherwise.
    float wave = 0.0;
    if (waveStrength > 0.0) {
      for (int i = 0; i < ${WAVE_COUNT}; i++) {
        float proj = dot(normal, waveAxes[i]);
        float phase = mod(uTime + float(i) * (WAVE_CYCLE / WAVE_COUNT), WAVE_CYCLE);
        float front = mix(-1.15, 1.15, phase / WAVE_CYCLE);
        float band = smoothstep(WAVE_BAND, 0.0, abs(proj - front));
        wave += band;
      }
      wave = min(wave, 1.0) * waveStrength;
    }

    vec3 displaced = position + normal * (wave * 0.008);

    // Points don't write depth (needed for additive glow blending), so
    // without this the far side of a spherical cloud would blend right
    // through the near side. Fade points out as they turn away from the
    // camera - sphere-only assumption: local position doubles as the
    // surface normal. Leave fadeBackface off for non-spherical clouds.
    float fade = 1.0;
    if (fadeBackface > 0.5) {
      vec3 worldNormal = normalize(mat3(modelMatrix) * normal);
      vec3 worldPosition = (modelMatrix * vec4(displaced, 1.0)).xyz;
      vec3 viewDir = normalize(cameraPosition - worldPosition);
      float facing = dot(worldNormal, viewDir);
      fade = smoothstep(-0.05, 0.35, facing);
    }

    vColor = mix(color, vec3(1.0), wave * 0.45);
    vAlpha = clamp(pointAlpha * fade + wave * 0.28, 0.0, 1.0);

    vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
    gl_PointSize = pointSize * (1.0 + wave * 0.5) * (scale / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D map;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec4 tex = texture2D(map, gl_PointCoord);
    gl_FragColor = vec4(vColor, tex.a * vAlpha);
  }
`;

export function createVariablePointsMaterial(
  spriteTexture,
  { fadeBackface = false, waves = false, waveAxes = [] } = {}
) {
  const axes = Array.from({ length: WAVE_COUNT }, (_, i) => waveAxes[i] || new THREE.Vector3(0, 1, 0));

  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: spriteTexture },
      scale: { value: 300 },
      fadeBackface: { value: fadeBackface ? 1 : 0 },
      waveStrength: { value: waves ? 1 : 0 },
      uTime: { value: 0 },
      waveAxes: { value: axes },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

export function updatePointScale(material, renderer, camera) {
  const height = renderer.domElement.clientHeight;
  const fovRad = THREE.MathUtils.degToRad(camera.fov);
  material.uniforms.scale.value = height * 0.5 / Math.tan(fovRad * 0.5);
}

export function updateWaveTime(material, elapsedSeconds) {
  material.uniforms.uTime.value = elapsedSeconds;
}
