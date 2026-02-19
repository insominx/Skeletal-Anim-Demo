import * as THREE from "three";

const GHOST_COLOR = 0x8899aa;
const GHOST_OPACITY = 0.22;

const _ghostMaterial = new THREE.LineBasicMaterial({
  color: GHOST_COLOR,
  transparent: true,
  opacity: GHOST_OPACITY,
  depthTest: false,
  depthWrite: false,
});

function buildBonePositions(bones) {
  const positions = [];
  for (let i = 0; i < bones.length - 1; i += 1) {
    const parent = bones[i];
    const child = bones[i + 1];

    const parentWorld = new THREE.Vector3();
    const childWorld = new THREE.Vector3();
    parent.getWorldPosition(parentWorld);
    child.getWorldPosition(childWorld);

    positions.push(parentWorld.x, parentWorld.y, parentWorld.z);
    positions.push(childWorld.x, childWorld.y, childWorld.z);
  }
  return positions;
}

function createGhostSkeleton(bones) {
  const positions = buildBonePositions(bones);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const lines = new THREE.LineSegments(geometry, _ghostMaterial);
  lines.renderOrder = 5;
  return lines;
}

function updateGhostSkeleton(lines, bones) {
  const positions = buildBonePositions(bones);
  const attr = lines.geometry.getAttribute("position");
  for (let i = 0; i < positions.length; i += 1) {
    attr.array[i] = positions[i];
  }
  attr.needsUpdate = true;
}

export function createGhostManager(scene) {
  const ghostGroup = new THREE.Group();
  ghostGroup.name = "GhostPoses";
  ghostGroup.visible = false;
  scene.add(ghostGroup);

  let _ghostLines = [];

  function _ensureGhostCount(count, bones) {
    while (_ghostLines.length < count) {
      const lines = createGhostSkeleton(bones);
      ghostGroup.add(lines);
      _ghostLines.push(lines);
    }
    while (_ghostLines.length > count) {
      const removed = _ghostLines.pop();
      ghostGroup.remove(removed);
      removed.geometry.dispose();
    }
  }

  function updateGhosts(channel, rig) {
    const keyframes = channel.keyframes;
    _ensureGhostCount(keyframes.length, rig.bones);

    const savedRotations = rig.bones.map((bone) => bone.rotation.z);

    for (let ki = 0; ki < keyframes.length; ki += 1) {
      const kf = keyframes[ki];
      const value = channel.evaluate(kf.t);

      rig.applyBoneRotationDegrees(value);

      rig.bones.forEach((bone) => bone.updateMatrixWorld(true));

      updateGhostSkeleton(_ghostLines[ki], rig.bones);
    }

    rig.bones.forEach((bone, i) => {
      bone.rotation.z = savedRotations[i];
    });
    rig.bones.forEach((bone) => bone.updateMatrixWorld(true));
  }

  function setVisible(visible) {
    ghostGroup.visible = Boolean(visible);
  }

  return { ghostGroup, updateGhosts, setVisible };
}
