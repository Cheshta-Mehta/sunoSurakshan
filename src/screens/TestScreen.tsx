import { useCallback, useRef, useState } from 'react';
import { FlaskConical, Upload, Loader2, Cpu, CheckCircle2, XCircle, FileAudio } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { SOUND_CATEGORIES, matchCategory } from '@/audio/soundCategories';
import { classifyAudio, decodeAudioFile } from '@/audio/classifier';
import { verifyCategoryLabels } from '@/audio/labels';
import type { ModelLoadState, Prediction, DetectionEvent } from '@/types';

interface TestScreenProps {
  modelState: ModelLoadState;
  thresholds: Record<string, number>;
  enabled: Record<string, boolean>;
  onAlert?: (event: DetectionEvent) => void;
}

interface ClipResult {
  fileName: string;
  sampleRate: number;
  sampleCount: number;
  predictions: Prediction[];
  matchedCategoryId: string | null;
}

export function TestScreen({ modelState, thresholds, enabled, onAlert }: TestScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ClipResult | null>(null);
  const [labelVerifications, setLabelVerifications] = useState<
    { categoryId: string; candidates: { candidate: string; found: boolean }[] }[] | null
  >(null);
  const [verifying, setVerifying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const modelReady = modelState.status === 'ready';
  const modelError = modelState.status === 'error' ? modelState.message : null;

  const handleVerifyLabels = useCallback(async () => {
    setVerifying(true);
    setError(null);
    try {
      const verifications: { categoryId: string; candidates: { candidate: string; found: boolean }[] }[] = [];
      for (const cat of SOUND_CATEGORIES) {
        const checked = await verifyCategoryLabels(cat.yamnetLabels);
        verifications.push({ categoryId: cat.id, candidates: checked });
      }
      setLabelVerifications(verifications);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify labels.');
    } finally {
      setVerifying(false);
    }
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      if (!modelReady) return;
      setLoading(true);
      setError(null);
      setResult(null);
      try {
        const { samples, sampleRate } = await decodeAudioFile(file);
        const { topCategories } = await classifyAudio(samples, sampleRate, 15, 0.01);
        const predictions: Prediction[] = topCategories.map((c) => ({
          label: c.categoryName,
          score: c.score,
        }));

        let matchedId: string | null = null;
        let matchedPred: Prediction | null = null;
        for (const pred of predictions) {
          if (!pred.label) continue;
          const cat = matchCategory(pred.label, pred.score, thresholds);
          if (cat && (enabled[cat.id] ?? true)) {
            matchedId = cat.id;
            matchedPred = pred;
            break;
          }
        }

        setResult({
          fileName: file.name,
          sampleRate,
          sampleCount: samples.length,
          predictions,
          matchedCategoryId: matchedId,
        });

        if (matchedId && matchedPred && onAlert) {
          const event: DetectionEvent = {
            id: `${matchedId}-clip-${Date.now()}`,
            categoryId: matchedId,
            yamnetLabel: matchedPred.label,
            score: matchedPred.score,
            timestamp: new Date().toISOString(),
            source: 'clip',
          };
          onAlert(event);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Classification failed.');
      } finally {
        setLoading(false);
      }
    },
    [modelReady, thresholds, enabled, onAlert],
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <div className="flex items-center gap-3">
        <FlaskConical className="h-7 w-7 text-teal-300" />
        <h1 className="text-2xl font-bold text-slate-50 sm:text-3xl">Test Clip Classifier</h1>
      </div>
      <p className="mt-2 text-slate-300">
        Upload a local audio file to run the real YAMNet model and see its raw predicted labels
        and confidence scores. Audio is processed entirely on your device — nothing is uploaded.
      </p>

      <div className="mt-8 rounded-2xl border border-ink-500/40 bg-ink-700/50 p-5">
        {modelReady ? (
          <div className="flex items-center gap-2 text-emerald-200">
            <Cpu className="h-5 w-5" />
            <p className="text-sm font-medium">Model ready — select an audio file to classify.</p>
          </div>
        ) : modelError ? (
          <div className="flex items-start gap-3 text-amber-200">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm">{modelError}</p>
          </div>
        ) : (
          <div className="flex items-start gap-3 text-amber-200">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm">
              The model must be loaded first. Go to the Home screen and tap "Try load" to initialize
              the on-device YAMNet classifier.
            </p>
          </div>
        )}
      </div>

      <Card title="Audio file" icon={<FileAudio className="h-5 w-5" />} className="mt-6">
        <div className="flex flex-col items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={onInputChange}
            disabled={!modelReady || loading}
            className="hidden"
          />
          <Button
            size="lg"
            variant="primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={!modelReady || loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Classifying…
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                Choose audio file
              </>
            )}
          </Button>
          <p className="text-xs text-slate-500">
            Supports WAV, MP3, OGG, FLAC — any format your browser can decode.
          </p>
        </div>
      </Card>

      {error && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-red-200">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {result && (
        <Card title="Classification results" icon={<FlaskConical className="h-5 w-5" />} className="mt-6">
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <StatusBadge tone="teal" label={result.fileName} />
            <StatusBadge
              tone="muted"
              label={`${result.sampleRate} Hz · ${(result.sampleCount / result.sampleRate).toFixed(1)}s`}
            />
            {result.matchedCategoryId && (
              <StatusBadge tone="green" label={`Matched: ${result.matchedCategoryId}`} />
            )}
          </div>

          {result.predictions.length === 0 ? (
            <p className="text-sm text-slate-400">
              No predictions above the score threshold. Try a clearer audio sample.
            </p>
          ) : (
            <ul className="space-y-2">
              {result.predictions.map((pred, i) => (
                <li
                  key={`${pred.label}-${i}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-ink-500/40 bg-ink-600/30 p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-ink-700 text-xs font-mono text-slate-400">
                      {i + 1}
                    </span>
                    <span className="font-mono text-sm text-slate-200">{pred.label || '(empty)'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-ink-500">
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
              ))}
            </ul>
          )}

          <p className="mt-4 text-xs text-slate-500">
            These are raw YAMNet class labels and confidence scores — not filtered or faked.
            Labels come directly from the model's 521-class AudioSet ontology.
          </p>
        </Card>
      )}

      <Card
        title="Label verification"
        icon={<CheckCircle2 className="h-5 w-5" />}
        className="mt-6"
        actions={
          <Button variant="secondary" size="sm" onClick={handleVerifyLabels} disabled={verifying}>
            {verifying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying…
              </>
            ) : (
              'Verify labels'
            )}
          </Button>
        }
      >
        {labelVerifications ? (
          <ul className="space-y-3">
            {labelVerifications.map((entry) => {
              const cat = SOUND_CATEGORIES.find((c) => c.id === entry.categoryId);
              const allFound = entry.candidates.every((c) => c.found);
              return (
                <li key={entry.categoryId} className="rounded-lg border border-ink-500/40 bg-ink-600/30 p-3">
                  <div className="flex items-center gap-2">
                    {allFound ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    ) : (
                      <XCircle className="h-4 w-4 text-amber-300" />
                    )}
                    <span className="font-medium text-slate-100">{cat?.label ?? entry.categoryId}</span>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {entry.candidates.map((c) => (
                      <li key={c.candidate} className="flex items-center gap-2 text-xs">
                        {c.found ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <XCircle className="h-3 w-3 text-amber-400" />
                        )}
                        <span className="font-mono text-slate-300">{c.candidate}</span>
                        <span className={c.found ? 'text-emerald-400' : 'text-amber-400'}>
                          {c.found ? 'verified' : 'not found'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">
            Tap "Verify labels" to check that each sound category's target YAMNet labels exist in
            the model's official 521-class label map.
          </p>
        )}
      </Card>
    </div>
  );
}
