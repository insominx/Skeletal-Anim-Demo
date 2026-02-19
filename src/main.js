import { Channel } from "./animation/channel.js";
import { INTERPOLATION_MODES } from "./animation/interpolation.js";
import { PlaybackController } from "./animation/playback.js";
import { BONE_MODE, runBoneMode } from "./modes/boneMode.js";
import { SKINNING_MODE, runSkinningMode } from "./modes/skinningMode.js";
import { VERTEX_MODE, runVertexMode } from "./modes/vertexMode.js";
import { createGhostManager } from "./scene/ghosts.js";
import { createEducationalRig } from "./scene/rig.js";
import { createSceneContext } from "./scene/setup.js";
import { createOverlayController } from "./ui/overlays.js";
import { createSidebarUI } from "./ui/sidebar.js";
import { createTimelineUI } from "./ui/timeline.js";

const MODES = [VERTEX_MODE, BONE_MODE, SKINNING_MODE];
const MODE_BY_ID = new Map(MODES.map((mode) => [mode.id, mode]));

const viewportElement = document.getElementById("viewport");
const sidebarElement = document.getElementById("sidebar");
const timelineElement = document.getElementById("timeline");
const educatorPanel = document.getElementById("educator-panel");
const statsOverlay = document.getElementById("stats-overlay");

const sceneContext = createSceneContext(viewportElement);
const rig = createEducationalRig(sceneContext.scene);
const ghostManager = createGhostManager(sceneContext.scene);

const channels = [
  new Channel({
    id: "boneRotation",
    label: "Bone 1 Z-Rotation",
    interpolation: INTERPOLATION_MODES.SMOOTH,
    ui: {
      min: -55,
      max: 55,
      step: 1,
      unit: "deg",
    },
    keyframes: [
      { t: 0, v: 0 },
      { t: 0.75, v: 32 },
      { t: 1.5, v: -26 },
      { t: 2.25, v: 18 },
      { t: 3, v: 0 },
    ],
  }),
  new Channel({
    id: "bendAmount",
    label: "Bend Amount",
    interpolation: INTERPOLATION_MODES.SMOOTH,
    ui: {
      min: -1.2,
      max: 1.2,
      step: 0.01,
      unit: "",
    },
    keyframes: [
      { t: 0, v: 0 },
      { t: 0.75, v: 0.72 },
      { t: 1.5, v: -0.62 },
      { t: 2.25, v: 0.38 },
      { t: 3, v: 0 },
    ],
  }),
];

const CHANNEL_BY_ID = new Map(channels.map((channel) => [channel.id, channel]));
const playback = new PlaybackController({ duration: 3, initialTime: 0, autoPlay: true });

const state = {
  modeId: SKINNING_MODE.id,
  visibility: {
    showMesh: true,
    showBones: true,
    showWeights: false,
    showGhosts: false,
  },
  selectedChannelId: "boneRotation",
  selectedKeyframeIndex: 0,
  weightSmoothness: 0.82,
};

const overlays = createOverlayController({
  educatorElement: educatorPanel,
  statsElement: statsOverlay,
});

function getSelectedChannel() {
  return CHANNEL_BY_ID.get(state.selectedChannelId) ?? channels[0];
}

function getSelectedKeyframe() {
  if (state.selectedKeyframeIndex == null) {
    return null;
  }

  return getSelectedChannel().getKeyframe(state.selectedKeyframeIndex);
}

function ensureValidSelection() {
  const channel = getSelectedChannel();
  if (channel.keyframes.length === 0) {
    state.selectedKeyframeIndex = null;
    return;
  }

  if (state.selectedKeyframeIndex == null || state.selectedKeyframeIndex >= channel.keyframes.length) {
    state.selectedKeyframeIndex = channel.findClosestKeyframeIndex(playback.currentTime);
  }
}

function applyRigVisibility() {
  rig.setModeVisibility({
    mode: state.modeId,
    showMesh: state.visibility.showMesh,
    showBones: state.visibility.showBones,
    showWeights: state.visibility.showWeights,
  });

  rig.setWeightVisualization(state.visibility.showWeights);
  ghostManager.setVisible(state.visibility.showGhosts);
}

function refreshGhosts() {
  if (!state.visibility.showGhosts) {
    return;
  }

  const channel = CHANNEL_BY_ID.get("boneRotation");
  ghostManager.updateGhosts(channel, rig);
}

const sidebarUI = createSidebarUI({
  container: sidebarElement,
  modes: MODES,
  channels,
  boneLegend: rig.boneLegend,
  onModeChange: (modeId) => {
    state.modeId = modeId;
    applyRigVisibility();
    refreshStaticUI();
  },
  onVisibilityChange: (visibility) => {
    state.visibility = { ...state.visibility, ...visibility };
    applyRigVisibility();
    refreshGhosts();
    refreshStaticUI();
  },
  onChannelChange: (channelId) => {
    state.selectedChannelId = channelId;
    state.selectedKeyframeIndex = getSelectedChannel().findClosestKeyframeIndex(playback.currentTime);
    refreshStaticUI();
  },
  onInterpolationChange: (interpolationMode) => {
    getSelectedChannel().setInterpolation(interpolationMode);
    refreshStaticUI();
  },
  onKeyframeValueChange: (nextValue) => {
    const selectedChannel = getSelectedChannel();
    if (state.selectedKeyframeIndex == null) {
      return;
    }

    const ui = selectedChannel.ui ?? { min: -1, max: 1 };
    const clamped = Math.min(ui.max, Math.max(ui.min, Number(nextValue)));
    selectedChannel.setKeyframeValue(state.selectedKeyframeIndex, clamped);
    refreshGhosts();
    refreshStaticUI();
  },
  onWeightSmoothnessChange: (value) => {
    state.weightSmoothness = Number(value);
    rig.setWeightSmoothness(state.weightSmoothness);
    refreshStaticUI();
  },
});

const timelineUI = createTimelineUI({
  container: timelineElement,
  onTogglePlay: () => {
    playback.toggle();
  },
  onScrubStart: () => {
    playback.pause();
  },
  onScrub: (nextTime) => {
    playback.setTime(nextTime);
  },
  onAddKeyframe: () => {
    const selectedChannel = getSelectedChannel();
    const value = selectedChannel.evaluate(playback.currentTime);
    state.selectedKeyframeIndex = selectedChannel.addKeyframe(playback.currentTime, value);
    refreshGhosts();
    refreshStaticUI();
  },
  onDeleteKeyframe: () => {
    const selectedChannel = getSelectedChannel();
    if (state.selectedKeyframeIndex == null) {
      return;
    }

    selectedChannel.removeKeyframe(state.selectedKeyframeIndex);
    if (selectedChannel.keyframes.length === 0) {
      state.selectedKeyframeIndex = null;
    } else {
      state.selectedKeyframeIndex = Math.min(state.selectedKeyframeIndex, selectedChannel.keyframes.length - 1);
    }

    refreshGhosts();
    refreshStaticUI();
  },
  onSelectKeyframe: (index) => {
    state.selectedKeyframeIndex = index;
    const selected = getSelectedChannel().getKeyframe(index);
    if (selected) {
      playback.setTime(selected.t);
    }

    refreshStaticUI();
  },
  onKeyframeValueDrag: (index, newValue) => {
    const selectedChannel = getSelectedChannel();
    selectedChannel.setKeyframeValue(index, newValue);
    if (state.selectedKeyframeIndex !== index) {
      state.selectedKeyframeIndex = index;
      const selected = selectedChannel.getKeyframe(index);
      if (selected) {
        playback.setTime(selected.t);
      }
    }
    refreshGhosts();
    refreshStaticUI();
  },
  onKeyframeTangentDrag: (index, easeOut, easeIn) => {
    const selectedChannel = getSelectedChannel();
    selectedChannel.setKeyframeTangents(index, easeOut, easeIn);
    if (state.selectedKeyframeIndex !== index) {
      state.selectedKeyframeIndex = index;
      const selected = selectedChannel.getKeyframe(index);
      if (selected) {
        playback.setTime(selected.t);
      }
    }
    refreshStaticUI();
  },
});

function refreshStaticUI() {
  ensureValidSelection();
  const selectedChannel = getSelectedChannel();
  const selectedKeyframe = getSelectedKeyframe();
  const modeMeta = MODE_BY_ID.get(state.modeId);

  sidebarUI.setState({
    modeId: state.modeId,
    visibility: state.visibility,
    selectedChannel,
    selectedChannelId: state.selectedChannelId,
    selectedKeyframe,
    selectedKeyframeIndex: state.selectedKeyframeIndex,
    weightSmoothnessValue: state.weightSmoothness,
  });

  timelineUI.setKeyframeState({
    duration: playback.duration,
    keyframes: selectedChannel.keyframes,
    selectedKeyframeIndex: state.selectedKeyframeIndex,
    canDelete: state.selectedKeyframeIndex != null,
  });

  timelineUI.setCurveState({
    channel: selectedChannel,
    duration: playback.duration,
    currentTime: playback.currentTime,
    selectedKeyframeIndex: state.selectedKeyframeIndex,
  });

  overlays.setEducator(modeMeta);
}

function updatePerFrame() {
  const currentTime = playback.currentTime;
  const boneRotationDegrees = CHANNEL_BY_ID.get("boneRotation").evaluate(currentTime);
  const bendAmount = CHANNEL_BY_ID.get("bendAmount").evaluate(currentTime);
  const selectedChannel = getSelectedChannel();

  if (state.modeId === VERTEX_MODE.id) {
    runVertexMode(rig, { bendAmount });
    rig.applyBoneRotationDegrees(0);
  } else if (state.modeId === BONE_MODE.id) {
    runBoneMode(rig, { rotationDegrees: boneRotationDegrees });
  } else {
    runSkinningMode(rig, { rotationDegrees: boneRotationDegrees });
  }

  timelineUI.setCurveState({
    channel: selectedChannel,
    duration: playback.duration,
    currentTime,
    selectedKeyframeIndex: state.selectedKeyframeIndex,
  });
}

function isTextInputActive(eventTarget) {
  if (!eventTarget) {
    return false;
  }

  const tagName = eventTarget.tagName;
  if (!tagName) {
    return false;
  }

  return ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(tagName) || eventTarget.isContentEditable;
}

window.addEventListener("keydown", (event) => {
  if (isTextInputActive(event.target)) {
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    playback.toggle();
    return;
  }

  if (event.code === "ArrowLeft") {
    event.preventDefault();
    playback.step(-0.05);
    return;
  }

  if (event.code === "ArrowRight") {
    event.preventDefault();
    playback.step(0.05);
    return;
  }

  if (event.code === "KeyK") {
    event.preventDefault();
    const selectedChannel = getSelectedChannel();
    const value = selectedChannel.evaluate(playback.currentTime);
    state.selectedKeyframeIndex = selectedChannel.addKeyframe(playback.currentTime, value);
    refreshGhosts();
    refreshStaticUI();
    return;
  }

  if (event.code === "Delete") {
    event.preventDefault();
    const selectedChannel = getSelectedChannel();
    if (state.selectedKeyframeIndex == null) {
      return;
    }

    selectedChannel.removeKeyframe(state.selectedKeyframeIndex);
    state.selectedKeyframeIndex = selectedChannel.keyframes.length
      ? Math.min(state.selectedKeyframeIndex, selectedChannel.keyframes.length - 1)
      : null;
    refreshGhosts();
    refreshStaticUI();
  }
});

rig.setWeightSmoothness(state.weightSmoothness);
applyRigVisibility();
refreshGhosts();
refreshStaticUI();

let previousTime = performance.now();
let smoothedFps = 60;

function animate(now) {
  requestAnimationFrame(animate);

  const deltaSeconds = Math.min((now - previousTime) / 1000, 0.05);
  previousTime = now;

  playback.tick(deltaSeconds);
  updatePerFrame();

  sceneContext.controls.update();
  sceneContext.renderer.render(sceneContext.scene, sceneContext.camera);

  const fps = 1 / Math.max(deltaSeconds, 0.001);
  smoothedFps = smoothedFps * 0.9 + fps * 0.1;

  timelineUI.setPlaybackState({
    currentTime: playback.currentTime,
    isPlaying: playback.isPlaying,
  });

  const modeMeta = MODE_BY_ID.get(state.modeId);
  overlays.setStats({
    fps: smoothedFps,
    modeLabel: modeMeta.label,
    workText: rig.getWorkTextForMode(state.modeId),
  });
}

requestAnimationFrame((now) => {
  previousTime = now;
  animate(now);
});

window.addEventListener("beforeunload", () => {
  sceneContext.dispose();
});
