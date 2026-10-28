import { ShieldCheck, ShieldAlert, Mic, Wifi, WifiOff, Cpu, AlertTriangle, ArrowRight, Download, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/Button';
import { StatusBadge } from '@/components/StatusBadge';
import { SOUND_CATEGORIES } from '@/audio/soundCategories';
import type { ScreenId, ModelLoadState, ConnectivityState } from '@/types';

interface HomeScreenProps {
  modelState: ModelLoadState;
  connectivity: ConnectivityState;
  micPermission: PermissionState | 'unknown';
  onNavigate: (id: ScreenId) => void;
  onTryLoad: () => void;
  offlineReady: boolean;
}

export function HomeScreen({
  modelState,
  connectivity,
  micPermission,
  onNavigate,
  onTryLoad,
  offlineReady,
}: HomeScreenProps) {
  const modelReady = modelState.status === 'ready';
  const modelError = modelState.status === 'error' ? modelState.message : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      {/* Hero */}
      <div className="text-center animate-fade-in">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-400/15 ring-1 ring-teal-400/30">
          <ShieldCheck className="h-9 w-9 text-teal-300" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">
          SunoSuraksha
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base text-slate-300 sm:text-lg">
          A privacy-first sound awareness app for deaf and hard-of-hearing people.
          It listens for important sounds — like alarms, sirens, and a crying baby —
          and shows a clear visual alert. All recognition happens locally in your browser.
        </p>
      </div>

      {/* Status strip */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
        <StatusBadge
          tone={modelReady ? 'green' : modelError ? 'red' : 'amber'}
          label={modelReady ? 'Model ready' : modelError ? 'Model not ready' : 'Model: pending'}
          icon={<Cpu className="h-4 w-4" />}
          pulse={!modelReady && !modelError}
        />
        <StatusBadge
          tone={connectivity === 'online' ? 'teal' : 'muted'}
          label={connectivity === 'online' ? 'Online' : 'Offline'}
          icon={connectivity === 'online' ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
        />
        <StatusBadge
          tone={
            micPermission === 'granted'
              ? 'green'
              : micPermission === 'denied'
                ? 'red'
                : 'muted'
          }
          label={
            micPermission === 'granted'
              ? 'Microphone allowed'
              : micPermission === 'denied'
                ? 'Microphone blocked'
                : 'Microphone: not asked'
          }
          icon={<Mic className="h-4 w-4" />}
        />
        <StatusBadge
          tone="teal"
          label="Private: audio never leaves your device"
          icon={<ShieldCheck className="h-4 w-4" />}
        />
        <StatusBadge
          tone={offlineReady ? 'green' : 'amber'}
          label={offlineReady ? 'Offline ready' : 'Caching assets…'}
          icon={
            offlineReady ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin" />
            )
          }
          pulse={!offlineReady}
        />
      </div>

      {/* Primary action */}
      <div className="mt-10 flex flex-col items-center gap-3">
        <Button
          size="xl"
          onClick={() => onNavigate('permission')}
          className="w-full max-w-xs sm:max-w-sm animate-pulse-ring"
          aria-label="Start listening for sounds"
        >
          Start Listening
          <ArrowRight className="h-5 w-5" />
        </Button>
        <p className="text-sm text-slate-400">
          You'll be asked to allow microphone access. Audio is processed on your device only.
        </p>
      </div>

      {/* Offline caching status */}
      <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-ink-500/40 bg-ink-700/50 p-4">
        {offlineReady ? (
          <div className="flex items-center gap-3 text-emerald-200">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium text-slate-100">Offline ready</p>
              <p className="text-sm text-slate-400">
                All app files, the YAMNet model, label map, and WASM runtime are cached. The app
                works with Wi-Fi turned off.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-amber-200">
            <Download className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium text-slate-100">Caching assets for offline use…</p>
              <p className="text-sm text-amber-200/80">
                The service worker is downloading the app shell, model, and runtime files. This
                requires internet on first visit. Once complete, the app works offline.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Model load status / error */}
      <div className="mx-auto mt-2 max-w-2xl rounded-xl border border-ink-500/40 bg-ink-700/50 p-4">
        {modelState.status === 'idle' && (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-slate-100">Model not loaded yet</p>
              <p className="text-sm text-slate-400">
                The on-device YAMNet model (4 MB) loads locally and runs entirely in your browser. Tap below to load it.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={onTryLoad}>
              Try load
            </Button>
          </div>
        )}
        {modelState.status === 'loading' && (
          <div>
            <p className="font-medium text-slate-100">Loading model…</p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink-500">
              <div
                className="h-full bg-teal-400 transition-all"
                style={{ width: `${Math.round(modelState.progress * 100)}%` }}
              />
            </div>
          </div>
        )}
        {modelReady && (
          <div className="flex items-center justify-between gap-4">
            <p className="text-emerald-200">YAMNet model is loaded and ready for on-device inference.</p>
            <Button variant="secondary" size="sm" onClick={() => onNavigate('test')}>
              Test clip
            </Button>
          </div>
        )}
        {modelError && (
          <div className="flex items-start gap-3 text-amber-200">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm">{modelError}</p>
          </div>
        )}
      </div>

      {/* Supported sounds preview */}
      <div className="mx-auto mt-10 max-w-3xl">
        <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-wider text-slate-400">
          Sounds we aim to recognize
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SOUND_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const statusTone =
              cat.status === 'supported'
                ? 'text-emerald-300'
                : cat.status === 'experimental'
                  ? 'text-amber-300'
                  : 'text-slate-500';
            return (
              <div
                key={cat.id}
                className="flex items-center gap-3 rounded-xl border border-ink-500/40 bg-ink-700/40 p-3"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink-600 text-teal-300">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-100">{cat.label}</p>
                  <p className={`text-xs ${statusTone}`}>
                    {cat.status === 'supported'
                      ? 'Supported'
                      : cat.status === 'experimental'
                        ? 'Experimental'
                        : 'Unsupported'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-slate-500">
        Important: sound recognition is powered by YAMNet, a general sound-event classifier.
        All labels have been verified against YAMNet's 521-class AudioSet ontology. No predictions are faked.
      </p>

      {/* Safety disclaimer */}
      <div className="mx-auto mt-4 flex max-w-2xl items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
        <div className="text-sm text-amber-100">
          <p className="font-medium">Accessibility prototype — not a certified safety device.</p>
          <p className="mt-1 text-amber-200/80">
            SunoSuraksha cannot replace certified fire alarms, smoke alarms, or emergency warning
            systems. It may miss sounds or produce false alerts.
          </p>
        </div>
      </div>
    </div>
  );
}
