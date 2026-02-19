import { INTERPOLATION_MODES, interpolateValues } from "./interpolation.js";

const KEYFRAME_EPSILON = 1e-4;

export class Channel {
  constructor({ id, label, keyframes = [], interpolation = INTERPOLATION_MODES.SMOOTH, ui = {} }) {
    this.id = id;
    this.label = label;
    this.keyframes = [...keyframes]
      .map((keyframe) => ({
        t: Number(keyframe.t),
        v: Number(keyframe.v),
        easeOut: Number(keyframe.easeOut ?? 0),
        easeIn: Number(keyframe.easeIn ?? 0),
      }))
      .sort((a, b) => a.t - b.t);
    this.interpolation = interpolation;
    this.ui = {
      min: -1,
      max: 1,
      step: 0.01,
      unit: "",
      ...ui,
    };
  }

  setInterpolation(mode) {
    if (!Object.values(INTERPOLATION_MODES).includes(mode)) {
      return;
    }

    this.interpolation = mode;
  }

  getKeyframe(index) {
    return this.keyframes[index] ?? null;
  }

  addKeyframe(t, v) {
    const time = Number(t);
    const value = Number(v);

    const existingIndex = this.keyframes.findIndex((keyframe) => Math.abs(keyframe.t - time) < KEYFRAME_EPSILON);
    if (existingIndex >= 0) {
      this.keyframes[existingIndex].v = value;
      return existingIndex;
    }

    this.keyframes.push({ t: time, v: value, easeOut: 0, easeIn: 0 });
    this.keyframes.sort((a, b) => a.t - b.t);
    return this.keyframes.findIndex((keyframe) => Math.abs(keyframe.t - time) < KEYFRAME_EPSILON);
  }

  removeKeyframe(index) {
    if (index == null || index < 0 || index >= this.keyframes.length) {
      return;
    }

    this.keyframes.splice(index, 1);
  }

  setKeyframeValue(index, value) {
    if (index == null || index < 0 || index >= this.keyframes.length) {
      return;
    }

    this.keyframes[index].v = Number(value);
  }

  setKeyframeTangents(index, easeOut, easeIn) {
    if (index == null || index < 0 || index >= this.keyframes.length) {
      return;
    }

    if (easeOut != null) {
      this.keyframes[index].easeOut = Number(easeOut);
    }

    if (easeIn != null) {
      this.keyframes[index].easeIn = Number(easeIn);
    }
  }

  findClosestKeyframeIndex(time) {
    if (this.keyframes.length === 0) {
      return null;
    }

    let bestIndex = 0;
    let bestDistance = Math.abs(this.keyframes[0].t - time);

    for (let i = 1; i < this.keyframes.length; i += 1) {
      const distance = Math.abs(this.keyframes[i].t - time);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }

    return bestIndex;
  }

  evaluate(time) {
    if (this.keyframes.length === 0) {
      return 0;
    }

    if (this.keyframes.length === 1) {
      return this.keyframes[0].v;
    }

    const t = Number(time);
    const first = this.keyframes[0];
    const last = this.keyframes[this.keyframes.length - 1];

    if (t <= first.t) {
      return first.v;
    }

    if (t >= last.t) {
      return last.v;
    }

    for (let i = 0; i < this.keyframes.length - 1; i += 1) {
      const left = this.keyframes[i];
      const right = this.keyframes[i + 1];

      if (t >= left.t && t <= right.t) {
        const range = right.t - left.t;
        const u = range <= KEYFRAME_EPSILON ? 0 : (t - left.t) / range;
        return interpolateValues(left.v, right.v, u, this.interpolation, left.easeOut, right.easeIn);
      }
    }

    return last.v;
  }
}
