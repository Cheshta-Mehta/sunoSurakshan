import { useCallback, useEffect, useState } from 'react';

/**
 * Tracks microphone permission state without requesting it.
 * Uses the Permissions API where available; otherwise infers from
 * navigator.mediaDevices presence.
 */
export function useMicPermission() {
  const [permission, setPermission] = useState<PermissionState | 'unknown'>('unknown');

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    async function check() {
      try {
        if ('permissions' in navigator && navigator.permissions) {
          const status = await navigator.permissions.query({
            name: 'microphone' as PermissionName,
          });
          if (cancelled) return;
          setPermission(status.state as PermissionState);
          const onChange = () => setPermission(status.state as PermissionState);
          status.addEventListener('change', onChange);
          cleanup = () => status.removeEventListener('change', onChange);
        }
      } catch {
        // Permissions API not supported; leave as 'unknown'.
      }
    }
    void check();
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  const request = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Immediately release: we only needed to trigger the permission prompt.
      stream.getTracks().forEach((t) => t.stop());
      setPermission('granted');
    } catch (err) {
      if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) {
        setPermission('denied');
      }
    }
  }, []);

  return { permission, request };
}
