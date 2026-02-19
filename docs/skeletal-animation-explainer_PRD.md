# Skeletal Animation Explainer (Three.js) — Project Requirements

**Purpose:** A small interactive web demo to teach students:
1. What a **keyframe** is (a stored snapshot of values at a time).
2. How **interpolation** generates in-betweens.
3. The difference between **vertex animation** (deforming geometry directly) and **bone-driven skinning** (animating a skeleton, vertices follow via weights).

**Target audience:** Intro to 3D graphics / animation students (high school / university level).

---

## 1. Goals and Learning Outcomes

### 1.1 Learning outcomes
Students should be able to:
- Define a **keyframe** and explain **interpolation** between keyframes.
- Describe why animating *every vertex* is costly/hard to author.
- Explain skeletal animation basics:
  - Bones are transforms organized in a hierarchy.
  - Skinning uses **weights** to blend bone transforms per-vertex.
- Recognize common weight issues (e.g., sharp weighting vs smooth weighting).

### 1.2 Non-goals
- Full-featured animation editor (no curve tangents per key, no multi-track sequencer).
- Photoreal characters, IK solvers, retargeting, or advanced rigging tools.
- Import/export of animation file formats (GLTF clips optional stretch goal).

---

## 2. Product Scope

### 2.1 Core modes (same motion concept, different targets)
The demo presents the *same conceptual animation* via three modes:

1. **Vertex Animation Mode (Brute Force)**
   - Geometry is deformed directly each frame (e.g., bend parameter applied to vertices).
   - Purpose: show “you *can* animate vertices,” but it’s heavy and less reusable.

2. **Bone Animation Mode (Skeleton Only)**
   - Mesh hidden, bones shown.
   - Bone transforms are animated using keyframes + interpolation.

3. **Skinning Mode (Bones + Skinned Mesh)**
   - Same bone animation, mesh visible and deforms via skinning weights.
   - Bone visualization optionally shown.

### 2.2 Keyframe concept (applies to vertex & bone targets)
A unified “mini animation system” drives all modes:
- A **timeline** with a playhead and keyframe markers.
- Ability to add/edit/delete keyframes for a selected channel.
- Interpolation options (Step / Linear / Smooth).

---

## 3. User Experience Requirements

### 3.1 Layout
Single-page web app with:
- **Viewport**: Three.js canvas (left or center).
- **Controls panel**: mode selection, toggles, slider controls (right).
- **Timeline**: horizontal strip at bottom with keyframe markers and playhead.
- Optional **Graph view**: simple value-vs-time plot for the selected channel (below controls or above timeline).

### 3.2 Core interactions
- **Scrub**: click/drag timeline to move playhead time.
- **Play/Pause**: animate time forward at a fixed FPS.
- **Add Keyframe**: add a keyframe at current playhead time using current value.
- **Select Keyframe**: click a keyframe marker to select.
- **Edit Keyframe Value**: numeric input / slider for selected keyframe value.
- **Delete Keyframe**: remove selected keyframe.
- **Interpolation mode**: Step / Linear / Smooth (applies between keyframes).

### 3.3 Visibility toggles
- Show/hide **mesh**
- Show/hide **bones** (SkeletonHelper)
- Show/hide **weights visualization** (vertex colors/overlay)
- Show/hide **ghost poses** at keyframes (optional but highly educational)

### 3.4 Weight teaching tools
- **Weight smoothness slider** (demo simplification):
  - “Sharp” (mostly single-bone influence) → shows artifacts
  - “Smooth” (blended influences) → better deformation
- **Vertex inspect (optional)**:
  - Hover/click a vertex to display its bone weights (top 2–4 influences).
  - Display as a small list or bar chart.

---

## 4. Functional Requirements

### 4.1 Scene setup
- Three.js scene with:
  - Camera (orbit controls allowed; default view fixed/pleasant).
  - Simple lighting (ambient + directional).
  - Ground grid (optional).
- A single educational “character” object:
  - **Skinned tube/arm** mesh with ~20–40 segments along length.
  - **Bone chain** with 3–5 bones.
  - Weights assigned along length with smooth blending.

### 4.2 Mini keyframe engine (custom, readable)
Implement a small keyframe evaluation system (do **not** start with Three.js AnimationMixer for the teaching core).

**Data model:**
- A *Channel* animates one scalar value.
- Channel stores sorted keyframes: `{ t: number, v: number }`.

**Evaluation:**
Given current time `t`:
- If `t` before first keyframe → return first value.
- If after last → return last value.
- Otherwise find bounding keyframes `(t0,v0)` and `(t1,v1)`, compute `u=(t-t0)/(t1-t0)` and interpolate:
  - Step: `v0`
  - Linear: `v0 + u*(v1-v0)`
  - Smooth: `ease(u)` then blend (e.g., `u*u*(3-2*u)`)

### 4.3 Animated targets (channels)
Minimum required channels:
- **Bone rotation channel** (e.g., Bone1 rotation Z in degrees)
- **Vertex-bend channel** (a scalar bend amount applied in Vertex Animation Mode)

Optional channels:
- Bone2 rotation, bone3 rotation, or phase offsets.
- A second channel to show multi-channel animation (advanced).

### 4.4 Mode behaviors
#### Vertex Animation Mode
- Skeleton may be hidden or visible (user toggle).
- Mesh deformation is computed by directly modifying geometry vertex positions.
- The “bend amount” channel controls deformation.
- Must update geometry attributes efficiently:
  - Use `BufferGeometry` position attribute.
  - Mark `position.needsUpdate = true`.

#### Bone Animation Mode
- Mesh hidden.
- Skeleton shown.
- Bone transforms driven by keyframes + interpolation.

#### Skinning Mode
- Mesh visible (SkinnedMesh).
- Bone transforms driven by the same keyframes as Bone Animation Mode.
- Must correctly update skinned mesh each frame.

### 4.5 Performance indicators (teaching aid)
Display simple stats:
- Vertex count and approximate “work”:
  - Vertex Mode: “Animating N vertices” (N = vertex count)
  - Bone Mode: “Animating B bones” (B = bone count)
- Optional: FPS display.

---

## 5. Content Requirements (Teaching Copy)

In-app short explanatory text/tooltips:
- “A **keyframe** stores a value at a specific time.”
- “**Interpolation** computes values between keyframes.”
- “Vertex animation edits the mesh directly.”
- “Skeletal animation moves bones; **weights** make vertices follow.”

Optional “guided steps”:
1. Add 3 keyframes (0s, 1s, 2s).
2. Switch interpolation types.
3. Switch modes and observe reuse.

---

## 6. Technical Requirements

### 6.1 Tech stack
- **Three.js** (ES modules) and a simple bundler (Vite recommended) or static module hosting.
- UI: **lil-gui** (or minimal custom UI).
- Optional: minimal CSS framework (not required).

### 6.2 Browser support
- Latest Chrome / Edge / Firefox / Safari (desktop).
- Mobile support optional; prioritize desktop for teaching.

### 6.3 Code organization
- `/src/scene/` — scene setup, mesh + skeleton creation
- `/src/animation/` — keyframe channel, interpolation, playback controls
- `/src/ui/` — controls + timeline UI
- `/src/modes/` — vertex mode, bone mode, skinning mode

### 6.4 Timeline UI implementation
Acceptable implementations:
- Simple HTML/CSS with click/drag handlers.
- Or a small `<canvas>` timeline renderer.

Must support:
- Render keyframe markers.
- Render playhead.
- Mouse drag scrubbing.
- Selecting keyframes.

### 6.5 Asset requirements
- No external models required for MVP.
- (Optional stretch) Load a GLTF skinned model to demonstrate “same idea on a real character”.

---

## 7. Accessibility & Classroom Use

- Large readable UI elements for projection.
- Keyboard shortcuts (nice-to-have):
  - Space: play/pause
  - Left/Right: scrub small step
  - K: add keyframe
  - Delete: remove selected keyframe
- Colorblind-friendly weight visualization (offer alternate palette or patterns) — optional.

---

## 8. Acceptance Criteria (MVP)

The project is considered complete when:

1. User can **scrub time** and see the pose/value update live.
2. User can **add/select/edit/delete keyframes** for at least one channel.
3. User can switch interpolation between **Step / Linear / Smooth** and see differences.
4. App demonstrates:
   - Vertex animation (direct deformation) driven by keyframes.
   - Bone-only animation driven by the same keyframe system.
   - Skinned mesh deformation driven by bone animation and weights.
5. Bones can be visualized with `SkeletonHelper`.
6. A simple weight visualization exists (vertex colors or overlay) and a smoothness control demonstrates artifacts.

---

## 9. Stretch Goals (Optional)

- Graph view for the current channel (value vs time).
- Multiple channels (e.g., Bone1 rot + Bone2 rot) and a channel selector.
- Onion-skin “ghost poses” at keyframes.
- Vertex inspector showing weight breakdown for a picked vertex.
- Import a GLTF skinned model and show the same keyframe/interpolation concept on a real character.
- Export a tiny JSON animation clip (channel keyframes).

---

## 10. Risks & Mitigations

- **Picking vertices** in Three.js can be fiddly:
  - Mitigation: make it optional; rely on weight color visualization first.
- **Skinning setup complexity**:
  - Mitigation: start with procedural tube mesh + procedural weights.
- **Students confusing interpolation with physics**:
  - Mitigation: explicitly label “math interpolation” and show Step mode first.

---

## 11. Milestones

1. **M1 — Scene + rig (1 day)**
   - Tube mesh, bone chain, SkinnedMesh, SkeletonHelper.

2. **M2 — Mini keyframe engine (1 day)**
   - Channel model, interpolation, playback time.

3. **M3 — Timeline UI (1–2 days)**
   - Scrub, add/select/delete keyframes, edit values.

4. **M4 — Modes (1–2 days)**
   - Vertex deform mode, bone-only mode, skinning mode.

5. **M5 — Teaching polish (1 day)**
   - Weight viz, smoothness slider, copy/tooltips.

---

## 12. Deliverables

- Source code repository (Vite project).
- `README.md` with:
  - install/run steps
  - teaching notes (suggested classroom flow)
- Deployed static build (GitHub Pages or similar) — optional.

