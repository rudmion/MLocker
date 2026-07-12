import { useState, useEffect, useCallback, useRef } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import type { Update } from '@tauri-apps/plugin-updater';
import { toast } from 'sonner';

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

  const checkForUpdate = useCallback(async (silent = true) => {
    try {
      setStatus('checking');
      setError(null);

      const update = await check();

      if (update) {
        setUpdateInfo(update);
        setStatus('hasUpdate');
      } else {
        setStatus('idle');
        if (!silent) {
          toast.info('Приложение уже имеет последнюю версию');
        }
      }
    } catch (err) {
      if (!silent) {
        toast.error('Не удалось проверить обновления. Попробуйте позже.');
        setStatus('idle');
      } else {
        setStatus('idle');
      }
    }
  }, []);

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
                Math.min(100, (downloadedBytes.current / totalBytes.current) * 100)
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
      console.error('Update install error:', err);
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'Не удалось установить обновление');
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

  // Auto-check on mount (silent)
  useEffect(() => {
    if (autoChecked.current) return;
    autoChecked.current = true;

    const timer = setTimeout(() => {
      checkForUpdate(true);
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
