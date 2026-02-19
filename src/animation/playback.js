function positiveModulo(value, modulus) {
  return ((value % modulus) + modulus) % modulus;
}

export class PlaybackController {
  constructor({ duration = 5, initialTime = 0, autoPlay = true } = {}) {
    this.duration = Math.max(0.1, Number(duration));
    this.currentTime = positiveModulo(initialTime, this.duration);
    this.isPlaying = autoPlay;
    this.speed = 1;
  }

  play() {
    this.isPlaying = true;
  }

  pause() {
    this.isPlaying = false;
  }

  toggle() {
    this.isPlaying = !this.isPlaying;
    return this.isPlaying;
  }

  setTime(time) {
    this.currentTime = positiveModulo(time, this.duration);
  }

  step(deltaSeconds) {
    this.setTime(this.currentTime + deltaSeconds);
  }

  tick(deltaSeconds) {
    if (!this.isPlaying) {
      return;
    }

    this.step(deltaSeconds * this.speed);
  }
}
