import { useEffect, useRef } from 'react';

interface Props {
  history: React.MutableRefObject<number[]>;
  tick: number;
  threshold: number;
  length: number;
  alert: boolean;
}

/** Live scrolling graph of the anomaly score with the alarm threshold line. */
export function LiveGraph({ history, tick, threshold, length, alert }: Props) {
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

    const data = history.current;
    const yMax = Math.max(threshold * 1.8, ...data, 1);
    const y = (v: number) => h - 6 - (Math.min(v, yMax) / yMax) * (h - 12);
    const x = (i: number) => ((i + (length - data.length)) / (length - 1)) * w;

    // threshold line
    g.strokeStyle = 'rgba(245,158,11,0.8)';
    g.setLineDash([6, 4]);
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(0, y(threshold));
    g.lineTo(w, y(threshold));
    g.stroke();
    g.setLineDash([]);

    if (data.length < 2) return;
    // filled area + line
    g.beginPath();
    g.moveTo(x(0), h);
    data.forEach((v, i) => g.lineTo(x(i), y(v)));
    g.lineTo(x(data.length - 1), h);
    g.closePath();
    g.fillStyle = alert ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.18)';
    g.fill();

    g.beginPath();
    data.forEach((v, i) => (i === 0 ? g.moveTo(x(i), y(v)) : g.lineTo(x(i), y(v))));
    g.strokeStyle = alert ? '#ef4444' : '#22c55e';
    g.lineWidth = 2.5;
    g.lineJoin = 'round';
    g.stroke();
  }, [tick, history, threshold, length, alert]);

  return (
    <canvas
      ref={ref}
      className="h-48 w-full rounded-xl bg-ink-800"
      role="img"
      aria-label="Live graph of how different the current sound is from normal"
    />
  );
}
