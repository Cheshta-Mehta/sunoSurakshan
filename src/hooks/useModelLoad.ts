import { useCallback, useState } from 'react';
import type { ModelLoadState } from '@/types';
import { initClassifier } from '@/audio/classifier';
import { loadYamnetLabels } from '@/audio/labels';

export function useModelLoad() {
  const [state, setState] = useState<ModelLoadState>({ status: 'idle' });

  const load = useCallback(async () => {
    setState({ status: 'loading', progress: 0.1 });
    try {
      await Promise.all([initClassifier(), loadYamnetLabels()]);
      setState({ status: 'ready' });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to load the on-device model. Check your browser console for details.';
      setState({ status: 'error', message });
    }
  }, []);

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return { state, load, reset };
}
