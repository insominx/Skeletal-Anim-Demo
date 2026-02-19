export const INTERPOLATION_MODES = Object.freeze({
  STEP: "step",
  LINEAR: "linear",
  SMOOTH: "smooth",
});

export function smoothStep(u) {
  return u * u * (3 - 2 * u);
}

export function interpolateValues(v0, v1, u, mode) {
  if (mode === INTERPOLATION_MODES.STEP) {
    return v0;
  }

  if (mode === INTERPOLATION_MODES.SMOOTH) {
    const eased = smoothStep(u);
    return v0 + eased * (v1 - v0);
  }

  return v0 + u * (v1 - v0);
}
