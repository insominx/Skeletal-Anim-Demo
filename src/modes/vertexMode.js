export const VERTEX_MODE = Object.freeze({
  id: "vertex",
  label: "Vertex Animation",
  concept: "Vertex Animation (Brute Force)",
  description: "Every frame updates many vertex positions directly. It's flexible but expensive and harder to author for complex characters.",
  guidedStep: "Scrub the timeline and notice how this mode edits raw geometry instead of a skeleton.",
});

export function runVertexMode(rig, { bendAmount }) {
  rig.applyVertexBend(bendAmount);
}
