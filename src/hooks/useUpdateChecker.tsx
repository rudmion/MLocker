import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { relaunch } from '@tauri-apps/plugin-process';

type UpdateInfo = {
  has_update: boolean;
  current_version: string;
  latest_version: string;
  body: string | null;
  html_url: string | null;
  download_url: string | null;
};

export type UpdateStatus = 'idle' | 'downloading' | 'installing' | 'restart_needed' | 'error';

type UpdateState = {
  hasUpdate: boolean;
  latestVersion: string;
  currentVersion: string;
  changelog: string | null;
  checking: boolean;
  status: UpdateStatus;
  downloadProgress: number;
  error: string | null;
};

export function useUpdateChecker() {
  const [state, setState] = useState<UpdateState>({
    hasUpdate: false,
    latestVersion: '',
    currentVersion: '',
    changelog: null,
    checking: false,
    status: 'idle',
    downloadProgress: 0,
    error: null,
  });
  const [dismissed, setDismissed] = useState(false);
  const installRef = useRef<() => Promise<void>>();

  const doInstall = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'downloading', downloadProgress: 0, error: null }));

    const unlisten = await listen<{ downloaded: number; total: number; status?: string }>(
      'update-progress',
      (event) => {
        const { downloaded, total, status } = event.payload;
        if (status === 'installing') {
          setState((prev) => ({ ...prev, status: 'installing', downloadProgress: 100 }));
        } else if (status === 'installed') {
          setState((prev) => ({ ...prev, status: 'restart_needed', downloadProgress: 100 }));
        } else if (status === 'downloading' && total > 0) {
          const progress = Math.round((downloaded / total) * 100);
          setState((prev) => ({ ...prev, downloadProgress: progress }));
        }
      }
    );

    try {
      const info = await invoke<UpdateInfo>('check_for_update');
      if (!info.download_url) {
        throw new Error('Download URL not available');
      }

      await invoke<string>('download_and_install_update', { url: info.download_url });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setState((prev) => ({
        ...prev,
        status: 'error',
        downloadProgress: 0,
        error: message,
      }));
    } finally {
      unlisten();
    }
  }, []);

  installRef.current = doInstall;

  const checkForUpdate = useCallback(async (showNoUpdateToast = false) => {
    setState((prev) => ({ ...prev, checking: true, status: 'idle', error: null }));

    try {
      const info = await invoke<UpdateInfo>('check_for_update');

      if (info.has_update) {
        setState({
          hasUpdate: true,
          latestVersion: info.latest_version,
          currentVersion: info.current_version,
          changelog: info.body,
          checking: false,
          status: 'idle',
          downloadProgress: 0,
          error: null,
        });
        setDismissed(false);

        // Auto-start download
        setTimeout(() => {
          installRef.current?.();
        }, 500);
      } else {
        setState((prev) => ({
          ...prev,
          currentVersion: info.current_version,
          hasUpdate: false,
          checking: false,
          status: 'idle',
        }));

        if (showNoUpdateToast) {
          const { toast } = await import('sonner');
          const { CircleCheckBig } = await import('lucide-react');
          toast.success('У вас последняя версия', {
            icon: <CircleCheckBig className="text-green-500 pe-1" />,
          });
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setState((prev) => ({
        ...prev,
        checking: false,
        status: 'error',
        error: message,
      }));

      if (showNoUpdateToast) {
        const { toast } = await import('sonner');
        const { CircleX } = await import('lucide-react');
        toast.error('Не удалось проверить обновления', {
          icon: <CircleX className="text-red-500 pe-1" />,
        });
      }
    }
  }, []);

  useEffect(() => {
    checkForUpdate(false);
  }, [checkForUpdate]);

  const dismissUpdate = useCallback(() => {
    setState((prev) => ({ ...prev, hasUpdate: false }));
    setDismissed(true);
  }, []);

  const restartApp = useCallback(async () => {
    await relaunch();
  }, []);

  return {
    hasUpdate: state.hasUpdate && !dismissed,
    latestVersion: state.latestVersion,
    currentVersion: state.currentVersion,
    changelog: state.changelog,
    checking: state.checking,
    status: state.status,
    downloadProgress: state.downloadProgress,
    error: state.error,
    dismissUpdate,
    installUpdate: doInstall,
    restartApp,
    checkForUpdate,
  };
}
