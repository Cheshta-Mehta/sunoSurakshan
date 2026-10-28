import type { AlertPriority } from '@/audio/alertEngine';

type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle';

interface BeepConfig {
  freqs: number[];
  duration: number;
  gap: number;
  type: OscillatorType;
  volume: number;
  repeatCount: number;
  pauseBetweenRepeats: number;
}

const PRIORITY_BEEPS: Record<AlertPriority, BeepConfig> = {
  critical: {
    freqs: [880, 1200],
    duration: 180,
    gap: 80,
    type: 'square',
    volume: 0.35,
    repeatCount: 3,
    pauseBetweenRepeats: 250,
  },
  high: {
    freqs: [800, 1000],
    duration: 200,
    gap: 100,
    type: 'square',
    volume: 0.3,
    repeatCount: 2,
    pauseBetweenRepeats: 300,
  },
  medium: {
    freqs: [660],
    duration: 300,
    gap: 150,
    type: 'triangle',
    volume: 0.25,
    repeatCount: 2,
    pauseBetweenRepeats: 400,
  },
  low: {
    freqs: [550],
    duration: 350,
    gap: 200,
    type: 'sine',
    volume: 0.2,
    repeatCount: 1,
    pauseBetweenRepeats: 500,
  },
};

export class AlarmSound {
  private ctx: AudioContext | null = null;
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private playing = false;

  start(priority: AlertPriority): void {
    if (this.playing) return;
    this.playing = true;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    // Resume immediately in case the context starts suspended (autoplay policy).
    // This is triggered from a user-gesture context (alert appears after a user
    // click, or the test-clip flow is user-initiated).
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => undefined);
    }
    this.scheduleLoop(PRIORITY_BEEPS[priority], priority);
  }

  private scheduleLoop(config: BeepConfig, priority: AlertPriority): void {
    if (!this.playing || !this.ctx) return;

    const totalCycleMs = this.playOneCycle(config);

    this.timerId = setTimeout(() => {
      this.scheduleLoop(config, priority);
    }, totalCycleMs + config.pauseBetweenRepeats);
  }

  private playOneCycle(config: BeepConfig): number {
    if (!this.ctx) return 0;

    let elapsed = 0;
    for (let i = 0; i < config.repeatCount; i++) {
      for (const freq of config.freqs) {
        this.playBeep(freq, config.duration, config.type, config.volume);
        elapsed += config.duration + config.gap;
      }
      if (i < config.repeatCount - 1) {
        elapsed += config.pauseBetweenRepeats;
      }
    }
    return elapsed;
  }

  private playBeep(freq: number, durationMs: number, type: OscillatorType, volume: number): void {
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    const now = this.ctx.currentTime;
    const durationSec = durationMs / 1000;
    const attackTime = 0.008;
    const releaseTime = 0.04;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + attackTime);
    gain.gain.setValueAtTime(volume, now + durationSec - releaseTime);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + durationSec);
  }

  stop(): void {
    this.playing = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.ctx) {
      if (this.ctx.state !== 'closed') {
        this.ctx.close().catch(() => undefined);
      }
      this.ctx = null;
    }
  }
}
