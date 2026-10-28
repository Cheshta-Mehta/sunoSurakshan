import { SlidersHorizontal, Trash2, Vibrate, Eye, Clock, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { SOUND_CATEGORIES } from '@/audio/soundCategories';
import { ALERT_CONFIGS, getConfirmCount } from '@/audio/alertEngine';
import type { SoundSettings } from '@/types';

interface SettingsScreenProps {
  settings: SoundSettings;
  reducedMotion: boolean;
  onToggleCategory: (id: string, enabled: boolean) => void;
  onSetThreshold: (id: string, threshold: number) => void;
  onSetOption: (key: 'cooldownMs' | 'vibration' | 'visualFlash' | 'soundAlarm' | 'confirmCount', value: number | boolean) => void;
  onClearHistory: () => void;
  historyCount: number;
}

export function SettingsScreen({
  settings,
  reducedMotion,
  onToggleCategory,
  onSetThreshold,
  onSetOption,
  onClearHistory,
  historyCount,
}: SettingsScreenProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <div className="flex items-center gap-3">
        <SlidersHorizontal className="h-7 w-7 text-teal-300" />
        <h1 className="text-2xl font-bold text-slate-50 sm:text-3xl">Sound Settings</h1>
      </div>
      <p className="mt-2 text-slate-300">
        Choose which sounds trigger alerts, set sensitivity, and control how alerts appear.
      </p>

      {/* Alert appearance */}
      <Card title="Alert appearance" icon={<Eye className="h-5 w-5" />} className="mt-8">
        <div className="space-y-4">
          <Toggle
            label="Visual screen flash & pulsing border"
            description="Flashes the screen and border on alert"
            checked={settings.visualFlash}
            disabled={reducedMotion}
            disabledNote={reducedMotion ? 'Disabled by your reduced-motion preference' : undefined}
            onChange={(v) => onSetOption('visualFlash', v)}
          />
          <Toggle
            label="Loud beep alarm"
            description="Plays a repeating loud beep sound when an alert fires"
            checked={settings.soundAlarm}
            onChange={(v) => onSetOption('soundAlarm', v)}
          />
          <Toggle
            label="Vibration"
            description="Vibrates the device on alert where supported"
            checked={settings.vibration}
            onChange={(v) => onSetOption('vibration', v)}
          />
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
              <CheckCircle2 className="h-4 w-4 text-teal-300" />
              Repeated-detection confirmation: {settings.confirmCount ?? 1}
            </label>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={settings.confirmCount ?? 1}
              onChange={(e) => onSetOption('confirmCount', Number(e.target.value))}
              aria-label={`Confirmation count: ${settings.confirmCount ?? 1} consecutive detections`}
              className="mt-2 w-full accent-teal-400"
            />
            <p className="text-xs text-slate-500">
              Number of consecutive qualifying detections required before an alert fires. Higher values reduce false positives.
            </p>
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
              <Clock className="h-4 w-4 text-teal-300" />
              Repeated-alert cooldown: {(settings.cooldownMs / 1000).toFixed(1)}s
            </label>
            <input
              type="range"
              min={1000}
              max={15000}
              step={500}
              value={settings.cooldownMs}
              onChange={(e) => onSetOption('cooldownMs', Number(e.target.value))}
              aria-label={`Alert cooldown: ${(settings.cooldownMs / 1000).toFixed(1)} seconds`}
              className="mt-2 w-full accent-teal-400"
            />
            <p className="text-xs text-slate-500">
              How long to wait before re-alerting the same sound.
            </p>
          </div>
        </div>
      </Card>

      {/* Per-category */}
      <Card title="Sound categories" icon={<SlidersHorizontal className="h-5 w-5" />} className="mt-6">
        <div className="space-y-3">
          {SOUND_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const enabled = settings.enabled[cat.id] ?? true;
            const threshold = settings.thresholds[cat.id] ?? cat.defaultThreshold;
            const statusTone =
              cat.status === 'supported'
                ? 'text-emerald-300'
                : cat.status === 'experimental'
                  ? 'text-amber-300'
                  : 'text-slate-500';
            return (
              <div
                key={cat.id}
                className="rounded-xl border border-ink-500/40 bg-ink-600/40 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink-700 text-teal-300">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-medium text-slate-100">{cat.label}</p>
                      <p className={`text-xs ${statusTone}`}>
                        {cat.status === 'supported'
                          ? 'Supported'
                          : cat.status === 'experimental'
                            ? 'Experimental mapping'
                            : 'Unsupported'}
                        {' · '}
                        <span className="capitalize">{ALERT_CONFIGS[cat.id]?.priority ?? 'low'} priority</span>
                        {' · '}
                        {getConfirmCount(cat.id)}x confirmation
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={enabled}
                    onChange={(v) => onToggleCategory(cat.id, v)}
                    label={`Enable ${cat.label} alerts`}
                  />
                </div>
                <div className="mt-3">
                  <label className="text-xs text-slate-400">
                    Sensitivity threshold: {Math.round(threshold * 100)}%
                  </label>
                  <input
                    type="range"
                    min={0.2}
                    max={0.9}
                    step={0.05}
                    value={threshold}
                    disabled={!enabled}
                    onChange={(e) => onSetThreshold(cat.id, Number(e.target.value))}
                    aria-label={`Sensitivity for ${cat.label}: ${Math.round(threshold * 100)} percent`}
                    className="mt-1 w-full accent-teal-400 disabled:opacity-40"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Data */}
      <Card title="Event history" icon={<Trash2 className="h-5 w-5" />} className="mt-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-slate-100">Stored events: {historyCount}</p>
            <p className="text-sm text-slate-400">
              History is stored only on this device, in your browser. Clearing removes it permanently.
            </p>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={onClearHistory}
            disabled={historyCount === 0}
          >
            <Trash2 className="h-4 w-4" />
            Clear history
          </Button>
        </div>
      </Card>

      {/* Safety disclaimer */}
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
        <div className="text-sm text-amber-100">
          <p className="font-medium">This is an accessibility prototype, not a certified safety device.</p>
          <p className="mt-1 text-amber-200/80">
            SunoSuraksha cannot replace certified fire alarms, smoke alarms, or other emergency warning
            systems. It may miss sounds or produce false alerts. Always rely on certified safety devices
            for life-critical situations.
          </p>
        </div>
      </div>

      <p className="mt-6 flex items-center gap-2 text-xs text-slate-500">
        <Vibrate className="h-4 w-4" />
        Vibration requires a supporting device. Reduced-motion is{' '}
        {reducedMotion ? 'on' : 'off'} on this device.
      </p>
    </div>
  );
}

interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  disabledNote?: string;
  onChange: (v: boolean) => void;
}

function Toggle({ label, description, checked, disabled, disabledNote, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="font-medium text-slate-100">{label}</p>
        {description && <p className="text-sm text-slate-400">{description}</p>}
        {disabledNote && <p className="text-xs text-amber-300">{disabledNote}</p>}
      </div>
      <Switch checked={checked} disabled={disabled} onChange={onChange} label={label} />
    </div>
  );
}

interface SwitchProps {
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  label: string;
}

function Switch({ checked, disabled, onChange, label }: SwitchProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 disabled:opacity-40 ${
        checked ? 'bg-teal-400' : 'bg-ink-500'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
