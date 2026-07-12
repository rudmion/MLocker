import { useState, useEffect, useCallback, useRef } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import type { Update } from '@tauri-apps/plugin-updater';

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'hasUpdate'
  | 'downloading'
  | 'installing'
  | 'installed'
  | 'error';

export function useUpdateChecker() {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [updateInfo, setUpdateInfo] = useState<Update | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const autoChecked = useRef(false);
  const totalBytes = useRef(0);
  const downloadedBytes = useRef(0);

  const checkForUpdate = useCallback(
    async (silent = true): Promise<'update' | 'none' | 'error'> => {
      try {
        setStatus('checking');
        setError(null);

        const update = await check();

        if (update) {
          setUpdateInfo(update);
          setStatus('hasUpdate');
          return 'update';
        } else {
          setStatus('idle');
          return 'none';
        }
      } catch (err) {
        if (!silent) {
          setError(
            err instanceof Error ? err.message : 'Ошибка проверки обновлений',
          );
          setStatus('error');
        } else {
          setStatus('idle');
        }
        return 'error';
      }
    },
    [],
  );

  const downloadAndInstall = useCallback(async () => {
    if (!updateInfo) return;

    try {
      setStatus('downloading');
      setDownloadProgress(0);
      setError(null);
      totalBytes.current = 0;
      downloadedBytes.current = 0;

      await updateInfo.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            totalBytes.current = event.data.contentLength ?? 0;
            setDownloadProgress(0);
            setStatus('downloading');
            break;
          case 'Progress':
            downloadedBytes.current += event.data.chunkLength;
            if (totalBytes.current > 0) {
              setDownloadProgress(
                Math.min(
                  100,
                  (downloadedBytes.current / totalBytes.current) * 100,
                ),
              );
            }
            break;
          case 'Finished':
            setStatus('installing');
            break;
        }
      });

      setStatus('installed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка установки');
      setStatus('error');
    }
  }, [updateInfo]);

  const restart = useCallback(async () => {
    try {
      await relaunch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка перезапуска');
    }
  }, []);

  const dismiss = useCallback(() => {
    setStatus('idle');
    setUpdateInfo(null);
    setDownloadProgress(0);
    setError(null);
  }, []);

  // Auto-check once per day (silent)
  useEffect(() => {
    if (autoChecked.current) return;
    autoChecked.current = true;

    const LAST_CHECK_KEY = 'mlocker-last-update-check';
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
    const now = Date.now();

    if (lastCheck && now - Number(lastCheck) < ONE_DAY_MS) return;

    const timer = setTimeout(() => {
      checkForUpdate(true).then(() => {
        localStorage.setItem(LAST_CHECK_KEY, String(now));
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, [checkForUpdate]);

  return {
    status,
    updateInfo,
    downloadProgress,
    error,
    checkForUpdate,
    downloadAndInstall,
    restart,
    dismiss,
  };
}
