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
    .map((keyframe) => `${keyframe.t.toFixed(4)}:${keyframe.v.toFixed(4)}`)
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

function drawBezierHandles(context, channel, layout, selectedKeyframeIndex) {
  if (channel.interpolation !== INTERPOLATION_MODES.SMOOTH) {
    return;
  }

  if (selectedKeyframeIndex == null) {
    return;
  }

  const keyframes = channel.keyframes;
  if (keyframes.length < 2) {
    return;
  }

  const segmentIndices = [];

  if (selectedKeyframeIndex > 0) {
    segmentIndices.push(selectedKeyframeIndex - 1);
  }

  if (selectedKeyframeIndex < keyframes.length - 1) {
    segmentIndices.push(selectedKeyframeIndex);
  }

  const drawKnob = (x, y) => {
    const half = 3.5;
    context.beginPath();
    context.rect(x - half, y - half, half * 2, half * 2);
    context.fillStyle = "rgba(255, 209, 98, 0.85)";
    context.fill();
    context.lineWidth = 1;
    context.strokeStyle = "rgba(255, 209, 98, 0.4)";
    context.stroke();
  };

  segmentIndices.forEach((segIndex) => {
    const left = keyframes[segIndex];
    const right = keyframes[segIndex + 1];
    const segDuration = right.t - left.t;

    const cp1 = { t: left.t + segDuration / 3, v: left.v };
    const cp2 = { t: right.t - segDuration / 3, v: right.v };

    const leftX = layout.timeToX(left.t);
    const leftY = layout.valueToY(left.v);
    const rightX = layout.timeToX(right.t);
    const rightY = layout.valueToY(right.v);
    const cp1X = layout.timeToX(cp1.t);
    const cp1Y = layout.valueToY(cp1.v);
    const cp2X = layout.timeToX(cp2.t);
    const cp2Y = layout.valueToY(cp2.v);

    context.save();
    context.setLineDash([3, 3]);
    context.strokeStyle = "rgba(255, 209, 98, 0.55)";
    context.lineWidth = 1;

    context.beginPath();
    context.moveTo(leftX, leftY);
    context.lineTo(cp1X, cp1Y);
    context.stroke();

    context.beginPath();
    context.moveTo(rightX, rightY);
    context.lineTo(cp2X, cp2Y);
    context.stroke();

    context.restore();

    drawKnob(cp1X, cp1Y);
    drawKnob(cp2X, cp2Y);
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

export function createCurveGraph({ trackElement }) {
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
    drawBezierHandles(staticContext, currentChannel, layout, currentSelectedKeyframeIndex);
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

  resizeObserver.observe(trackElement);
  resizeCanvases();

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
