import { useEffect, useRef } from 'react';
import { NUM_BANDS } from '@/audio/anomalyDetector';

interface Props {
  spec: React.MutableRefObject<Float32Array[]>;
  tick: number;
  length: number;
}

/** Frequency (low at bottom) x time. Blue = normal, red = far from the learned normal. */
export function Spectrogram({ spec, tick, length }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const g = canvas.getContext('2d');
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const cols = spec.current;
    const cw = w / length;
    const rh = h / NUM_BANDS;
    const offset = length - cols.length;
    cols.forEach((col, i) => {
      for (let b = 0; b < NUM_BANDS; b++) {
        const t = Math.min(1, Math.abs(col[b]) / 6);
        g.fillStyle = `hsl(${220 - 220 * t}, 80%, ${18 + 34 * t}%)`;
        g.fillRect((i + offset) * cw, h - (b + 1) * rh, cw + 0.5, rh + 0.5);
      }
    });
  }, [tick, spec, length]);

  return (
    <canvas
      ref={ref}
      className="h-32 w-full rounded-xl bg-ink-800"
      role="img"
      aria-label="Spectrogram: which frequencies differ from normal over time"
    />
  );
}
