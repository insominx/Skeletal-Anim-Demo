# Skeletal Animation Explainer

An interactive single-page classroom demo built with Three.js that teaches the fundamentals of 3D animation: keyframes, interpolation, vertex animation, and skeletal skinning.

Designed for high school / university students. The codebase is intentionally small and readable — the custom keyframe evaluator is the primary teaching artifact.

## Quick Start

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build      # production build → dist/
npm run preview    # preview production build locally
```

## Tech Stack

| Layer | Choice |
|---|---|
| Bundler | Vite (ES modules) |
| 3D engine | Three.js r175 |
| Skinning | `THREE.SkinnedMesh` + `THREE.Skeleton` (GPU) |
| Skeleton viz | `THREE.SkeletonHelper` |
| Camera | `OrbitControls` (restricted pan/zoom) |
| UI controls | Custom HTML/CSS (no lil-gui in final UI) |
| Styling | CSS Grid dark-mode, glassmorphism overlays |

## Features

- **Three animation modes** showing the same conceptual motion through different lenses:
  - **Vertex Animation** — direct `BufferGeometry.position` edits per frame
  - **Bone Animation** — skeleton-only view, bone transforms driven by keyframes
  - **Skinning** — `SkinnedMesh` deformed by bone transforms + skin weights
- **Custom mini keyframe engine** — hand-written `Channel.evaluate(t)` with Step / Linear / Smooth (smoothstep) interpolation. No `THREE.AnimationMixer`.
- **Interactive timeline** — draggable playhead, clickable diamond keyframe markers, add/delete keys
- **Keyframe editor** — select a keyframe to edit its value and interpolation mode
- **Weight visualization** — heatmap overlay showing per-vertex bone influence
- **Weight smoothness slider** — live recompute of skin weights from sharp (one bone per vertex) to smooth (blended), demonstrating skinning artifacts
- **Bone color legend** — color-coded joint markers and sidebar legend matching the weight heatmap (visible only when weight colors are shown)
- **Educator panel** — glassmorphism overlay with concept name, explanation, and guided step per mode
- **Stats overlay** — FPS, current mode, vertex/bone work count
- **Pre-populated animation** — 3-second looping waving motion with 5 keyframes on load

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `Space` | Play / Pause |
| `←` / `→` | Scrub ±0.05 s |
| `K` | Add keyframe at current time on selected channel |
| `Delete` | Remove selected keyframe |

## Suggested Teaching Flow

1. Load the app — it starts in **Skinning** mode with a live looping animation.
2. Scrub the timeline and click keyframe markers to select and edit values.
3. Switch **Interpolation** between Step / Linear / Smooth and observe the difference.
4. Switch to **Bone Animation** — same motion, skeleton only. Point out how few transforms drive the whole motion.
5. Switch to **Vertex Animation** — same motion, but every vertex position is recomputed each frame.
6. Back in **Skinning**, toggle **Show Weights** and drag **Weight Smoothness** from sharp to smooth to show deformation artifacts.

## Project Structure

```
src/
  animation/
    channel.js          # Channel class — keyframe store + evaluate(t)
    interpolation.js    # Step / Linear / Smooth math
    playback.js         # PlaybackController — time, play/pause, loop
  scene/
    setup.js            # Three.js renderer, camera, lights, ground
    rig.js              # Procedural tube mesh, bone chain, skin weights, joint markers
  modes/
    vertexMode.js       # Vertex animation mode logic + educator metadata
    boneMode.js         # Bone animation mode logic + educator metadata
    skinningMode.js     # Skinning mode logic + educator metadata
  ui/
    sidebar.js          # Mode selector, visibility, keyframe editor, weight tools
    timeline.js         # Transport controls, scrub track, keyframe markers
    overlays.js         # Educator panel + stats overlay
  main.js               # App entry — state, wiring, animation loop
  style.css             # Dark-mode theme, CSS Grid layout, all component styles
docs/
  skeletal-animation-explainer_PRD.md   # Original product requirements document
index.html
package.json
```

## Further Reading

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — code design decisions and data flow
- [`docs/AGENTS.md`](docs/AGENTS.md) — context for AI coding agents picking up this project
- [`docs/skeletal-animation-explainer_PRD.md`](docs/skeletal-animation-explainer_PRD.md) — original PRD
