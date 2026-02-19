# Architecture

This document describes the code structure, data flow, and key design decisions for the Skeletal Animation Explainer.

---

## Design Principles

1. **Custom code only where it IS the lesson.** The keyframe `evaluate(t)` function is the primary teaching artifact — it is hand-written and intentionally readable. Everything else delegates to Three.js built-ins.
2. **Three.js for all 3D heavy lifting.** `SkinnedMesh`, `Skeleton`, `Bone`, `SkeletonHelper`, `OrbitControls`, and the GPU skinning pipeline are used as-is.
3. **Custom HTML/CSS for UI chrome.** The layout, sidebar, timeline, and overlays are plain DOM — no UI framework — so students can read and modify them without learning a component system.
4. **Single shared state object in `main.js`.** All UI and rig state lives in one flat `state` object. UI components are pure render functions that receive state and emit events upward.
5. **No `THREE.AnimationMixer`.** The custom `Channel` + `PlaybackController` pair is the explicit replacement, making the interpolation math visible.

---

## Module Map

```
src/
├── main.js                  Entry point, state, event wiring, rAF loop
├── style.css                All styles (CSS Grid layout + component styles)
│
├── animation/
│   ├── channel.js           Channel class: keyframe store + evaluate(t)
│   ├── interpolation.js     Pure math: Step / Linear / Smooth
│   └── playback.js          PlaybackController: time, play/pause, loop
│
├── scene/
│   ├── setup.js             Renderer, camera, lights, ground, resize
│   └── rig.js               Procedural rig: mesh, bones, weights, markers
│
├── modes/
│   ├── vertexMode.js        Vertex animation driver + educator metadata
│   ├── boneMode.js          Bone animation driver + educator metadata
│   └── skinningMode.js      Skinning mode driver + educator metadata
│
└── ui/
    ├── sidebar.js           Sidebar DOM: mode selector, toggles, KF editor
    ├── timeline.js          Timeline DOM: transport, scrub, markers
    ├── curveGraph.js        Canvas curve graph + interactive keyframe/tangent drag
    └── overlays.js          Educator panel + stats overlay
```

---

## Data Flow

```
PlaybackController.tick(delta)
        │
        ▼
  currentTime
        │
        ├──► Channel("boneRotation").evaluate(t)  ──► runBoneMode / runSkinningMode
        │                                                    │
        │                                                    ▼
        │                                          rig.applyBoneRotationDegrees(deg)
        │                                          → bone[i].rotation.z = ...
        │
        └──► Channel("bendAmount").evaluate(t)  ──► runVertexMode
                                                         │
                                                         ▼
                                               rig.applyVertexBend(amount)
                                               → geometry.attributes.position[i] = ...
                                               → needsUpdate = true
```

UI events flow upward via callbacks:

```
User interaction (click, drag, input)
        │
        ▼
  UI component (sidebar / timeline)
        │  fires callback (onModeChange, onScrub, onKeyframeValueChange, ...)
        ▼
  main.js handler
        │  mutates state{}
        ▼
  refreshStaticUI()
        │  calls sidebar.setState() + timeline.setKeyframeState()
        ▼
  UI re-renders from new state
```

The animation loop (`animate()`) calls `timelineUI.setPlaybackState()` and `overlays.setStats()` every frame to keep the playhead and stats live.

---

## Key Classes and Functions

### `Channel` (`src/animation/channel.js`)

The core teaching artifact. Stores sorted `{ t, v, easeOut, easeIn }` keyframes and evaluates them:

```js
evaluate(time) {
  // 1. Clamp to first/last keyframe
  // 2. Find bounding pair (left, right)
  // 3. Compute u = (t - left.t) / (right.t - left.t)
  // 4. Delegate to interpolateValues(left.v, right.v, u, mode, left.easeOut, right.easeIn)
}
```

Supports add / remove / edit keyframes and per-keyframe tangents (`setKeyframeTangents`). Keeps array sorted by time. The `easeOut` and `easeIn` fields are slope values used as cubic Hermite tangent weights in Smooth mode.

### `interpolateValues` (`src/animation/interpolation.js`)

Three modes:
- **Step** — returns `v0` (no blending)
- **Linear** — `v0 + u * (v1 - v0)`
- **Smooth** — cubic Hermite spline via `cubicHermite(v0, m0, v1, m1, u)` where `m0`/`m1` are the `easeOut`/`easeIn` tangent slopes from the bounding keyframes

### `PlaybackController` (`src/animation/playback.js`)

Wraps current time with positive modulo looping. `tick(delta)` advances time only when `isPlaying`. `setTime(t)` and `step(delta)` are used for scrubbing.

### `createEducationalRig` (`src/scene/rig.js`)

Returns a rig object with:
- `vertexMesh` — plain `Mesh` for vertex animation mode
- `skinnedMesh` — `SkinnedMesh` for skinning mode
- `skeletonHelper` — `SkeletonHelper` for bone visualization
- `bones[]` — 4-bone chain
- `boneMarkers[]` — colored spheres at each joint (same palette as weight heatmap)
- `boneLegend[]` — `{ label, colorHex }` array for sidebar legend
- `setModeVisibility({ mode, showMesh, showBones, showWeights })` — controls all visibility
- `setWeightSmoothness(0–1)` — recomputes `skinIndex` / `skinWeight` attributes live
- `setWeightVisualization(bool)` — swaps between standard and vertex-color material
- `applyBoneRotationDegrees(deg)` — drives bone chain with falloff per bone
- `applyVertexBend(amount)` — rotates vertices around base using trigonometry

### Skin Weight Calculation

Weights are computed procedurally from rest Y position:

```
normalized = (y + halfHeight) / height          // 0..1 along tube
scaled = normalized * (boneCount - 1)           // 0..3 for 4 bones
lower = floor(scaled), upper = lower + 1
blend = scaled - lower

// smoothness=0 → hard assignment (one bone per vertex)
// smoothness=1 → smooth blend between adjacent bones
upperWeight = lerp(hardUpper, blend, smoothness)
lowerWeight = 1 - upperWeight
```

### Mode Drivers (`src/modes/`)

Each mode file exports:
- A frozen metadata object (`concept`, `description`, `guidedStep`) consumed by the educator panel
- A `run*Mode(rig, params)` function called each frame

### Curve Graph (`src/ui/curveGraph.js`)

A double-buffered canvas renderer embedded inside the timeline track. A static layer (axis hints, sampled curve path, keyframe dots, Bézier tangent handles) is cached and only redrawn when the data signature changes. A dynamic layer composites the static image and draws a moving playhead-value dot each frame.

Interactive features:
- **Keyframe drag** — pointer-down on a keyframe dot captures the pointer; vertical movement maps to value changes via `layout.yToValue(y)` and fires `onKeyframeValueDrag`.
- **Tangent drag** — pointer-down on a Bézier handle square captures the pointer; vertical movement computes a new slope and fires `onKeyframeTangentDrag`.
- **Hover feedback** — cursor changes to `ns-resize` over handles and `pointer` over keyframe dots.

The canvas uses `pointer-events: auto` and sits at `z-index: 0`. The keyframe marker layer above it uses `pointer-events: none` (with `pointer-events: auto` on individual markers) so that canvas hit-testing works correctly.

### UI Components

All UI components follow the same pattern:
1. `createXxxUI({ container, ...callbacks })` — writes HTML into `container`, wires events, returns a controller object
2. Controller exposes `setState(...)` / `setXxxState(...)` — pure re-render from data, no internal state mutation

---

## CSS Grid Layout

```
.app-grid {
  grid-template-columns: minmax(0, 1fr) 350px;
  grid-template-rows: minmax(0, 1fr) 230px;
  grid-template-areas:
    "viewport sidebar"
    "timeline sidebar";
}
```

The Three.js canvas is appended directly into `.viewport-panel` by the renderer. A `ResizeObserver` keeps the renderer and camera aspect ratio in sync with the viewport element size.

---

## Known Constraints and Gotchas

- **`SkeletonHelper.update()` does not exist** in Three.js r175. The helper auto-updates when the renderer draws the scene. Calling `.update()` manually throws a `TypeError`. Do not add it back.
- **`skinning: true`** must be set on materials used with `SkinnedMesh` in older Three.js versions. It is set explicitly on `skinnedDefaultMaterial` and `skinnedWeightMaterial`.
- **Vertex rest positions** are captured as a `Float32Array` snapshot at rig creation time. The vertex bend function always reads from rest positions, not the current deformed state, to avoid drift.
- **Joint color markers** are children of their respective `Bone` objects, so they move with the skeleton automatically. They use `depthTest: false` and `renderOrder: 10` to stay visible through the mesh.
- **Weight colors** are baked into a `color` attribute on the geometry when `setWeightSmoothness` is called. The vertex-color material reads this attribute. Toggling weight visualization swaps the material reference, not the geometry.

---

## Implemented Stretch Features

- **Value-vs-time curve graph** — real-time canvas graph in the timeline with interactive keyframe and tangent editing
- **Per-keyframe tangents** — `easeOut`/`easeIn` slopes stored on each keyframe, editable via Bézier handle drag on the graph

## Remaining Stretch Ideas

- Ghost poses / onion skin at keyframe times
- Multi-channel (additional bone rotation channels)
- Per-vertex weight inspector (click vertex to see breakdown)
- GLTF model import
