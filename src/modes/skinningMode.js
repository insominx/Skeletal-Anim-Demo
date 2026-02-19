export const SKINNING_MODE = Object.freeze({
  id: "skinning",
  label: "Skinning",
  concept: "Skinning (Bones + Mesh)",
  description: "The same animated bones now deform a skinned mesh using per-vertex bone weights.",
  guidedStep: "Toggle Show Weights and move the smoothness slider to see sharp vs blended deformation.",
});

export function runSkinningMode(rig, { rotationDegrees }) {
  rig.applyBoneRotationDegrees(rotationDegrees);
}
