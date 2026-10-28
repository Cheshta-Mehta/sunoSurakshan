export type Phase = 'idle' | 'calibrating' | 'monitoring';
export type ConnectivityState = 'online' | 'offline';
export type Severity = 'normal' | 'warning' | 'critical';
export type Sector = 'factory' | 'energy' | 'medical' | 'rail';

export interface StoredBaseline {
  mean: number[];
  std: number[];
}

export interface MachineProfile {
  id: string;
  name: string;
  sector: Sector;
  baseline: StoredBaseline | null;
  createdAt: string;
}

export interface AnomalyEvent {
  id: string;
  /** ISO timestamp of the moment the anomaly started. */
  timestamp: string;
  score: number;
  machineId: string;
  machineName: string;
  severity: Severity;
  kind: 'abnormal' | 'silence';
  /** Human readable fault hint (which frequency band changed). */
  hint: string;
  acknowledgedAt?: string;
}

export interface Settings {
  /** 1 (relaxed) .. 10 (very sensitive). */
  sensitivity: number;
  soundAlarm: boolean;
  vibration: boolean;
  /** Alarm stays (and re-beeps) until acknowledged. Always on for medical machines. */
  strictMode: boolean;
  /** Learning time in seconds. */
  calibrationSec: number;
}
