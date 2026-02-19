import { createCurveGraph } from "./curveGraph.js";

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function formatTime(seconds) {
  const clamped = Math.max(0, Number(seconds) || 0);
  return `${clamped.toFixed(2).padStart(5, "0")}s`;
}

export function createTimelineUI({
  container,
  onTogglePlay,
  onScrub,
  onAddKeyframe,
  onDeleteKeyframe,
  onSelectKeyframe,
  onKeyframeValueDrag,
  onKeyframeTangentDrag,
}) {
  container.innerHTML = `
    <div class="timeline-inner">
      <div class="timeline-top-bar">
        <div class="timeline-transport">
          <button class="transport-button" data-role="play-toggle" type="button" aria-label="Pause">❚❚</button>
          <div class="time-badge">
            <span class="badge-label">Current Time</span>
            <span class="badge-value" data-role="time-value">00.00s</span>
          </div>
        </div>
        <div class="timeline-actions">
          <button type="button" data-role="add-keyframe">Add Key</button>
          <button type="button" data-role="delete-keyframe" class="danger">Delete</button>
        </div>
      </div>

      <div class="timeline-track-zone">
        <div class="timeline-track" data-role="track" role="slider" aria-label="Animation timeline">
          <div class="timeline-keyframe-layer" data-role="markers"></div>
          <div class="timeline-playhead" data-role="playhead"></div>
          <div class="timeline-domain" data-role="domain"></div>
        </div>
      </div>
    </div>
  `;

  const playToggle = container.querySelector('[data-role="play-toggle"]');
  const timeValue = container.querySelector('[data-role="time-value"]');
  const track = container.querySelector('[data-role="track"]');
  const markerLayer = container.querySelector('[data-role="markers"]');
  const playhead = container.querySelector('[data-role="playhead"]');
  const domain = container.querySelector('[data-role="domain"]');
  const addButton = container.querySelector('[data-role="add-keyframe"]');
  const deleteButton = container.querySelector('[data-role="delete-keyframe"]');
  const curveGraph = createCurveGraph({
    trackElement: track,
    onKeyframeValueDrag,
    onKeyframeTangentDrag,
  });

  let duration = 3;
  let keyframes = [];
  let selectedIndex = null;
  let currentTime = 0;
  let isPlaying = true;
  let isDragging = false;

  const renderDomain = () => {
    const ticks = 4;
    const labels = [];
    for (let i = 0; i <= ticks; i += 1) {
      const t = (duration * i) / ticks;
      labels.push(`<span>${t.toFixed(1)}s</span>`);
    }
    domain.innerHTML = labels.join("");
  };

  const timeToPercent = (time) => {
    if (duration <= 0) {
      return 0;
    }
    return clamp01(time / duration) * 100;
  };

  const updatePlaybackUI = () => {
    playhead.style.left = `calc(24px + ${timeToPercent(currentTime)}% * (100% - 32px) / 100%)`;
    timeValue.textContent = formatTime(currentTime);
    playToggle.textContent = isPlaying ? "❚❚" : "▶";
    playToggle.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
  };

  const renderMarkers = () => {
    markerLayer.innerHTML = "";

    keyframes.forEach((keyframe, index) => {
      const marker = document.createElement("button");
      marker.type = "button";
      marker.className = `timeline-marker${index === selectedIndex ? " selected" : ""}`;
      marker.style.left = `calc(24px + ${timeToPercent(keyframe.t)}% * (100% - 32px) / 100%)`;
      marker.title = `Keyframe @ ${keyframe.t.toFixed(2)}s`;
      marker.ariaLabel = `Select keyframe ${index + 1}`;
      marker.addEventListener("click", (event) => {
        event.stopPropagation();
        currentTime = keyframe.t;
        updatePlaybackUI();
        onSelectKeyframe?.(index);
        onScrub?.(keyframe.t);
      });
      markerLayer.appendChild(marker);
    });
  };

  const scrubFromPointer = (event) => {
    const rect = track.getBoundingClientRect();
    const paddingLeft = 24;
    const paddingRight = 8;
    const usableWidth = Math.max(1, rect.width - paddingLeft - paddingRight);
    const ratio = clamp01((event.clientX - rect.left - paddingLeft) / usableWidth);
    currentTime = ratio * duration;
    updatePlaybackUI();
    onScrub?.(currentTime);
  };

  track.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".timeline-marker")) {
      return;
    }

    isDragging = true;
    track.setPointerCapture(event.pointerId);
    scrubFromPointer(event);
  });

  track.addEventListener("pointermove", (event) => {
    if (!isDragging) {
      return;
    }

    scrubFromPointer(event);
  });

  track.addEventListener("pointerup", () => {
    isDragging = false;
  });

  track.addEventListener("pointercancel", () => {
    isDragging = false;
  });

  playToggle.addEventListener("click", () => {
    onTogglePlay?.();
  });

  addButton.addEventListener("click", () => {
    onAddKeyframe?.();
  });

  deleteButton.addEventListener("click", () => {
    onDeleteKeyframe?.();
  });

  renderDomain();
  updatePlaybackUI();

  return {
    setKeyframeState({ duration: nextDuration, keyframes: nextKeyframes, selectedKeyframeIndex, canDelete }) {
      duration = Math.max(0.1, Number(nextDuration) || 3);
      keyframes = Array.isArray(nextKeyframes) ? nextKeyframes : [];
      selectedIndex = selectedKeyframeIndex;
      deleteButton.disabled = !canDelete;
      renderDomain();
      renderMarkers();
      updatePlaybackUI();
    },

    setCurveState({
      channel,
      duration: nextDuration,
      currentTime: nextCurrentTime,
      selectedKeyframeIndex,
    }) {
      if (selectedKeyframeIndex !== undefined) {
        selectedIndex = selectedKeyframeIndex;
      }

      if (nextDuration !== undefined) {
        duration = Math.max(0.1, Number(nextDuration) || duration);
      }

      if (nextCurrentTime !== undefined) {
        currentTime = Number(nextCurrentTime) || 0;
      }

      curveGraph.update(channel, duration, currentTime, selectedIndex);
    },

    setPlaybackState({ currentTime: nextCurrentTime, isPlaying: nextIsPlaying }) {
      currentTime = Number(nextCurrentTime) || 0;
      isPlaying = Boolean(nextIsPlaying);
      updatePlaybackUI();
    },
  };
}
