# Implementation Plan: Option 1 (Interactive Graph View)

## Goal Definition
The `curveGraph.js` file already renders the curve, keyframes, and bezier handles onto a canvas behind the timeline. However, this graph is purely visual and static—users cannot interact with it to edit values or curve handles directly. The goal of this implementation is to make the curve graph fully interactive, allowing users to:
1. Drag keyframe dots vertically to easily edit their values.
2. Drag bezier curve handles to adjust the ease-in/ease-out tangents visually.

## Proposed Changes

### 1. `src/ui/curveGraph.js`
- **Expose Mapping:** Expand the returned controller to expose the reverse-mapping math, like `getHitTarget(clientX, clientY)` and `pixelToValue(clientY)`.
- **Add Pointer Handlers:** Directly manage pointer events on the graph canvas (or hook into `timeline.js` track events) to detect whether the user has grabbed a keyframe dot or a bezier handle.
- **Drag Logic:** Implement `pointerdown`, `pointermove`, and `pointerup` handlers for dragging. When a handle or dot is dragged, invoke new callback events.

### 2. `src/ui/timeline.js`
- **Update Integration:** Pass new callback props to `createCurveGraph`:
  - `onKeyframeValueDrag(index, newValue)`: Fired while dragging a keyframe dot vertically.
  - `onKeyframeTangentDrag(index, easeOut, easeIn)`: Fired while dragging a bezier handle.
- **Event Conflict Mitigation:** Ensure that normal scrubbing on the timeline track is ignored if the graph canvas claims the pointer event for dragging a dot/handle.

### 3. `src/main.js`
- **Wire up Callbacks:** Pass the new dragging callbacks down into `createTimelineUI`.
- **State Mutation:** When `onKeyframeValueDrag` fires, update the channel's keyframe value using `channel.setKeyframeValue()` and trigger a `refreshStaticUI()` to immediately snap the rig to the updated value.
- **Tangent Updates:** When `onKeyframeTangentDrag` fires, update the channel using `channel.setKeyframeTangents()` and refresh the UI.

## User Review Required
No major architectural changes are required. The key decision is whether the timeline will feel too easily "accidentally" dragged compared to scrubbing time. We can solve this by requiring a small drag threshold before claiming the grab, or only allowing vertical drags when a keyframe is actively selected.

## Verification Plan
1. **Manual Testing:** Run the dev server. Click and drag a selected keyframe vertically and ensure the mesh deforms or the bone rotates in real-time.
2. **Tangent Testing:** Select a keyframe in SMOOTH interpolation mode. Drag the yellow control points (bezier handles) and verify the ease-in/ease-out curve visibly flexes and saves correctly.
