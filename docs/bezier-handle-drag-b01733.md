# Draggable Bézier Handles on the Curve Graph

Implement pointer-drag editing of the cubic Hermite tangent handles visible on the curve graph when a keyframe is selected in Smooth mode.

---

## Current State (what's already done)

| File | Status |
|---|---|
| `src/animation/interpolation.js` | ✅ `cubicHermite(v0, m0, v1, m1, u)` added; `interpolateValues` accepts `m0`/`m1` |
| `src/animation/channel.js` | ✅ Keyframes store `easeOut`/`easeIn` (default 0); `setKeyframeTangents()` added; `evaluate()` passes tangents through |
| `src/ui/curveGraph.js` | ⚠️ Still draws handles at **fixed** positions (`left.v`, `right.v`) — ignores stored tangents; no pointer interaction |
| `src/ui/timeline.js` | ⚠️ Passes no `onHandleDrag` callback to `createCurveGraph` |
| `src/main.js` | ⚠️ No handler for tangent edits |

The data model and evaluator are ready. Only the UI layer needs updating.

---

## Math

For a segment `[left, right]` with `segDuration = right.t - left.t`:

```
cp1.v = left.v  + left.easeOut  * segDuration / 3   ← out-handle of left keyframe
cp2.v = right.v - right.easeIn  * segDuration / 3   ← in-handle of right keyframe
```

Dragging cp1 to a new canvas Y → new value `newV`:
```
left.easeOut = (newV - left.v) * 3 / segDuration
```

Dragging cp2 to a new canvas Y → new value `newV`:
```
right.easeIn = (right.v - newV) * 3 / segDuration
```

Handle X is **fixed** at `±segDuration/3` from the keyframe (value-only editing, standard DCC convention).

---

## Changes Required

### 1. `src/ui/curveGraph.js` — largest change, broken into logical pieces

**a. Add `yToValue()` inverse to `createLayout()`**
```js
yToValue(y) {
  const normalized = 1 - (y - padding.top) / height;
  return min + normalized * valueRange;
}
```

**b. Extract `getHandlePositions(channel, selectedKeyframeIndex)`**
Returns an array of handle descriptors (one per cp, up to 4 for two adjacent segments):
```js
{ t, v, type: "easeOut"|"easeIn", keyframeIndex, segDuration, anchorKfIndex }
```
Uses the tangent-aware formula above instead of the current flat `left.v`/`right.v`.

**c. Update `drawBezierHandles()`**
- Accept `activeHandleIndex` param — highlight the active knob (brighter, slightly larger)
- Read handle positions from `getHandlePositions()` instead of computing inline

**d. Update `buildStaticSignature()`**
Include `easeOut`/`easeIn` per keyframe so cache invalidates on tangent change.

**e. Enable pointer events on canvas**
```js
canvas.style.pointerEvents = "auto";
canvas.style.cursor = "default";
```

**f. Add drag state + pointer handlers inside `createCurveGraph`**
```
dragHandleIndex = null   // index into getHandlePositions() result, or null

pointerdown:
  stopPropagation()          ← prevent timeline scrub
  hit-test handles (10px radius)
  if hit → setPointerCapture, dragHandleIndex = hit index

pointermove:
  if dragging → compute newV = layout.yToValue(py), clamp to [min,max]
                derive new tangent value
                call onHandleDrag({ keyframeIndex, type, easeOut?, easeIn? })
                needsStaticRedraw = true; render()

pointerup / pointercancel:
  dragHandleIndex = null; canvas.style.cursor = "default"

pointermove (no drag):
  cursor = "ns-resize" if hovering a handle, else "default"
```

**g. Update `createCurveGraph` signature**
```js
export function createCurveGraph({ trackElement, onHandleDrag })
```

### 2. `src/ui/timeline.js`

Pass `onHandleDrag` through from the timeline's own constructor option:
```js
const curveGraph = createCurveGraph({
  trackElement: track,
  onHandleDrag: onHandleDrag,   // new prop
});
```
Add `onHandleDrag` to the destructured params of `createTimelineUI`.

### 3. `src/main.js`

Wire the callback when constructing `createTimelineUI`:
```js
onHandleDrag: ({ keyframeIndex, type, easeOut, easeIn }) => {
  const selectedChannel = getSelectedChannel();
  selectedChannel.setKeyframeTangents(
    keyframeIndex,
    type === "easeOut" ? easeOut : null,
    type === "easeIn"  ? easeIn  : null,
  );
  refreshStaticUI();
},
```

---

## Implementation Order

1. `curveGraph.js` — all drawing + interaction changes (self-contained)
2. `timeline.js` — thread `onHandleDrag` through
3. `main.js` — add `onHandleDrag` handler
4. Build + runtime console check + commit

---

## No CSS changes needed

The canvas already sits at `z-index: 0` with `pointer-events: none` in CSS — override via inline style (`canvas.style.pointerEvents = "auto"`) so the CSS rule remains the safe default and only this instance opts in.

---

## Scope

- **Value-only drag** (Y axis). Handle X stays fixed.
- **No undo/redo** — out of scope.
- **No tangent display in sidebar** — out of scope.
- Works only in Smooth interpolation mode (handles hidden otherwise).
