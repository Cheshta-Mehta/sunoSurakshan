import { Mic, MicOff, ShieldCheck, Cpu, Wifi, WifiOff, ArrowRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/Button';
import { StatusBadge } from '@/components/StatusBadge';
import type { ModelLoadState, ConnectivityState, ScreenId } from '@/types';

interface PermissionScreenProps {
  modelState: ModelLoadState;
  connectivity: ConnectivityState;
  micPermission: PermissionState | 'unknown';
  onRequestMic: () => void;
  onNavigate: (id: ScreenId) => void;
  offlineReady: boolean;
}

export function PermissionScreen({
  modelState,
  connectivity,
  micPermission,
  onRequestMic,
  onNavigate,
  offlineReady,
}: PermissionScreenProps) {
  const modelReady = modelState.status === 'ready';
  const modelError = modelState.status === 'error' ? modelState.message : null;
  const micGranted = micPermission === 'granted';
  const micDenied = micPermission === 'denied';

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-bold text-slate-50 sm:text-3xl">Microphone & Model Setup</h1>
      <p className="mt-2 text-slate-300">
        Before listening begins, we need your microphone permission and the local sound
        recognition model must be ready. Everything runs on your device — no audio is uploaded.
      </p>

      <div className="mt-8 space-y-5">
        {/* Step 1: microphone */}
        <SetupStep
          number={1}
          title="Microphone permission"
          icon={micGranted ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          tone={micGranted ? 'green' : micDenied ? 'red' : 'amber'}
          status={
            micGranted
              ? 'Permission granted'
              : micDenied
                ? 'Permission denied'
                : 'Permission not yet requested'
          }
        >
          {micDenied ? (
            <div className="flex items-start gap-3 text-amber-200">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="text-sm">
                <p>Microphone access is blocked. You'll need to allow it in your browser settings to continue.</p>
                <Button variant="secondary" size="sm" className="mt-3" onClick={onRequestMic}>
                  Request again
                </Button>
              </div>
            </div>
          ) : micGranted ? (
            <p className="text-sm text-slate-300">Your microphone is ready. No audio leaves this device.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={onRequestMic}>
                <Mic className="h-4 w-4" />
                Allow microphone
              </Button>
              <p className="text-sm text-slate-400">We only listen while you actively use the app.</p>
            </div>
          )}
        </SetupStep>

        {/* Step 2: model */}
        <SetupStep
          number={2}
          title="Local sound recognition model"
          icon={<Cpu className="h-5 w-5" />}
          tone={modelReady ? 'green' : modelError ? 'red' : 'amber'}
          status={
            modelReady ? 'Model ready' : modelError ? 'Model not ready' : 'Model: not loaded yet'
          }
        >
          {modelReady ? (
            <p className="text-sm text-emerald-200">The YAMNet model is loaded locally and ready.</p>
          ) : modelError ? (
            <div className="flex items-start gap-3 text-amber-200">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm">{modelError}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              The YAMNet model (4 MB) and its 521-class label map are bundled locally. Tap "Try load" on the Home screen to initialize the on-device classifier.
            </p>
          )}
        </SetupStep>

        {/* Step 3: offline readiness */}
        <SetupStep
          number={3}
          title="Offline readiness"
          icon={connectivity === 'online' ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
          tone={offlineReady ? 'green' : 'amber'}
          status={offlineReady ? 'Offline ready' : 'Caching assets…'}
        >
          <p className="text-sm text-slate-400">
            {offlineReady
              ? 'All assets — app shell, YAMNet model, class map, and WASM runtime — are cached by the service worker. The app works with Wi-Fi turned off.'
              : 'The service worker is caching the app shell, model, and WASM runtime. Internet is required for this first-time download. Once complete, the app works offline.'}
          </p>
          <div className="mt-3">
            <StatusBadge
              tone={connectivity === 'online' ? 'teal' : 'muted'}
              label={connectivity === 'online' ? 'Online now' : 'Offline now'}
            />
          </div>
        </SetupStep>
      </div>

      {/* Go to listening */}
      <div className="mt-10 flex items-center justify-between gap-4 rounded-2xl border border-ink-500/40 bg-ink-700/50 p-5">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-teal-300" />
          <div>
            <p className="font-medium text-slate-100">Ready to listen?</p>
            <p className="text-sm text-slate-400">
              You can open the listening dashboard now. Load the model from the Home screen first to enable real-time alerts.
            </p>
          </div>
        </div>
        <Button onClick={() => onNavigate('listening')}>
          Go to dashboard
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface SetupStepProps {
  number: number;
  title: string;
  icon: React.ReactNode;
  tone: 'green' | 'amber' | 'red';
  status: string;
  children: React.ReactNode;
}

function SetupStep({ number, title, icon, tone, status, children }: SetupStepProps) {
  const toneRing =
    tone === 'green'
      ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300'
      : tone === 'red'
        ? 'border-red-400/40 bg-red-500/10 text-red-300'
        : 'border-amber-400/40 bg-amber-500/10 text-amber-300';
  return (
    <section className="rounded-2xl border border-ink-500/40 bg-ink-700/50 p-5">
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg border ${toneRing}`}>
          {icon}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Step {number}
            </span>
            <span className={`text-xs font-medium ${toneRing.split(' ').pop()}`}>{status}</span>
          </div>
          <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
        </div>
      </div>
      <div className="mt-4 pl-1">{children}</div>
    </section>
  );
}
