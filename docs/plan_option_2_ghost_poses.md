# Implementation Plan: Option 2 (Ghost Poses / Onion Skinning)

## Goal Definition
Provide immediate visual context for how the animation arc looks over time without requiring the student to play or scrub the timeline. By rendering "ghosts" (faint, static representations of the rig) at every keyframe point in time, the student can see the full range of motion simultaneously.

## Proposed Changes

### 1. `src/scene/ghosts.js` (NEW)
- **Create Ghost Manager:** Implement a system capable of snapshotting the rig state and rendering faint clones. We will use simple `THREE.LineSegments` colored faintly to represent the skeleton (similar to `SkeletonHelper`), preventing visual clutter that full meshes would create.
- **Method `updateGhosts(channel, rig)`:** Iterates through every keyframe in the currently selected channel. For each keyframe:
  - Temporarily evaluates the transforms at `keyframe.t`.
  - Stamps a ghost representation of the skeleton into a `THREE.Group` that holds all ghost instances.
  - Returns the rig back to its correct current state.

### 2. `src/scene/setup.js` or `src/scene/rig.js`
- **Integration:** Integrate the ghost group into the scene so it toggles visibility correctly. It should only be visible when toggled "on" in the UI.

### 3. `src/main.js`
- **UI Toggle:** Add a "Show Ghosts" toggle to the `state.visibility` object.
- **Trigger Update:** Whenever a keyframe is added, deleted, dragged, or modified, recalculate the ghost poses by calling `updateGhosts(...)`.
- **Performance consideration:** The rig updates itself fast enough that copying the transforms 5-10 times (per keyframe) every frame of a UI drag is trivial for performance.

### 4. `src/ui/sidebar.js`
- **Toggle Button:** Add a specific toggle button or checkbox under the visibility section to flip `state.visibility.showGhosts`.

## User Review Required
There is a visual design choice: should ghosts use the same vibrant colors as the standard bones (but low opacity), or should they be a uniform faint gray/white to maintain contrast? I propose a uniform semi-transparent gray with no depth testing so they don't visually confuse the primary character skeleton.

## Verification Plan
1. **Manual Testing:** Turn on "Show Ghosts" in the sidebar. Drop 4 keyframes on the timeline. Ensure 4 faint skeletons appear dynamically positioned at those exact values.
2. **Scrubbing:** Ensure the main, brightly colored skeleton moves smoothly *through* the static ghost poses when the timeline is played.
3. **Editing:** Drag a keyframe value and watch its associated ghost instantly snap to the new position.
