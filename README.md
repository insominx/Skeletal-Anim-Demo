# Skeletal Animation Explainer (Three.js)

Interactive classroom demo for teaching keyframes, interpolation, vertex animation, and skeletal skinning.

## Install and Run

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

## Teaching Flow (Suggested)

1. Start in **Skinning** mode and play the default loop.
2. Scrub the timeline and select keyframes to edit values.
3. Switch interpolation between **Step / Linear / Smooth**.
4. Switch to **Bone Animation** to show the same motion with skeleton only.
5. Switch to **Vertex Animation** to compare direct geometry edits.
6. Toggle **Show Weights** and move **Weight Smoothness** from sharp to smooth.

## Keyboard Shortcuts

- `Space`: Play / Pause
- `Left` / `Right`: Scrub small time step
- `K`: Add keyframe on selected channel
- `Delete`: Remove selected keyframe

## Project Structure

- `src/scene/` — scene setup, procedural rig, weight utilities
- `src/animation/` — channel model, interpolation math, playback
- `src/ui/` — sidebar, timeline, overlays
- `src/modes/` — vertex / bone / skinning mode logic
