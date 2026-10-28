import {
  ShieldCheck,
  Wifi,
  WifiOff,
  Cpu,
  Mic,
  MicOff,
  ServerOff,
  Eye,
  Vibrate,
  HardDrive,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/Button';
import { SOUND_CATEGORIES } from '@/audio/soundCategories';
import type { ModelLoadState, ConnectivityState } from '@/types';
import type { SWState } from '@/hooks/usePWAStatus';

interface DiagnosticsScreenProps {
  modelState: ModelLoadState;
  connectivity: ConnectivityState;
  micPermission: PermissionState | 'unknown';
  reducedMotion: boolean;
  offlineReady: boolean;
  swState: SWState;
  swError: string | null;
  needRefresh: boolean;
  onUpdateSW: () => Promise<void>;
}

export function DiagnosticsScreen({
  modelState,
  connectivity,
  micPermission,
  reducedMotion,
  offlineReady,
  swState,
  swError,
  needRefresh,
  onUpdateSW,
}: DiagnosticsScreenProps) {
  const modelReady = modelState.status === 'ready';
  const vibrateSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-7 w-7 text-teal-300" />
        <h1 className="text-2xl font-bold text-slate-50 sm:text-3xl">Privacy & Offline Diagnostics</h1>
      </div>
      <p className="mt-2 text-slate-300">
        Honest status of your device's privacy guarantees, model readiness, and offline capability.
        Nothing is hidden or faked.
      </p>

      {/* Privacy guarantees */}
      <Card title="Privacy guarantees" icon={<ShieldCheck className="h-5 w-5" />} className="mt-8">
        <ul className="space-y-3">
          <Guarantee icon={<ServerOff className="h-5 w-5" />} label="No audio upload">
            Microphone audio is processed locally and never sent to a server.
          </Guarantee>
          <Guarantee icon={<Cpu className="h-5 w-5" />} label="No remote inference">
            All sound recognition runs in your browser. There is no cloud API.
          </Guarantee>
          <Guarantee icon={<ServerOff className="h-5 w-5" />} label="No analytics or telemetry">
            No third-party tracking, analytics, or telemetry is included.
          </Guarantee>
          <Guarantee icon={<HardDrive className="h-5 w-5" />} label="Local history only">
            Event history is stored in this browser's localStorage, with a clear-history option.
          </Guarantee>
        </ul>
      </Card>

      {/* Device capabilities */}
      <Card title="Device capabilities" icon={<Mic className="h-5 w-5" />} className="mt-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Capability
            ok={micPermission === 'granted'}
            warn={micPermission === 'prompt' || micPermission === 'unknown'}
            label="Microphone permission"
            value={
              micPermission === 'granted'
                ? 'Allowed'
                : micPermission === 'denied'
                  ? 'Denied'
                  : 'Not yet requested'
            }
            icon={micPermission === 'granted' ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          />
          <Capability
            ok={modelReady}
            warn={!modelReady}
            label="Local model"
            value={modelReady ? 'Ready' : 'Not loaded yet'}
            icon={<Cpu className="h-4 w-4" />}
          />
          <Capability
            ok={connectivity === 'online'}
            warn={false}
            label="Connection"
            value={connectivity === 'online' ? 'Online' : 'Offline'}
            icon={connectivity === 'online' ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          />
          <Capability
            ok={vibrateSupported}
            warn={!vibrateSupported}
            label="Vibration API"
            value={vibrateSupported ? 'Supported' : 'Not supported'}
            icon={<Vibrate className="h-4 w-4" />}
          />
          <Capability
            ok={!reducedMotion}
            warn={reducedMotion}
            label="Motion preference"
            value={reducedMotion ? 'Reduced motion' : 'Full motion'}
            icon={<Eye className="h-4 w-4" />}
          />
        </div>
      </Card>

      {/* Offline readiness — real SW status */}
      <Card title="Offline readiness" icon={<WifiOff className="h-5 w-5" />} className="mt-6">
        <div className="flex flex-wrap items-center gap-2.5">
          {offlineReady ? (
            <StatusBadge tone="green" label="Offline ready — all assets cached" />
          ) : swState === 'error' ? (
            <StatusBadge tone="red" label="Service worker error" />
          ) : swState === 'idle' || swState === 'registering' ? (
            <StatusBadge tone="amber" label="Registering service worker…" pulse />
          ) : (
            <StatusBadge tone="amber" label="Caching assets…" pulse />
          )}
          <StatusBadge
            tone={connectivity === 'online' ? 'teal' : 'muted'}
            label={connectivity === 'online' ? 'Currently online' : 'Currently offline'}
          />
        </div>

        {/* Detailed status */}
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-center gap-2 text-slate-300">
            {offlineReady ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            ) : swState === 'error' ? (
              <AlertTriangle className="h-4 w-4 text-red-300" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin text-amber-300" />
            )}
            <span>
              {offlineReady
                ? 'Service worker installed. App shell, YAMNet model (4 MB), class map CSV, and WASM runtime are all cached locally.'
                : swState === 'error'
                  ? swError ?? 'Service worker registration failed.'
                  : 'Service worker is downloading and caching the app shell, model, and WASM runtime. Internet is required for this first-time download.'}
            </span>
          </div>
        </div>

        {/* Update prompt */}
        {needRefresh && (
          <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-teal-400/30 bg-teal-500/10 p-3">
            <div className="flex items-center gap-2 text-teal-200">
              <RefreshCw className="h-4 w-4" />
              <p className="text-sm">A new version is available.</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => void onUpdateSW()}>
              <RefreshCw className="h-4 w-4" />
              Update now
            </Button>
          </div>
        )}

        {/* Bundled assets list */}
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
            Bundled assets
          </p>
          <ul className="space-y-1 text-xs text-slate-400">
            <li className="flex items-center gap-2">
              <Download className="h-3 w-3 text-teal-300" />
              YAMNet TFLite model — 4 MB
            </li>
            <li className="flex items-center gap-2">
              <Download className="h-3 w-3 text-teal-300" />
              YAMNet class map CSV — 521 labels
            </li>
            <li className="flex items-center gap-2">
              <Download className="h-3 w-3 text-teal-300" />
              MediaPipe WASM runtime — 6 files
            </li>
            <li className="flex items-center gap-2">
              <Download className="h-3 w-3 text-teal-300" />
              App shell (JS, CSS, HTML, icons)
            </li>
          </ul>
        </div>
      </Card>

      {/* Category readiness */}
      <Card title="Sound category readiness" icon={<Cpu className="h-5 w-5" />} className="mt-6">
        <ul className="space-y-2">
          {SOUND_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <li
                key={cat.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-ink-500/40 bg-ink-600/30 p-3"
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 text-teal-300" />
                  <span className="text-sm text-slate-200">{cat.label}</span>
                </div>
                <StatusBadge
                  tone={
                    cat.status === 'supported'
                      ? 'green'
                      : cat.status === 'experimental'
                        ? 'amber'
                        : 'red'
                  }
                  label={
                    cat.status === 'supported'
                      ? 'Supported'
                      : cat.status === 'experimental'
                        ? 'Experimental'
                        : 'Unsupported'
                  }
                />
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

function Guarantee({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/15 text-teal-300">
        {icon}
      </span>
      <div>
        <p className="font-medium text-slate-100">{label}</p>
        <p className="text-sm text-slate-400">{children}</p>
      </div>
    </li>
  );
}

function Capability({
  ok,
  warn,
  label,
  value,
  icon,
}: {
  ok: boolean;
  warn: boolean;
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  const tone = ok ? 'text-emerald-300' : warn ? 'text-amber-300' : 'text-red-300';
  return (
    <div className="flex items-center gap-3 rounded-lg border border-ink-500/40 bg-ink-600/40 p-3">
      <span className={`${tone}`}>{icon}</span>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className={`text-sm font-medium ${tone}`}>{value}</p>
      </div>
    </div>
  );
}
