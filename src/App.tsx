import { useCallback, useRef, useState } from 'react';
import { Nav } from '@/components/Nav';
import { HomeScreen } from '@/screens/HomeScreen';
import { PermissionScreen } from '@/screens/PermissionScreen';
import { ListeningScreen } from '@/screens/ListeningScreen';
import { AlertScreen } from '@/screens/AlertScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { HistoryScreen } from '@/screens/HistoryScreen';
import { DiagnosticsScreen } from '@/screens/DiagnosticsScreen';
import { TestScreen } from '@/screens/TestScreen';
import { useConnectivity } from '@/hooks/useConnectivity';
import { useSettings } from '@/hooks/useSettings';
import { useEventHistory } from '@/hooks/useEventHistory';
import { useModelLoad } from '@/hooks/useModelLoad';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useMicPermission } from '@/hooks/useMicPermission';
import { useLiveInference } from '@/hooks/useLiveInference';
import { usePWAStatus } from '@/hooks/usePWAStatus';
import { createAlertEngineState, evaluateAlert, type AlertEngineState } from '@/audio/alertEngine';
import type { ScreenId, DetectionEvent } from '@/types';

export default function App() {
  const [screen, setScreen] = useState<ScreenId>('home');
  const [activeAlert, setActiveAlert] = useState<DetectionEvent | null>(null);
  const [alertStatus, setAlertStatus] = useState<string | null>(null);

  const connectivity = useConnectivity();
  const reducedMotion = useReducedMotion();
  const { state: modelState, load: loadModel } = useModelLoad();
  const { permission: micPermission, request: requestMic } = useMicPermission();
  const { settings, toggleCategory, setThreshold, setOption } = useSettings();
  const { events, addEvent, clear } = useEventHistory();
  const pwaStatus = usePWAStatus();

  const alertEngineRef = useRef<AlertEngineState>(createAlertEngineState());

  const handleInferenceResult = useCallback(
    ({ predictions, timestamp }: { predictions: { label: string; score: number }[]; inferenceMs: number; timestamp: number }) => {
      const evalResult = evaluateAlert(
        predictions,
        settings,
        alertEngineRef.current,
        'live',
        timestamp,
      );

      if (evalResult.shouldAlert && evalResult.event) {
        addEvent(evalResult.event);
        setActiveAlert(evalResult.event);
        setAlertStatus(null);
      } else if (evalResult.category) {
        setAlertStatus(evalResult.reason);
      } else {
        setAlertStatus(null);
      }
    },
    [settings, addEvent],
  );

  const { micState, diagnostics, latestPredictions, start, pause, resume, stop } = useLiveInference({
    modelState,
    onResult: handleInferenceResult,
  });

  const handleNavigate = useCallback((id: ScreenId) => {
    if (id !== 'listening') {
      stop();
    }
    setScreen(id);
  }, [stop]);

  const handleClearHistory = useCallback(() => {
    clear();
  }, [clear]);

  const handleDismissAlert = useCallback(() => {
    setActiveAlert(null);
  }, []);

  const handleTestAlert = useCallback((event: DetectionEvent) => {
    addEvent(event);
    setActiveAlert(event);
  }, [addEvent]);

  return (
    <div className="min-h-screen bg-ink-900">
      <Nav current={screen} onNavigate={handleNavigate} unreadAlert={!!activeAlert} />

      <main id="main" className="pb-24 md:pb-8">
        {screen === 'home' && (
          <HomeScreen
            modelState={modelState}
            connectivity={connectivity}
            micPermission={micPermission}
            onNavigate={handleNavigate}
            onTryLoad={loadModel}
            offlineReady={pwaStatus.offlineReady}
          />
        )}
        {screen === 'permission' && (
          <PermissionScreen
            modelState={modelState}
            connectivity={connectivity}
            micPermission={micPermission}
            onRequestMic={requestMic}
            onNavigate={handleNavigate}
            offlineReady={pwaStatus.offlineReady}
          />
        )}
        {screen === 'listening' && (
          <ListeningScreen
            modelState={modelState}
            micState={micState}
            diagnostics={diagnostics}
            latestPredictions={latestPredictions}
            settings={settings}
            alertStatus={alertStatus}
            onStart={start}
            onPause={pause}
            onResume={resume}
            onStop={stop}
          />
        )}
        {screen === 'settings' && (
          <SettingsScreen
            settings={settings}
            reducedMotion={reducedMotion}
            onToggleCategory={toggleCategory}
            onSetThreshold={setThreshold}
            onSetOption={setOption}
            onClearHistory={handleClearHistory}
            historyCount={events.length}
          />
        )}
        {screen === 'history' && <HistoryScreen events={events} onClear={handleClearHistory} />}
        {screen === 'test' && (
          <TestScreen
            modelState={modelState}
            thresholds={settings.thresholds}
            enabled={settings.enabled}
            onAlert={handleTestAlert}
          />
        )}
        {screen === 'diagnostics' && (
          <DiagnosticsScreen
            modelState={modelState}
            connectivity={connectivity}
            micPermission={micPermission}
            reducedMotion={reducedMotion}
            offlineReady={pwaStatus.offlineReady}
            swState={pwaStatus.swState}
            swError={pwaStatus.error}
            needRefresh={pwaStatus.needRefresh}
            onUpdateSW={pwaStatus.updateSW}
          />
        )}
      </main>

      {activeAlert && (
        <AlertScreen
          event={activeAlert}
          visualFlash={settings.visualFlash}
          vibration={settings.vibration}
          soundAlarm={settings.soundAlarm}
          reducedMotion={reducedMotion}
          onDismiss={handleDismissAlert}
        />
      )}

      <footer className="hidden md:block">
        <div className="mx-auto max-w-6xl px-4 py-4 text-center text-xs text-slate-500">
          SunoSuraksha · Local, private sound awareness · No audio leaves your device
        </div>
      </footer>
    </div>
  );
}
