import { INTERPOLATION_MODES } from "../animation/interpolation.js";

const SAMPLE_COUNT = 200;
const RESIZE_DEBOUNCE_MS = 100;

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function numberOr(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function getValueRange(channel) {
  const min = numberOr(channel?.ui?.min, -1);
  const max = numberOr(channel?.ui?.max, 1);

  if (max <= min) {
    return { min, max: min + 1 };
  }

  return { min, max };
}

function buildStaticSignature(channel, duration, selectedKeyframeIndex) {
  if (!channel) {
    return `none|${duration.toFixed(4)}|${selectedKeyframeIndex ?? -1}`;
  }

  const keyframeSignature = channel.keyframes
    .map((keyframe) => `${keyframe.t.toFixed(4)}:${keyframe.v.toFixed(4)}:${(keyframe.easeOut || 0).toFixed(4)}:${(keyframe.easeIn || 0).toFixed(4)}`)
    .join("|");

  const range = getValueRange(channel);

  return [
    duration.toFixed(4),
    channel.interpolation,
    range.min.toFixed(4),
    range.max.toFixed(4),
    selectedKeyframeIndex ?? -1,
    keyframeSignature,
  ].join("::");
}

function createLayout(cssWidth, cssHeight, duration, min, max) {
  const padding = {
    left: 24,
    right: 8,
    top: 8,
    bottom: 10,
  };

  const width = Math.max(1, cssWidth - padding.left - padding.right);
  const height = Math.max(1, cssHeight - padding.top - padding.bottom);
  const valueRange = Math.max(1e-6, max - min);

  return {
    padding,
    width,
    height,
    timeToX(time) {
      const normalized = duration > 0 ? clamp01(time / duration) : 0;
      return padding.left + normalized * width;
    },
    valueToY(value) {
      const normalized = clamp01((value - min) / valueRange);
      return padding.top + (1 - normalized) * height;
    },
    yToValue(y) {
      const normalized = 1 - (y - padding.top) / height;
      return min + normalized * valueRange;
    },
  };
}

function drawAxisHints(context, layout, min, max) {
  const axisEntries = [
    { label: "max", value: max },
    { label: "min", value: min },
  ];

  if (min < 0 && max > 0) {
    axisEntries.push({ label: "0", value: 0 });
  }

  const dedupedEntries = [];

  axisEntries.forEach((entry) => {
    const y = layout.valueToY(entry.value);
    const hasNearby = dedupedEntries.some((existing) => Math.abs(existing.y - y) < 8);

    if (!hasNearby) {
      dedupedEntries.push({ ...entry, y });
    }
  });

  context.save();
  context.setLineDash([4, 4]);
  context.strokeStyle = "rgba(155, 176, 207, 0.15)";
  context.fillStyle = "rgba(155, 176, 207, 0.5)";
  context.font = '9px "Bahnschrift", "Trebuchet MS", "Segoe UI", sans-serif';
  context.textBaseline = "middle";

  dedupedEntries.forEach((entry) => {
    context.beginPath();
    context.moveTo(layout.padding.left, entry.y);
    context.lineTo(layout.padding.left + layout.width, entry.y);
    context.stroke();

    context.fillText(entry.label, 2, entry.y);
  });

  context.restore();
}

function sampleCurve(channel, duration, layout) {
  const samples = [];

  for (let i = 0; i < SAMPLE_COUNT; i += 1) {
    const normalized = SAMPLE_COUNT === 1 ? 0 : i / (SAMPLE_COUNT - 1);
    const t = normalized * duration;
    const value = channel.evaluate(t);

    samples.push({
      x: layout.timeToX(t),
      y: layout.valueToY(value),
    });
  }

  return samples;
}

function drawCurve(context, samples, layout) {
  if (samples.length === 0) {
    return;
  }

  const curvePath = new Path2D();
  const fillPath = new Path2D();

  samples.forEach((point, index) => {
    if (index === 0) {
      curvePath.moveTo(point.x, point.y);
      fillPath.moveTo(point.x, layout.padding.top + layout.height);
      fillPath.lineTo(point.x, point.y);
      return;
    }

    curvePath.lineTo(point.x, point.y);
    fillPath.lineTo(point.x, point.y);
  });

  const lastPoint = samples[samples.length - 1];
  fillPath.lineTo(lastPoint.x, layout.padding.top + layout.height);
  fillPath.closePath();

  context.save();
  context.fillStyle = "rgba(94, 198, 255, 0.08)";
  context.fill(fillPath);

  context.strokeStyle = "rgba(94, 198, 255, 0.7)";
  context.lineWidth = 2;
  context.lineJoin = "round";
  context.lineCap = "round";
  context.stroke(curvePath);
  context.restore();
}

function getHandlePositions(channel, selectedKeyframeIndex, layout) {
  if (channel.interpolation !== INTERPOLATION_MODES.SMOOTH || selectedKeyframeIndex == null) {
    return [];
  }

  const keyframes = channel.keyframes;
  if (keyframes.length < 2) {
    return [];
  }

  const segmentIndices = [];
  if (selectedKeyframeIndex > 0) segmentIndices.push(selectedKeyframeIndex - 1);
  if (selectedKeyframeIndex < keyframes.length - 1) segmentIndices.push(selectedKeyframeIndex);

  const handles = [];

  segmentIndices.forEach((segIndex) => {
    const left = keyframes[segIndex];
    const right = keyframes[segIndex + 1];
    const segDuration = right.t - left.t;

    const cp1V = left.v + (left.easeOut || 0) * (segDuration / 3);
    handles.push({
      id: `out-${segIndex}`,
      type: "handle-out",
      index: segIndex,
      v: cp1V,
      dt: segDuration / 3,
      refV: left.v,
      x: layout.timeToX(left.t + segDuration / 3),
      y: layout.valueToY(cp1V),
      anchorX: layout.timeToX(left.t),
      anchorY: layout.valueToY(left.v),
    });

    const cp2V = right.v - (right.easeIn || 0) * (segDuration / 3);
    handles.push({
      id: `in-${segIndex + 1}`,
      type: "handle-in",
      index: segIndex + 1,
      v: cp2V,
      dt: segDuration / 3,
      refV: right.v,
      x: layout.timeToX(right.t - segDuration / 3),
      y: layout.valueToY(cp2V),
      anchorX: layout.timeToX(right.t),
      anchorY: layout.valueToY(right.v),
    });
  });

  return handles;
}

function drawBezierHandles(context, channel, layout, selectedKeyframeIndex, activeHandleId = null) {
  const handles = getHandlePositions(channel, selectedKeyframeIndex, layout);

  if (handles.length === 0) return;

  handles.forEach((handle) => {
    context.save();
    context.setLineDash([3, 3]);
    context.strokeStyle = "rgba(255, 209, 98, 0.55)";
    context.lineWidth = 1;

    context.beginPath();
    context.moveTo(handle.anchorX, handle.anchorY);
    context.lineTo(handle.x, handle.y);
    context.stroke();
    context.restore();

    const isHovered = handle.id === activeHandleId;
    const half = isHovered ? 4.5 : 3.5;
    context.beginPath();
    context.rect(handle.x - half, handle.y - half, half * 2, half * 2);
    context.fillStyle = isHovered ? "rgba(255, 230, 150, 0.95)" : "rgba(255, 209, 98, 0.85)";
    context.fill();
    context.lineWidth = 1;
    context.strokeStyle = isHovered ? "rgba(255, 230, 150, 0.8)" : "rgba(255, 209, 98, 0.4)";
    context.stroke();
  });
}

function drawKeyframeDots(context, channel, layout, selectedKeyframeIndex) {
  channel.keyframes.forEach((keyframe, index) => {
    const x = layout.timeToX(keyframe.t);
    const y = layout.valueToY(keyframe.v);
    const isSelected = index === selectedKeyframeIndex;

    context.beginPath();
    context.arc(x, y, isSelected ? 4.5 : 3.5, 0, Math.PI * 2);
    context.fillStyle = isSelected ? "rgba(255, 209, 98, 0.95)" : "rgba(115, 179, 255, 0.9)";
    context.fill();

    if (isSelected) {
      context.lineWidth = 1.5;
      context.strokeStyle = "rgba(255, 209, 98, 0.45)";
      context.stroke();
    }
  });
}

export function createCurveGraph({ trackElement, onKeyframeValueDrag, onKeyframeTangentDrag }) {
  const canvas = document.createElement("canvas");
  canvas.className = "curve-canvas";
  canvas.setAttribute("aria-hidden", "true");
  trackElement.prepend(canvas);

  const context = canvas.getContext("2d");

  const staticCanvas = document.createElement("canvas");
  const staticContext = staticCanvas.getContext("2d");

  let cssWidth = 1;
  let cssHeight = 1;
  let pixelRatio = window.devicePixelRatio || 1;
  let resizeTimer = null;

  let currentChannel = null;
  let currentDuration = 3;
  let currentTime = 0;
  let currentSelectedKeyframeIndex = null;

  let staticSignature = "";
  let needsStaticRedraw = true;

  function resizeCanvases() {
    const rect = trackElement.getBoundingClientRect();
    cssWidth = Math.max(1, Math.round(rect.width));
    cssHeight = Math.max(1, Math.round(rect.height));
    pixelRatio = window.devicePixelRatio || 1;

    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    canvas.width = Math.round(cssWidth * pixelRatio);
    canvas.height = Math.round(cssHeight * pixelRatio);

    staticCanvas.width = Math.round(cssWidth * pixelRatio);
    staticCanvas.height = Math.round(cssHeight * pixelRatio);

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    staticContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    needsStaticRedraw = true;
    render();
  }

  function drawStaticLayer() {
    staticContext.clearRect(0, 0, cssWidth, cssHeight);

    if (!currentChannel) {
      return;
    }

    const valueRange = getValueRange(currentChannel);
    const layout = createLayout(cssWidth, cssHeight, currentDuration, valueRange.min, valueRange.max);

    drawAxisHints(staticContext, layout, valueRange.min, valueRange.max);

    const samples = sampleCurve(currentChannel, currentDuration, layout);
    drawCurve(staticContext, samples, layout);
    drawKeyframeDots(staticContext, currentChannel, layout, currentSelectedKeyframeIndex);
    drawBezierHandles(staticContext, currentChannel, layout, currentSelectedKeyframeIndex, currentHoverId);
  }

  function drawPlayheadValueDot() {
    if (!currentChannel) {
      return;
    }

    const valueRange = getValueRange(currentChannel);
    const layout = createLayout(cssWidth, cssHeight, currentDuration, valueRange.min, valueRange.max);
    const evaluatedValue = currentChannel.evaluate(currentTime);
    const x = layout.timeToX(currentTime);
    const y = layout.valueToY(evaluatedValue);

    context.beginPath();
    context.arc(x, y, 4, 0, Math.PI * 2);
    context.fillStyle = "#fef4ad";
    context.fill();
    context.lineWidth = 1;
    context.strokeStyle = "rgba(255, 180, 106, 0.7)";
    context.stroke();
  }

  function render() {
    const nextSignature = buildStaticSignature(currentChannel, currentDuration, currentSelectedKeyframeIndex);

    if (needsStaticRedraw || nextSignature !== staticSignature) {
      drawStaticLayer();
      staticSignature = nextSignature;
      needsStaticRedraw = false;
    }

    context.clearRect(0, 0, cssWidth, cssHeight);
    context.drawImage(staticCanvas, 0, 0, cssWidth, cssHeight);
    drawPlayheadValueDot();
  }

  const resizeObserver = new ResizeObserver(() => {
    if (resizeTimer != null) {
      window.clearTimeout(resizeTimer);
    }

    resizeTimer = window.setTimeout(() => {
      resizeCanvases();
      resizeTimer = null;
    }, RESIZE_DEBOUNCE_MS);
  });

  let currentHoverId = null;

  resizeObserver.observe(trackElement);
  resizeCanvases();

  function getHitTarget(clientX, clientY) {
    if (!currentChannel) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const valueRange = getValueRange(currentChannel);
    const layout = createLayout(cssWidth, cssHeight, currentDuration, valueRange.min, valueRange.max);

    const hitDist = 12;

    const handles = getHandlePositions(currentChannel, currentSelectedKeyframeIndex, layout);
    for (const handle of handles) {
      if (Math.abs(x - handle.x) <= hitDist && Math.abs(y - handle.y) <= hitDist) {
        return handle;
      }
    }

    const keyframes = currentChannel.keyframes;
    if (currentSelectedKeyframeIndex != null && currentSelectedKeyframeIndex < keyframes.length) {
      const selectedKeyframe = keyframes[currentSelectedKeyframeIndex];
      const px = layout.timeToX(selectedKeyframe.t);
      const py = layout.valueToY(selectedKeyframe.v);
      if (Math.abs(x - px) <= hitDist && Math.abs(y - py) <= hitDist) {
        return { type: "keyframe", index: currentSelectedKeyframeIndex };
      }
    }

    for (let i = 0; i < keyframes.length; i++) {
      if (i === currentSelectedKeyframeIndex) continue;
      const kf = keyframes[i];
      const px = layout.timeToX(kf.t);
      const py = layout.valueToY(kf.v);
      if (Math.abs(x - px) <= hitDist && Math.abs(y - py) <= hitDist) {
        return { type: "keyframe", index: i };
      }
    }

    return null;
  }

  function pixelToValue(y) {
    if (!currentChannel) return 0;
    const valueRange = getValueRange(currentChannel);
    const layout = createLayout(cssWidth, cssHeight, currentDuration, valueRange.min, valueRange.max);
    const normalized = 1 - (y - layout.padding.top) / layout.height;
    return valueRange.min + normalized * (valueRange.max - valueRange.min);
  }

  let activeDragTarget = null;

  canvas.addEventListener("pointerdown", (e) => {
    activeDragTarget = getHitTarget(e.clientX, e.clientY);
    if (activeDragTarget) {
      e.stopPropagation();
      canvas.setPointerCapture(e.pointerId);
    }
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!activeDragTarget) {
      const hoverTarget = getHitTarget(e.clientX, e.clientY);
      const isHandle = hoverTarget?.type.startsWith("handle");
      canvas.style.cursor = isHandle ? "ns-resize" : (hoverTarget ? "pointer" : "default");

      const newHoverId = isHandle ? hoverTarget.id : null;
      if (newHoverId !== currentHoverId) {
        currentHoverId = newHoverId;
        needsStaticRedraw = true;
        render();
      }
      return;
    }

    e.stopPropagation();
    const rect = canvas.getBoundingClientRect();
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    // Use the layout method extracted earlier
    const valueRange = getValueRange(currentChannel);
    const layout = createLayout(cssWidth, cssHeight, currentDuration, valueRange.min, valueRange.max);
    const newValue = layout.yToValue(y);

    if (activeDragTarget.type === "keyframe") {
      onKeyframeValueDrag?.(activeDragTarget.index, newValue);
    } else if (activeDragTarget.type === "handle-out") {
      const m = (newValue - activeDragTarget.refV) / activeDragTarget.dt;
      onKeyframeTangentDrag?.(activeDragTarget.index, m, null);
    } else if (activeDragTarget.type === "handle-in") {
      const m = (activeDragTarget.refV - newValue) / activeDragTarget.dt;
      onKeyframeTangentDrag?.(activeDragTarget.index, null, m);
    }
  });

  const clearDrag = (e) => {
    if (activeDragTarget) {
      e.stopPropagation();
      canvas.releasePointerCapture(e.pointerId);
      activeDragTarget = null;
    }
  };

  canvas.addEventListener("pointerup", clearDrag);
  canvas.addEventListener("pointercancel", clearDrag);

  return {
    update(channel, duration, currentTimeValue, selectedKeyframeIndex) {
      currentChannel = channel ?? null;
      currentDuration = Math.max(0.1, numberOr(duration, 3));
      currentTime = numberOr(currentTimeValue, 0);
      currentSelectedKeyframeIndex = selectedKeyframeIndex;
      render();
    },
  };
}
