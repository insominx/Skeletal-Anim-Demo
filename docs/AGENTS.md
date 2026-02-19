# Agent Context — Skeletal Animation Explainer

This file is written for AI coding agents picking up this project. Read it before making any changes.

---

## What This Project Is

A single-page interactive web demo for teaching 3D animation fundamentals to students. It is **not** a production animation tool. Every design decision prioritizes **code readability and educational clarity** over feature completeness.

The live app runs at `http://localhost:5173` after `npm install && npm run dev`.

---

## Critical Rules

1. **Do not use `THREE.AnimationMixer`** anywhere. The custom `Channel` + `PlaybackController` pair is the intentional replacement and is the primary teaching artifact.
2. **Do not call `skeletonHelper.update()`** — this method does not exist in Three.js r175 and will throw a `TypeError` every frame, breaking rendering entirely.
3. **Do not add `skinning: true` to `MeshStandardMaterial` for non-skinned meshes** — it is only needed on materials assigned to `SkinnedMesh` instances.
4. **Do not read from `geometry.attributes.position` as rest positions** — rest positions are captured in a separate `Float32Array` snapshot (`vertexRestPositions`, `skinnedRestPositions`) at rig creation time. Always use those snapshots for deformation math.
5. **Keep the codebase small and readable.** The target is under ~1,000 lines of custom code. Avoid adding abstractions that obscure the teaching intent.

---

## Project State (as of initial commit)

### What works
- All three animation modes: Vertex Animation, Bone Animation, Skinning
- Custom keyframe engine with Step / Linear / Smooth interpolation
- Interactive timeline: scrub, add/delete keyframes, select keyframe to edit value
- Weight heatmap visualization with live smoothness slider
- Color-coded joint markers (visible only when weight colors are shown)
- Bone color legend in sidebar matching joint markers
- Educator panel and stats overlay
- Keyboard shortcuts: Space, ←/→, K, Delete
- Pre-populated 3-second looping animation on load

### What is NOT implemented (stretch features)
- Value-vs-time graph view
- Ghost poses / onion skin
- Multi-channel (only `boneRotation` and `bendAmount` channels exist)
- Per-vertex weight inspector
- GLTF import

### Remote Git
- Local repo initialized, initial commit made
- **No remote configured yet** — user needs to provide a GitHub/GitLab URL

---

## File Map (Quick Reference)

| File | Purpose |
|---|---|
| `src/main.js` | App entry, state object, UI wiring, rAF loop |
| `src/style.css` | All CSS — dark theme, CSS Grid, components |
| `src/animation/channel.js` | `Channel` class — the teaching core |
| `src/animation/interpolation.js` | Step / Linear / Smooth math |
| `src/animation/playback.js` | `PlaybackController` |
| `src/scene/setup.js` | Three.js scene, camera, lights, resize |
| `src/scene/rig.js` | Procedural rig, skin weights, joint markers |
| `src/modes/vertexMode.js` | Vertex mode driver + educator text |
| `src/modes/boneMode.js` | Bone mode driver + educator text |
| `src/modes/skinningMode.js` | Skinning mode driver + educator text |
| `src/ui/sidebar.js` | Sidebar DOM component |
| `src/ui/timeline.js` | Timeline DOM component |
| `src/ui/overlays.js` | Educator panel + stats overlay |
| `docs/ARCHITECTURE.md` | Full architecture reference |
| `docs/skeletal-animation-explainer_PRD.md` | Original product requirements |

---

## State Shape (`src/main.js`)

```js
const state = {
  modeId: "skinning",           // "vertex" | "bone" | "skinning"
  visibility: {
    showMesh: true,
    showBones: true,
    showWeights: false,
  },
  selectedChannelId: "boneRotation",   // "boneRotation" | "bendAmount"
  selectedKeyframeIndex: 0,            // null when nothing selected
  weightSmoothness: 0.82,              // 0 = sharp, 1 = smooth
};
```

---

## Animation Channels

Two channels are defined in `main.js`:

| Channel ID | Label | Range | Drives |
|---|---|---|---|
| `boneRotation` | Bone 1 Z-Rotation | −55° to 55° | `rig.applyBoneRotationDegrees()` |
| `bendAmount` | Bend Amount | −1.2 to 1.2 | `rig.applyVertexBend()` |

Both channels share the same 5 keyframes at `t = 0, 0.75, 1.5, 2.25, 3.0` seconds. The playback duration is 3 seconds, looping.

---

## Rig Details

- **Mesh**: `CylinderGeometry(0.34, 0.34, 3.2, 18 radial, 32 height)`, open-ended
- **Bones**: 4-bone chain, root at `y = -1.6`, each bone `1.067` units apart
- **Skin weights**: computed procedurally from rest Y position; `smoothness` parameter blends between hard (one bone) and smooth (adjacent blend)
- **Bone palette** (used for both joint markers and weight heatmap):
  - Bone 1: `#3ba7ff` (blue)
  - Bone 2: `#57d99b` (green)
  - Bone 3: `#ffb05f` (orange)
  - Bone 4: `#f678b0` (pink)

---

## UI Component Contract

All UI components follow this pattern:

```js
const ui = createXxxUI({ container, ...callbacks });
// Later:
ui.setState({ ...newState });
```

Components are **pure renderers** — they write HTML into `container` once on creation, then `setState` updates DOM in place. They never read from `state` directly; they receive it as arguments.

---

## Common Tasks for Future Agents

### Add a new keyframe channel
1. Create a new `Channel` in `main.js` and add it to the `channels` array and `CHANNEL_BY_ID` map.
2. Add a case in `updatePerFrame()` to read the channel and apply it to the rig.
3. Add a corresponding method on the rig if needed.

### Add a new animation mode
1. Create `src/modes/myMode.js` exporting a metadata object and a `runMyMode(rig, params)` function.
2. Add it to the `MODES` array in `main.js`.
3. Add a case in `updatePerFrame()`.
4. Add educator panel text in the metadata object.

### Change the rig geometry
- Edit `createEducationalRig` in `src/scene/rig.js`.
- Capture new rest positions immediately after geometry creation.
- Recompute skin weights by calling `setWeightSmoothness` after geometry changes.

### Add a stretch feature (graph view, ghost poses, etc.)
- See `docs/ARCHITECTURE.md` → Stretch Features section.
- Keep new files under `src/ui/` for UI additions or `src/scene/` for 3D additions.
- Do not modify `Channel.evaluate()` or `interpolateValues()` without updating the educator panel text to match.

---

## Build and Verification

```bash
npm run build          # must exit 0 with no errors (chunk size warning is expected)
```

For runtime verification, use headless Chrome CDP to capture console errors:

```bash
# Start dev server first: npm run dev
node --input-type=module -e "
import { spawn } from 'node:child_process';
// ... CDP script to navigate and capture console errors
"
```

A clean run should produce **0 error/warning entries** in the browser console.
