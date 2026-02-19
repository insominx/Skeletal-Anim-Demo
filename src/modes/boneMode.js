export const BONE_MODE = Object.freeze({
  id: "bone",
  label: "Bone Animation",
  concept: "Bone Animation (Skeleton Only)",
  description: "Bones are transforms in a hierarchy. We animate a few transforms, then reuse that motion for different meshes.",
  guidedStep: "Turn on play and compare how few controls are needed: only bone transforms change over time.",
});

export function runBoneMode(rig, { rotationDegrees }) {
  rig.applyBoneRotationDegrees(rotationDegrees);
}
