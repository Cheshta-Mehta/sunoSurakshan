# SunoSuraksha — Smart Watch for Machines & Equipment

An offline web app (PWA) that listens to a machine, motor or room through the microphone, learns what
"normal" sounds like, and raises an alarm the moment something sounds unusual. No internet, no cloud, no account.

## How it works
1. **Learn Normal Sound** — listens for 3 seconds and memorises the normal spectrum (24 frequency bands) and loudness. Shows "BASELINE SET!".
2. **Live monitoring** — a live graph shows how different the current sound is from normal. Status shows a green **NORMAL**.
3. **Danger alert** — when the sound deviates beyond the threshold, the banner flashes red **🚨 ANOMALY DETECTED!**, the alarm beeps/vibrates, and the exact time (HH:MM:SS.mmm) is logged.

Detection is pure on-device statistics (per-band mean/std from calibration, z-score distance), so it catches louder,
different (grinding, knocks) **and** much quieter (machine stopped) sounds.

## Demo script
1. Turn on Airplane Mode (the header badge shows "Offline - fully working").
2. Tap **Learn Normal Sound**, stay quiet / let the machine run for 3 s.
3. Tap the desk, clap, or play a grinding sound → screen flips red and an entry appears in the log.
4. Adjust **Sensitivity** if the room is noisy (lower) or reactions are too slow (higher).

## Run
```bash
npm install
npm run dev       # development
npm run build && npm run preview   # production (PWA/offline works here, not in dev)
```
Open the production build once while online so the service worker caches it; afterwards it works offline.
Microphone access needs HTTPS or localhost.

## Limitations
- Detects "different from normal", not *what* the fault is.
- Re-learn the baseline if the machine's normal operating mode changes.
- Prototype — not a certified safety/industrial monitoring system.
