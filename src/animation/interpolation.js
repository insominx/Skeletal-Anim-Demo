export const INTERPOLATION_MODES = Object.freeze({
  STEP: "step",
  LINEAR: "linear",
  SMOOTH: "smooth",
});

export function smoothStep(u) {
  return u * u * (3 - 2 * u);
}

export function cubicHermite(v0, m0, v1, m1, u) {
  const u2 = u * u;
  const u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1;
  const h10 = u3 - 2 * u2 + u;
  const h01 = -2 * u3 + 3 * u2;
  const h11 = u3 - u2;
  return h00 * v0 + h10 * m0 + h01 * v1 + h11 * m1;
}

export function interpolateValues(v0, v1, u, mode, m0 = 0, m1 = 0) {
  if (mode === INTERPOLATION_MODES.STEP) {
    return v0;
  }

  if (mode === INTERPOLATION_MODES.SMOOTH) {
    return cubicHermite(v0, m0, v1, m1, u);
  }

  return v0 + u * (v1 - v0);
}
