export type Phase = 'idle' | 'calibrating' | 'monitoring';

export type ConnectivityState = 'online' | 'offline';

export interface AnomalyEvent {
  id: string;
  /** ISO timestamp of the moment the anomaly started. */
  timestamp: string;
  /** Anomaly score at detection (how many "sigmas" away from normal). */
  score: number;
}

export interface Settings {
  /** 1 (relaxed) .. 10 (very sensitive). */
  sensitivity: number;
  soundAlarm: boolean;
  vibration: boolean;
}
