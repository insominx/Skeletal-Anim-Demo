export function createOverlayController({ educatorElement, statsElement }) {
  return {
    setEducator(modeMeta) {
      educatorElement.innerHTML = `
        <h2>${modeMeta.concept}</h2>
        <p>${modeMeta.description}</p>
        <p class="guided-step">Guided step: ${modeMeta.guidedStep}</p>
      `;
    },

    setStats({ fps, modeLabel, workText }) {
      statsElement.innerHTML = `
        <div class="stats-row">
          <span class="stats-label">FPS</span>
          <span class="stats-value">${Math.round(fps)}</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">Mode</span>
          <span class="stats-value">${modeLabel}</span>
        </div>
        <div class="stats-row">
          <span class="stats-label">Work</span>
          <span class="stats-value">${workText}</span>
        </div>
      `;
    },
  };
}
