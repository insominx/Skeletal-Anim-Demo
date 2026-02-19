import { INTERPOLATION_MODES } from "../animation/interpolation.js";

const INTERPOLATION_OPTIONS = [
  { value: INTERPOLATION_MODES.STEP, label: "Step" },
  { value: INTERPOLATION_MODES.LINEAR, label: "Linear" },
  { value: INTERPOLATION_MODES.SMOOTH, label: "Smooth" },
];

export function createSidebarUI({
  container,
  modes,
  channels,
  boneLegend = [],
  onModeChange,
  onVisibilityChange,
  onChannelChange,
  onInterpolationChange,
  onKeyframeValueChange,
  onWeightSmoothnessChange,
}) {
  container.innerHTML = `
    <div class="sidebar-scroll">
      <section class="panel-card">
        <h3>Presentation Mode</h3>
        <p class="panel-subtitle">Switch the lens on the same animation concept.</p>
        <div class="segmented" data-role="mode-list"></div>
      </section>

      <section class="panel-card">
        <h3>Visibility</h3>
        <label class="checkbox-line">
          <input type="checkbox" data-role="show-mesh" />
          Show Mesh
        </label>
        <label class="checkbox-line">
          <input type="checkbox" data-role="show-bones" />
          Show Bones
        </label>
        <label class="checkbox-line">
          <input type="checkbox" data-role="show-weights" />
          Show Weights (Heatmap)
        </label>
        <label class="checkbox-line">
          <input type="checkbox" data-role="show-ghosts" />
          Show Ghost Poses
        </label>

        <div class="bone-legend" data-role="bone-legend"></div>
      </section>

      <section class="panel-card">
        <h3>Keyframe Properties</h3>
        <p class="panel-subtitle">Active when a keyframe is selected.</p>
        <div class="input-grid">
          <div>
            <label class="field-label" for="channel-select">Selected Channel</label>
            <select id="channel-select" data-role="channel-select"></select>
          </div>

          <div>
            <label class="field-label" for="interpolation-select">Interpolation</label>
            <select id="interpolation-select" data-role="interpolation-select"></select>
          </div>

          <div>
            <label class="field-label" for="value-range">Value</label>
            <div class="inline-inputs">
              <input id="value-range" type="range" data-role="value-range" />
              <input id="value-number" type="number" data-role="value-number" />
            </div>
          </div>
        </div>

        <p class="keyframe-meta" data-role="keyframe-meta"></p>
        <p class="keyframe-empty" data-role="keyframe-empty">Select a keyframe from the timeline to edit its value.</p>
      </section>

      <section class="panel-card">
        <h3>Teaching Tools</h3>
        <label class="field-label" for="weight-smoothness">Weight Smoothness</label>
        <input
          id="weight-smoothness"
          type="range"
          min="0"
          max="1"
          step="0.01"
          data-role="weight-smoothness"
        />
        <p class="hint-text" data-role="weight-hint">Sharp -> Smooth</p>
      </section>

      <section class="panel-card teaching-copy">
        <h3>Key Concepts</h3>
        <p><strong>Keyframe:</strong> stores a value at a specific time.</p>
        <p><strong>Interpolation:</strong> computes values between keys.</p>
        <p><strong>Vertex animation:</strong> edits geometry directly.</p>
        <p><strong>Skinning:</strong> bones move, weights make vertices follow.</p>
      </section>
    </div>
  `;

  const modeList = container.querySelector('[data-role="mode-list"]');
  const showMeshInput = container.querySelector('[data-role="show-mesh"]');
  const showBonesInput = container.querySelector('[data-role="show-bones"]');
  const showWeightsInput = container.querySelector('[data-role="show-weights"]');
  const showGhostsInput = container.querySelector('[data-role="show-ghosts"]');
  const boneLegendContainer = container.querySelector('[data-role="bone-legend"]');
  const channelSelect = container.querySelector('[data-role="channel-select"]');
  const interpolationSelect = container.querySelector('[data-role="interpolation-select"]');
  const valueRange = container.querySelector('[data-role="value-range"]');
  const valueNumber = container.querySelector('[data-role="value-number"]');
  const keyframeMeta = container.querySelector('[data-role="keyframe-meta"]');
  const keyframeEmpty = container.querySelector('[data-role="keyframe-empty"]');
  const weightSmoothness = container.querySelector('[data-role="weight-smoothness"]');
  const weightHint = container.querySelector('[data-role="weight-hint"]');

  modeList.innerHTML = modes
    .map(
      (mode) => `
      <label>
        <input type="radio" name="presentation-mode" value="${mode.id}" />
        <span>${mode.label}</span>
      </label>
    `,
    )
    .join("");

  channelSelect.innerHTML = channels
    .map((channel) => `<option value="${channel.id}">${channel.label}</option>`)
    .join("");

  interpolationSelect.innerHTML = INTERPOLATION_OPTIONS
    .map((option) => `<option value="${option.value}">${option.label}</option>`)
    .join("");

  boneLegendContainer.innerHTML = `
    <p class="panel-subtitle">Weight Color Key</p>
    <div class="bone-legend-grid">
      ${boneLegend
        .map(
          (entry) => `
            <div class="bone-legend-item">
              <span class="bone-swatch" style="background:${entry.colorHex}"></span>
              <span>${entry.label}</span>
            </div>
          `,
        )
        .join("")}
    </div>
  `;

  const emitVisibility = () => {
    onVisibilityChange?.({
      showMesh: showMeshInput.checked,
      showBones: showBonesInput.checked,
      showWeights: showWeightsInput.checked,
      showGhosts: showGhostsInput.checked,
    });
  };

  const emitValueChange = (rawValue) => {
    const nextValue = Number(rawValue);
    if (!Number.isFinite(nextValue)) {
      return;
    }

    valueRange.value = String(nextValue);
    valueNumber.value = String(nextValue);
    onKeyframeValueChange?.(nextValue);
  };

  modeList.querySelectorAll('input[name="presentation-mode"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      if (radio.checked) {
        onModeChange?.(radio.value);
      }
    });
  });

  showMeshInput.addEventListener("change", emitVisibility);
  showBonesInput.addEventListener("change", emitVisibility);
  showWeightsInput.addEventListener("change", emitVisibility);
  showGhostsInput.addEventListener("change", emitVisibility);

  channelSelect.addEventListener("change", () => {
    onChannelChange?.(channelSelect.value);
  });

  interpolationSelect.addEventListener("change", () => {
    onInterpolationChange?.(interpolationSelect.value);
  });

  valueRange.addEventListener("input", () => emitValueChange(valueRange.value));
  valueNumber.addEventListener("input", () => emitValueChange(valueNumber.value));

  weightSmoothness.addEventListener("input", () => {
    const nextValue = Number(weightSmoothness.value);
    weightHint.textContent = `Sharp ${(1 - nextValue).toFixed(2)} -> Smooth ${nextValue.toFixed(2)}`;
    onWeightSmoothnessChange?.(nextValue);
  });

  return {
    setState({
      modeId,
      visibility,
      selectedChannel,
      selectedChannelId,
      selectedKeyframe,
      selectedKeyframeIndex,
      weightSmoothnessValue,
    }) {
      modeList.querySelectorAll('input[name="presentation-mode"]').forEach((radio) => {
        radio.checked = radio.value === modeId;
      });

      showMeshInput.checked = visibility.showMesh;
      showBonesInput.checked = visibility.showBones;
      showWeightsInput.checked = visibility.showWeights;
      showGhostsInput.checked = Boolean(visibility.showGhosts);

      channelSelect.value = selectedChannelId;
      interpolationSelect.value = selectedChannel.interpolation;

      const hasSelection = selectedKeyframeIndex != null && selectedKeyframe != null;
      const ui = selectedChannel.ui ?? { min: -1, max: 1, step: 0.01 };

      valueRange.min = String(ui.min ?? -1);
      valueRange.max = String(ui.max ?? 1);
      valueRange.step = String(ui.step ?? 0.01);

      valueNumber.min = String(ui.min ?? -1);
      valueNumber.max = String(ui.max ?? 1);
      valueNumber.step = String(ui.step ?? 0.01);

      valueRange.disabled = !hasSelection;
      valueNumber.disabled = !hasSelection;
      interpolationSelect.disabled = !hasSelection;

      if (hasSelection) {
        valueRange.value = String(selectedKeyframe.v);
        valueNumber.value = String(selectedKeyframe.v);
        keyframeMeta.textContent = `Selected key #${selectedKeyframeIndex + 1} at ${selectedKeyframe.t.toFixed(2)}s`;
        keyframeMeta.style.display = "block";
        keyframeEmpty.style.display = "none";
      } else {
        keyframeMeta.style.display = "none";
        keyframeEmpty.style.display = "block";
      }

      weightSmoothness.value = String(weightSmoothnessValue);
      weightHint.textContent = `Sharp ${(1 - weightSmoothnessValue).toFixed(2)} -> Smooth ${weightSmoothnessValue.toFixed(2)}`;
    },
  };
}
