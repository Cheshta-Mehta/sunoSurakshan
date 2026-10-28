import { Activity, Play, Pause, Square, Cpu, AlertTriangle, Radio, Mic, MicOff, Clock, Gauge, XCircle, Volume2 } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { SOUND_CATEGORIES, matchCategory } from '@/audio/soundCategories';
import { ALERT_CONFIGS, getPriority, getConfirmCount, type AlertPriority } from '@/audio/alertEngine';
import type { ModelLoadState, Prediction, SoundSettings } from '@/types';
import type { MicState, LiveInferenceDiagnostics } from '@/hooks/useLiveInference';

interface ListeningScreenProps {
  modelState: ModelLoadState;
  micState: MicState;
  diagnostics: LiveInferenceDiagnostics;
  latestPredictions: Prediction[];
  settings: SoundSettings;
  alertStatus: string | null;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

const priorityColors: Record<AlertPriority, string> = {
  critical: 'text-red-300',
  high: 'text-amber-300',
  medium: 'text-cyan-300',
  low: 'text-teal-300',
};

const priorityLabels: Record<AlertPriority, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export function ListeningScreen({
  modelState,
  micState,
  diagnostics,
  latestPredictions,
  settings,
  alertStatus,
  onStart,
  onPause,
  onResume,
  onStop,
}: ListeningScreenProps) {
  const modelReady = modelState.status === 'ready';
  const modelError = modelState.status === 'error' ? modelState.message : null;
  const isActive = micState === 'active';
  const isPaused = micState === 'paused';
  const isError = micState === 'error';
  const isIdle = micState === 'idle';

  const listening = isActive || isPaused;

  const supportedPredictions = latestPredictions.filter((p) => {
    if (!p.label) return false;
    const cat = matchCategory(p.label, p.score, settings.thresholds);
    return cat && cat.status === 'supported' && (settings.enabled[cat.id] ?? true);
  });

  const topSupported = supportedPredictions.slice(0, 5);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <div className="flex items-center gap-3">
        <Activity className="h-7 w-7 text-teal-300" />
        <h1 className="text-2xl font-bold text-slate-50 sm:text-3xl">Live Listening Dashboard</h1>
      </div>
      <p className="mt-2 text-slate-300">
        Real-time local inference on your microphone audio. The YAMNet model runs entirely in your
        browser — no audio is uploaded or saved.
      </p>

      {/* Big listening status */}
      <div className="mt-8 flex flex-col items-center">
        <div
          className={`relative flex h-40 w-40 items-center justify-center rounded-full border-2 transition-colors ${
            isActive
              ? 'border-teal-400 bg-teal-400/10 shadow-glow'
              : isPaused
                ? 'border-amber-400 bg-amber-400/10'
                : isError
                  ? 'border-red-400 bg-red-400/10'
                  : 'border-ink-400 bg-ink-700/50'
          }`}
          aria-live="polite"
        >
          {isActive ? (
            <>
              <span className="absolute inset-0 animate-pulse-ring rounded-full border-2 border-teal-400/50" />
              <Radio className="h-16 w-16 text-teal-300" />
            </>
          ) : isPaused ? (
            <Pause className="h-16 w-16 text-amber-300" />
          ) : isError ? (
            <XCircle className="h-16 w-16 text-red-300" />
          ) : (
            <Activity className="h-16 w-16 text-slate-500" />
          )}
        </div>
        <p className="mt-4 text-lg font-semibold text-slate-100" role="status">
          {isActive ? 'Listening…' : isPaused ? 'Paused' : isError ? 'Error' : 'Not listening'}
        </p>
        {alertStatus && (
          <p className="mt-1 text-sm text-amber-200" role="status">{alertStatus}</p>
        )}
      </div>

      {/* Model status gate */}
      <div className="mt-8 rounded-2xl border border-ink-500/40 bg-ink-700/50 p-5">
        {!modelReady && (
          <div className="flex items-start gap-3 text-amber-200">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Load the model to start live inference.</p>
              <p className="mt-1 text-amber-200/80">
                The YAMNet model is bundled locally but hasn't been loaded yet. Go to the Home screen
                and tap "Try load" to initialize it.
              </p>
              {modelError && <p className="mt-2 text-red-200">{modelError}</p>}
            </div>
          </div>
        )}
        {modelReady && (
          <div className="flex items-center gap-2 text-emerald-200">
            <Cpu className="h-5 w-5" />
            <p className="text-sm font-medium">Model ready — local inference active when listening.</p>
          </div>
        )}
        {isError && diagnostics.error && (
          <div className="mt-3 flex items-start gap-3 text-red-200">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm">{diagnostics.error}</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {isIdle || isError ? (
          <Button
            size="lg"
            variant="primary"
            onClick={onStart}
            disabled={!modelReady}
            aria-label="Start listening"
          >
            <Play className="h-5 w-5" />
            Start listening
          </Button>
        ) : isActive ? (
          <Button size="lg" variant="secondary" onClick={onPause} aria-label="Pause listening">
            <Pause className="h-5 w-5" />
            Pause
          </Button>
        ) : isPaused ? (
          <Button size="lg" variant="primary" onClick={onResume} aria-label="Resume listening">
            <Play className="h-5 w-5" />
            Resume
          </Button>
        ) : null}
        <Button
          size="lg"
          variant="danger"
          onClick={onStop}
          disabled={!listening}
          aria-label="Stop listening"
        >
          <Square className="h-5 w-5" />
          Stop
        </Button>
      </div>

      {isPaused && (
        <p className="mt-3 text-center text-xs text-slate-400">
          Microphone stays active during pause — inference is temporarily suspended.
        </p>
      )}

      {/* Live predictions */}
      {listening && (
        <Card title="Live predictions" icon={<Volume2 className="h-5 w-5" />} className="mt-6">
          {topSupported.length > 0 ? (
            <ul className="space-y-2" aria-live="polite">
              {topSupported.map((pred, i) => {
                const cat = matchCategory(pred.label, pred.score, settings.thresholds);
                if (!cat) return null;
                const Icon = cat.icon;
                const priority = getPriority(cat.id);
                return (
                  <li
                    key={`${pred.label}-${i}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-ink-500/40 bg-ink-600/30 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-700 text-teal-300">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="font-medium text-slate-100">{cat.label}</p>
                        <p className="text-xs text-slate-400">
                          <span className="font-mono">{pred.label}</span> · {priorityLabels[priority]} priority
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 overflow-hidden rounded-full bg-ink-500">
                        <div
                          className="h-full rounded-full bg-teal-400"
                          style={{ width: `${Math.round(pred.score * 100)}%` }}
                        />
                      </div>
                      <span className="w-12 text-right text-sm font-mono text-slate-300">
                        {(pred.score * 100).toFixed(1)}%
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center py-6 text-center text-slate-400">
              <Activity className="mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm">
                {isActive
                  ? 'Listening… no supported sound detected above threshold yet.'
                  : 'Inference paused.'}
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Raw model output */}
      {listening && latestPredictions.length > 0 && (
        <Card title="Raw model output (top 5)" icon={<Gauge className="h-5 w-5" />} className="mt-6">
          <ul className="space-y-1.5">
            {latestPredictions.slice(0, 5).map((pred, i) => {
              const cat = matchCategory(pred.label, pred.score, settings.thresholds);
              const isSupported = cat && cat.status === 'supported';
              return (
                <li key={`raw-${i}`} className="flex items-center justify-between gap-2 text-xs">
                  <span className={`font-mono ${isSupported ? 'text-slate-200' : 'text-slate-500'}`}>
                    {pred.label || '(empty)'}
                  </span>
                  <span className="font-mono text-slate-400">{(pred.score * 100).toFixed(1)}%</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* Diagnostics panel */}
      <Card title="Diagnostics" icon={<Gauge className="h-5 w-5" />} className="mt-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DiagRow
            icon={micState === 'active' ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            label="Microphone"
            value={
              micState === 'active' ? 'Active' :
              micState === 'paused' ? 'Paused' :
              micState === 'requesting' ? 'Requesting…' :
              micState === 'error' ? 'Error' : 'Idle'
            }
            tone={isActive ? 'text-emerald-300' : isError ? 'text-red-300' : 'text-slate-300'}
          />
          <DiagRow
            icon={<Cpu className="h-4 w-4" />}
            label="Model"
            value={modelReady ? 'Ready' : modelError ? 'Error' : 'Not loaded'}
            tone={modelReady ? 'text-emerald-300' : 'text-amber-300'}
          />
          <DiagRow
            icon={<Activity className="h-4 w-4" />}
            label="AudioContext"
            value={diagnostics.audioContextState === 'none' ? 'None' : diagnostics.audioContextState}
            tone={diagnostics.audioContextState === 'running' ? 'text-emerald-300' : 'text-slate-300'}
          />
          <DiagRow
            icon={<Gauge className="h-4 w-4" />}
            label="Input sample rate"
            value={diagnostics.inputSampleRate > 0 ? `${diagnostics.inputSampleRate} Hz` : 'N/A'}
            tone="text-slate-300"
          />
          <DiagRow
            icon={<Clock className="h-4 w-4" />}
            label="Last inference"
            value={
              diagnostics.lastInferenceTime
                ? new Date(diagnostics.lastInferenceTime).toLocaleTimeString()
                : 'N/A'
            }
            tone="text-slate-300"
          />
          <DiagRow
            icon={<Gauge className="h-4 w-4" />}
            label="Inference duration"
            value={
              diagnostics.lastInferenceDuration !== null
                ? `${diagnostics.lastInferenceDuration.toFixed(0)} ms`
                : 'N/A'
            }
            tone="text-slate-300"
          />
        </div>
        {diagnostics.error && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-red-200">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-xs">{diagnostics.error}</p>
          </div>
        )}
        <p className="mt-3 text-xs text-slate-500">
          Inference duration is processing time only — it does not include audio capture or rendering
          latency, and is not a measure of end-to-end alert latency.
        </p>
      </Card>

      {/* Live status strip */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
        <StatusBadge
          tone={isActive ? 'teal' : isPaused ? 'amber' : isError ? 'red' : 'muted'}
          label={
            isActive ? 'Microphone active' :
            isPaused ? 'Microphone paused' :
            isError ? 'Microphone error' : 'Microphone idle'
          }
          pulse={isActive}
        />
        <StatusBadge
          tone={modelReady ? 'green' : 'amber'}
          label={modelReady ? 'Model ready' : 'Model pending'}
          icon={<Cpu className="h-4 w-4" />}
        />
      </div>

      {/* Category watchlist */}
      <Card title="Category watchlist" icon={<Activity className="h-5 w-5" />} className="mt-6">
        <ul className="space-y-1.5">
          {SOUND_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const enabled = settings.enabled[cat.id] ?? true;
            const config = ALERT_CONFIGS[cat.id];
            const confirmCount = getConfirmCount(cat.id);
            return (
              <li
                key={cat.id}
                className={`flex items-center justify-between gap-3 rounded-lg border border-ink-500/40 bg-ink-600/30 p-2.5 ${
                  !enabled ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-teal-300" />
                  <span className="text-sm text-slate-200">{cat.label}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className={priorityColors[config?.priority ?? 'low']}>
                    {priorityLabels[config?.priority ?? 'low']}
                  </span>
                  <span>·</span>
                  <span>{confirmCount}x confirm</span>
                  <span>·</span>
                  <span>{enabled ? 'On' : 'Off'}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

function DiagRow({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-ink-500/40 bg-ink-600/30 p-3">
      <span className={tone}>{icon}</span>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className={`text-sm font-medium ${tone}`}>{value}</p>
      </div>
    </div>
  );
}
