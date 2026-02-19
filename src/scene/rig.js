import * as THREE from "three";

const BONE_PALETTE = [
  new THREE.Color(0x3ba7ff),
  new THREE.Color(0x57d99b),
  new THREE.Color(0xffb05f),
  new THREE.Color(0xf678b0),
  new THREE.Color(0xd6d665),
];

function ensureSkinAttributes(geometry) {
  const vertexCount = geometry.attributes.position.count;

  let skinIndex = geometry.getAttribute("skinIndex");
  if (!skinIndex) {
    skinIndex = new THREE.Uint16BufferAttribute(new Uint16Array(vertexCount * 4), 4);
    geometry.setAttribute("skinIndex", skinIndex);
  }

  let skinWeight = geometry.getAttribute("skinWeight");
  if (!skinWeight) {
    skinWeight = new THREE.Float32BufferAttribute(new Float32Array(vertexCount * 4), 4);
    geometry.setAttribute("skinWeight", skinWeight);
  }

  return { skinIndex, skinWeight };
}

function updateSkinWeightsFromRest({ geometry, restPositions, boneCount, height, smoothness }) {
  const maxBoneIndex = boneCount - 1;
  const halfHeight = height * 0.5;
  const clampedSmoothness = THREE.MathUtils.clamp(Number(smoothness), 0, 1);

  const { skinIndex, skinWeight } = ensureSkinAttributes(geometry);
  const skinIndexArray = skinIndex.array;
  const skinWeightArray = skinWeight.array;
  const vertexCount = geometry.attributes.position.count;

  for (let i = 0; i < vertexCount; i += 1) {
    const i3 = i * 3;
    const i4 = i * 4;

    const y = restPositions[i3 + 1];
    const normalized = THREE.MathUtils.clamp((y + halfHeight) / height, 0, 1);
    const scaled = normalized * maxBoneIndex;

    const lower = Math.floor(scaled);
    const upper = Math.min(lower + 1, maxBoneIndex);
    const blend = scaled - lower;

    const hardUpper = blend >= 0.5 ? 1 : 0;

    let lowerWeight = 1;
    let upperWeight = 0;

    if (lower !== upper) {
      upperWeight = THREE.MathUtils.lerp(hardUpper, blend, clampedSmoothness);
      lowerWeight = 1 - upperWeight;
    }

    skinIndexArray[i4] = lower;
    skinIndexArray[i4 + 1] = upper;
    skinIndexArray[i4 + 2] = 0;
    skinIndexArray[i4 + 3] = 0;

    skinWeightArray[i4] = lowerWeight;
    skinWeightArray[i4 + 1] = upperWeight;
    skinWeightArray[i4 + 2] = 0;
    skinWeightArray[i4 + 3] = 0;
  }

  skinIndex.needsUpdate = true;
  skinWeight.needsUpdate = true;
}

function applyWeightColors(geometry) {
  const skinIndex = geometry.getAttribute("skinIndex");
  const skinWeight = geometry.getAttribute("skinWeight");

  if (!skinIndex || !skinWeight) {
    return;
  }

  const vertexCount = geometry.attributes.position.count;
  let colorAttribute = geometry.getAttribute("color");

  if (!colorAttribute) {
    colorAttribute = new THREE.Float32BufferAttribute(new Float32Array(vertexCount * 3), 3);
    geometry.setAttribute("color", colorAttribute);
  }

  const colors = colorAttribute.array;
  const indices = skinIndex.array;
  const weights = skinWeight.array;

  for (let i = 0; i < vertexCount; i += 1) {
    const i3 = i * 3;
    const i4 = i * 4;

    let r = 0;
    let g = 0;
    let b = 0;

    for (let j = 0; j < 4; j += 1) {
      const weight = weights[i4 + j];
      if (weight <= 0) {
        continue;
      }

      const paletteColor = BONE_PALETTE[indices[i4 + j] % BONE_PALETTE.length];
      r += paletteColor.r * weight;
      g += paletteColor.g * weight;
      b += paletteColor.b * weight;
    }

    colors[i3] = r;
    colors[i3 + 1] = g;
    colors[i3 + 2] = b;
  }

  colorAttribute.needsUpdate = true;
}

function createSkeleton({ skinnedMesh, boneCount, height }) {
  const bones = [];
  const halfHeight = height * 0.5;
  const segmentLength = height / (boneCount - 1);

  const rootBone = new THREE.Bone();
  rootBone.position.y = -halfHeight;
  rootBone.name = "Bone_0";
  bones.push(rootBone);

  let parent = rootBone;
  for (let i = 1; i < boneCount; i += 1) {
    const bone = new THREE.Bone();
    bone.position.y = segmentLength;
    bone.name = `Bone_${i}`;
    parent.add(bone);
    bones.push(bone);
    parent = bone;
  }

  skinnedMesh.add(rootBone);
  const skeleton = new THREE.Skeleton(bones);
  skinnedMesh.bind(skeleton);

  return bones;
}

function createBoneMarkers(bones) {
  return bones.map((bone, index) => {
    const color = BONE_PALETTE[index % BONE_PALETTE.length];
    const markerMaterial = new THREE.MeshBasicMaterial({
      color,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      opacity: 0.95,
    });

    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 14), markerMaterial);
    marker.renderOrder = 10;
    marker.name = `JointMarker_${index}`;
    bone.add(marker);

    return marker;
  });
}

function applyVertexBendToGeometry({ geometry, restPositions, bendAmount, height }) {
  const positions = geometry.attributes.position.array;
  const halfHeight = height * 0.5;
  const bend = Number(bendAmount) || 0;

  for (let i = 0; i < geometry.attributes.position.count; i += 1) {
    const i3 = i * 3;

    const xRest = restPositions[i3];
    const yRest = restPositions[i3 + 1];
    const zRest = restPositions[i3 + 2];

    const fromBase = yRest + halfHeight;
    const u = fromBase / height;
    const theta = bend * u * 1.25;

    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);

    const bentX = xRest * cosTheta - fromBase * sinTheta;
    const bentY = xRest * sinTheta + fromBase * cosTheta - halfHeight;

    positions[i3] = bentX;
    positions[i3 + 1] = bentY;
    positions[i3 + 2] = zRest;
  }

  geometry.attributes.position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.attributes.normal.needsUpdate = true;
}

export function createEducationalRig(scene) {
  const height = 3.2;
  const radius = 0.34;
  const radialSegments = 18;
  const heightSegments = 32;
  const boneCount = 4;

  const sourceGeometry = new THREE.CylinderGeometry(radius, radius, height, radialSegments, heightSegments, true);
  const vertexGeometry = sourceGeometry.clone();
  const skinnedGeometry = sourceGeometry.clone();

  const vertexRestPositions = Float32Array.from(vertexGeometry.attributes.position.array);
  const skinnedRestPositions = Float32Array.from(skinnedGeometry.attributes.position.array);

  const standardMaterialOptions = {
    color: 0x8ca3df,
    roughness: 0.45,
    metalness: 0.08,
    side: THREE.DoubleSide,
  };

  const vertexDefaultMaterial = new THREE.MeshStandardMaterial(standardMaterialOptions);
  const skinnedDefaultMaterial = new THREE.MeshStandardMaterial(standardMaterialOptions);
  skinnedDefaultMaterial.skinning = true;

  const vertexWeightMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.35,
    metalness: 0.04,
    side: THREE.DoubleSide,
    emissive: new THREE.Color(0x0d1623),
    emissiveIntensity: 0.3,
  });

  const skinnedWeightMaterial = vertexWeightMaterial.clone();
  skinnedWeightMaterial.skinning = true;

  const vertexMesh = new THREE.Mesh(vertexGeometry, vertexDefaultMaterial);
  vertexMesh.castShadow = true;
  vertexMesh.receiveShadow = true;

  const skinnedMesh = new THREE.SkinnedMesh(skinnedGeometry, skinnedDefaultMaterial);
  skinnedMesh.castShadow = true;
  skinnedMesh.receiveShadow = true;

  const bones = createSkeleton({ skinnedMesh, boneCount, height });
  const boneMarkers = createBoneMarkers(bones);

  const skeletonHelper = new THREE.SkeletonHelper(skinnedMesh);
  skeletonHelper.material.color.setHex(0x6de4ff);
  skeletonHelper.material.transparent = true;
  skeletonHelper.material.opacity = 0.95;

  const rigGroup = new THREE.Group();
  rigGroup.name = "EducationalRig";
  rigGroup.add(vertexMesh);
  rigGroup.add(skinnedMesh);
  rigGroup.add(skeletonHelper);
  scene.add(rigGroup);

  const setWeightSmoothness = (smoothness) => {
    updateSkinWeightsFromRest({
      geometry: skinnedGeometry,
      restPositions: skinnedRestPositions,
      boneCount,
      height,
      smoothness,
    });

    updateSkinWeightsFromRest({
      geometry: vertexGeometry,
      restPositions: vertexRestPositions,
      boneCount,
      height,
      smoothness,
    });

    applyWeightColors(skinnedGeometry);
    applyWeightColors(vertexGeometry);
  };

  setWeightSmoothness(0.82);

  const setWeightVisualization = (enabled) => {
    const useWeightMaterial = Boolean(enabled);
    vertexMesh.material = useWeightMaterial ? vertexWeightMaterial : vertexDefaultMaterial;
    skinnedMesh.material = useWeightMaterial ? skinnedWeightMaterial : skinnedDefaultMaterial;
  };

  const setModeVisibility = ({ mode, showMesh, showBones, showWeights }) => {
    const shouldShowWeightMarkers =
      Boolean(showWeights) &&
      ((mode === "vertex" && Boolean(showMesh)) || (mode === "skinning" && Boolean(showMesh)));

    if (mode === "vertex") {
      vertexMesh.visible = Boolean(showMesh);
      skinnedMesh.visible = false;
      skeletonHelper.visible = Boolean(showBones);
      boneMarkers.forEach((marker) => {
        marker.visible = shouldShowWeightMarkers && Boolean(showBones);
      });
      return;
    }

    if (mode === "bone") {
      vertexMesh.visible = false;
      skinnedMesh.visible = false;
      skeletonHelper.visible = true;
      boneMarkers.forEach((marker) => {
        marker.visible = false;
      });
      return;
    }

    vertexMesh.visible = false;
    skinnedMesh.visible = Boolean(showMesh);
    skeletonHelper.visible = Boolean(showBones);
    boneMarkers.forEach((marker) => {
      marker.visible = shouldShowWeightMarkers && Boolean(showBones);
    });
  };

  const applyBoneRotationDegrees = (degrees) => {
    const radians = THREE.MathUtils.degToRad(Number(degrees) || 0);

    bones.forEach((bone, index) => {
      if (index === 0) {
        bone.rotation.z = radians * 0.14;
        return;
      }

      const falloff = 1 - index / bones.length;
      bone.rotation.z = radians * (0.2 + 0.8 * falloff);
    });
  };

  const applyVertexBend = (bendAmount) => {
    applyVertexBendToGeometry({
      geometry: vertexGeometry,
      restPositions: vertexRestPositions,
      bendAmount,
      height,
    });
  };

  const vertexCount = vertexGeometry.attributes.position.count;

  return {
    group: rigGroup,
    vertexMesh,
    skinnedMesh,
    skeletonHelper,
    bones,
    boneCount,
    vertexCount,
    boneLegend: bones.map((bone, index) => ({
      id: bone.name,
      label: `Bone ${index + 1}`,
      colorHex: `#${BONE_PALETTE[index % BONE_PALETTE.length].getHexString()}`,
    })),
    setModeVisibility,
    setWeightVisualization,
    setWeightSmoothness,
    applyBoneRotationDegrees,
    applyVertexBend,
    getWorkTextForMode: (mode) => {
      if (mode === "vertex") {
        return `${vertexCount} vertices animating`;
      }

      return `${boneCount} bones animating`;
    },
  };
}
