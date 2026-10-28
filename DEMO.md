# SunoSuraksha — Hackathon Demo Guide

## 30-Second Problem Statement & Solution

> Millions of deaf and hard-of-hearing people miss critical ambient sounds — fire alarms, doorbells, a crying baby, a dog barking, breaking glass, emergency sirens. SunoSuraksha turns any smartphone or laptop into a real-time visual sound awareness tool. It listens with the microphone, recognizes sounds using an on-device AI model, and shows large, high-contrast visual alerts with vibration. No audio ever leaves the device. No cloud. No account. Works offline.

## On-Device Edge AI & YAMNet

- **YAMNet** is a sound-event classification model trained on Google's AudioSet ontology (521 sound classes).
- The model runs entirely in the browser via MediaPipe's WASM runtime — no GPU, no cloud API, no server.
- The TFLite model is 4 MB, bundled in the app, and cached by the service worker for offline use.
- Audio is captured from the microphone, converted to 16 kHz mono Float32 samples, and classified locally every ~256ms.
- Only the top predicted labels and confidence scores are used — raw audio is never stored or transmitted.

## Live Demo Sequence (3 minutes)

### 0:00–0:30 — Introduction & Setup
1. Open the app (already loaded and cached).
2. Show the Home screen: status badges for model, connection, microphone, offline readiness.
3. Tap "Try load" to initialize the YAMNet model (takes 2–3 seconds).
4. Navigate to Setup screen, grant microphone permission.

### 0:30–1:30 — Live Sound Detection
1. Go to the Listening dashboard.
2. Tap "Start listening".
3. Play a sound near the microphone — options:
   - **Fire alarm / smoke detector beep** (best for demo — high confidence)
   - **Doorbell ring**
   - **Baby crying** (from a phone speaker)
   - **Siren sound** (from a video)
4. Watch the live predictions panel update with the YAMNet label and confidence score.
5. After the confirmation threshold is met (default 2 consecutive detections), the full-screen alert appears.
6. Show the large icon, uppercase sound name, confidence score, and "Acknowledge & dismiss" button.

### 1:30–2:00 — Visual Alerts & Vibration
1. Point out the priority-based coloring (critical = red, high = amber).
2. Show that the alert uses icon + text + border — not color alone.
3. If on a mobile device, demonstrate vibration.
4. Dismiss the alert (Escape key or tap button).
5. Show the event has been logged in History.

### 2:00–2:30 — Offline Operation
1. Open browser DevTools → Network tab.
2. Turn on "Offline" in DevTools (or turn off Wi-Fi).
3. Reload the page.
4. The app loads from cache — no network errors.
5. Start listening and trigger another sound — inference works fully offline.
6. Show the Diagnostics screen confirming "Offline ready" status.

### 2:30–3:00 — Privacy & Architecture
1. Show the Privacy & Offline Diagnostics screen.
2. Point out: no audio upload, no remote inference, no analytics, local history only.
3. Mention the safety disclaimer: this is an accessibility prototype, not a certified safety device.

## Backup Demo Plan

If microphone permission is denied or live detection fails:

1. **Test Clip mode**: Navigate to "Test Clip" and upload a pre-recorded audio file (WAV/MP3 of a fire alarm, siren, or baby crying). The model classifies it and shows the same labels and confidence scores.
2. **Label Verification**: On the Test Clip screen, tap "Verify labels" to show that all category labels exist in YAMNet's 521-class map — proving the mapping is real, not fabricated.
3. **Pre-recorded screen capture**: Have a screen recording of a successful live detection session ready to play.

## Privacy Explanation (Verified)

- Microphone audio is captured via Web Audio API and processed in-browser only.
- The `getUserMedia` stream is released (tracks stopped, AudioContext closed) when listening stops.
- No `fetch` calls to any external API during detection — only local asset fetches for the model/WASM.
- Event history is stored in `localStorage` on the device, capped at 200 entries, with a clear button.
- Settings (thresholds, toggles, vibration, visual flash) are also in `localStorage`.
- No analytics, telemetry, or tracking libraries are included in the app.

## Architecture Overview

```
Browser
├── React + TypeScript + Vite + Tailwind CSS
├── PWA (service worker caches all assets for offline use)
├── Web Audio API (microphone capture)
├── MediaPipe WASM Runtime (audio classification)
│   └── YAMNet TFLite model (4 MB, 521 AudioSet classes)
├── Alert Engine (thresholds, confirmation counts, cooldowns)
├── UI Screens (Home, Setup, Listening, Alert, Settings, History, Test, Diagnostics)
└── localStorage (settings + event history)
```

No backend. No database. No cloud. No external API calls during inference.

## Key Limitations (Do Not Overstate)

- **Not a certified safety device.** Cannot replace fire alarms, smoke detectors, or emergency warning systems.
- **YAMNet is a general classifier.** It may miss sounds or produce false positives. Accuracy varies by sound type and audio quality.
- **"Air siren" label not in YAMNet.** Three other siren labels are verified.
- **ScriptProcessorNode** is used for audio capture (deprecated API, but widely supported). AudioWorklet would be more efficient.
- **No Web Worker.** Classification runs on the main thread. The `isInferring` flag prevents backlog but UI may briefly stutter.
- **Inference duration** shown in diagnostics is processing time only, not end-to-end alert latency.
- **Vibration** requires a supporting device (mobile/Android). Not available on desktop browsers.

## Build & Run Commands

```bash
npm install        # Install dependencies
npm run build      # Production build (outputs to dist/)
npm run preview    # Preview the production build locally
npm run typecheck  # TypeScript type checking
npm run lint       # ESLint
```

No environment variables required. No backend to configure. The app is fully client-side.

## Tested vs. Unverified Capabilities

### Tested (via build, typecheck, lint)
- Production build succeeds (1593 modules, 21 precache entries, 67 MB cached)
- TypeScript compiles with zero errors
- ESLint passes with zero errors
- Service worker precaches all assets (verified in precache manifest)
- PWA manifest is valid
- All screens render without type errors
- Accessibility: skip link, ARIA roles, focus-visible outlines, aria-live regions, keyboard dismiss on alerts

### Unverified (requires browser testing)
- Real-time microphone inference with actual sounds
- Actual YAMNet prediction accuracy and latency
- Offline reload after disabling network
- Vibration on mobile devices
- Service worker installation and `onOfflineReady` callback in a real browser
- Microphone permission flow on different browsers (Chrome, Firefox, Safari)
