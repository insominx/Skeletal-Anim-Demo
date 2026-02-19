# Interactive Graph Implementation Report

## Overview
This document summarizes the attempts made to implement the "Interactive Graph View" (Option 1) and the "Draggable Bézier Handles" refinements. It serves as a handoff document for the next agent, detailing the code changes made, the testing approach used, and the discrepancy between the agent's test results and the user's actual experience.

## Goal
To make the curve graph in the timeline fully interactive, allowing users to:
1. Drag keyframe dots vertically to edit their values.
2. Drag bezier curve handles to adjust the ease-in/ease-out tangents visually.

## Implementation Steps Taken

The following files were modified during the implementation attempt:

### 1. `src/style.css`
- Modified `.curve-canvas` to have `pointer-events: auto` and `touch-action: none` to allow the canvas to receive pointer events instead of passing them through.

### 2. `src/ui/curveGraph.js`
- **Hit Testing (`getHitTarget`)**: Implemented logic to detect when the pointer is over a keyframe dot or a bezier handle (calculating handle positions based on `easeOut`/`easeIn` and `segDuration`).
- **Handle Positions (`getHandlePositions`)**: Extracted handle calculation logic into a standalone function to ensure rendering and hit-testing use the exact same coordinates.
- **Pointer Events**: Added `pointerdown`, `pointermove`, and `pointerup` event listeners to the canvas.
    - Captures the pointer on down if a target is hit.
    - Calculates the new generic value using a new `layout.yToValue(y)` helper during move.
    - Computes the new slope (`m`) for tangent handles based on the value delta.
    - Fires callbacks: `onKeyframeValueDrag(index, newValue)` and `onKeyframeTangentDrag(index, easeOut, easeIn)`.
    - Handles hover states (changing the cursor to `pointer` or `ns-resize` and drawing a highlighted state for the active handle).
- **Cache Invalidation**: Updated `buildStaticSignature` to include `easeOut` and `easeIn` values so the static canvas layer redraws when tangents change.

### 3. `src/ui/timeline.js`
- Passed the `onKeyframeValueDrag` and `onKeyframeTangentDrag` callbacks from the timeline initialization down into `createCurveGraph`.
- Because `curveGraph` calls `e.stopPropagation()` when a drag starts, it was intended to prevent the timeline's default scrubbing behavior from interfering.

### 4. `src/main.js`
- Implemented `onKeyframeValueDrag` and `onKeyframeTangentDrag` inside `createTimelineUI`.
- These handlers look up the selected channel, call `setKeyframeValue` or `setKeyframeTangents`, update the playhead time to the keyframe's time, and call `refreshStaticUI()` to snap the application state.

## Testing Performed by Existing Agent
The agent used an automated browser subagent to test the functionality locally (`http://localhost:5173/`).
- The subagent reported success in identifying and clicking keyframe dots and bezier handles.
- The subagent reported that dragging the elements caused the visual curve to update and the channel values to change.
- Recordings (WebP) were captured by the subagent showing the interactions occurring.

## Resolution

**Root cause:** Issue #3 from the investigation list — `.timeline-keyframe-layer` had `position: absolute; inset: 0; z-index: 1` with default `pointer-events`, covering the entire track and intercepting all pointer events before they reached `.curve-canvas` at `z-index: 0`. The canvas drag handlers never fired.

**Fix applied:**
1. **`src/style.css`** — Added `pointer-events: none` to `.timeline-keyframe-layer` so events pass through to the canvas. Added `pointer-events: auto` to `.timeline-marker` so individual keyframe diamond buttons remain clickable.
2. **`src/ui/curveGraph.js`** — Moved `let currentHoverId = null` declaration above the `resizeCanvases()` call to eliminate a latent temporal dead zone risk (the `drawStaticLayer` function references `currentHoverId` and is reachable from the `resizeCanvases → render` call chain).
