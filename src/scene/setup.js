import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

function addLights(scene) {
  const ambientLight = new THREE.AmbientLight(0x9bb9ff, 0.65);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xe8f1ff, 0.95);
  directionalLight.position.set(4.2, 6, 3.8);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.set(1024, 1024);
  directionalLight.shadow.bias = -0.0002;
  directionalLight.shadow.camera.near = 0.1;
  directionalLight.shadow.camera.far = 20;
  directionalLight.shadow.camera.left = -5;
  directionalLight.shadow.camera.right = 5;
  directionalLight.shadow.camera.top = 5;
  directionalLight.shadow.camera.bottom = -5;
  scene.add(directionalLight);
}

function addGround(scene) {
  const grid = new THREE.GridHelper(16, 22, 0x496898, 0x22344f);
  grid.position.y = -1.62;
  grid.material.opacity = 0.42;
  grid.material.transparent = true;
  scene.add(grid);

  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x111c2d,
    roughness: 0.9,
    metalness: 0.1,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), floorMaterial);
  floor.rotation.x = -Math.PI * 0.5;
  floor.position.y = -1.64;
  floor.receiveShadow = true;
  scene.add(floor);
}

export function createSceneContext(viewportElement) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f1726);
  scene.fog = new THREE.Fog(0x10192a, 8, 20);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  viewportElement.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
  camera.position.set(3.9, 2.5, 4.9);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 2.5;
  controls.maxDistance = 8;
  controls.minPolarAngle = Math.PI * 0.12;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.target.set(0, 0.2, 0);
  controls.update();

  addLights(scene);
  addGround(scene);

  const resize = () => {
    const width = Math.max(1, viewportElement.clientWidth);
    const height = Math.max(1, viewportElement.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(viewportElement);
  resize();

  return {
    scene,
    camera,
    renderer,
    controls,
    resize,
    dispose: () => {
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
    },
  };
}
