import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

type UpdateInfo = {
  has_update: boolean;
  current_version: string;
  latest_version: string;
  body: string | null;
  html_url: string | null;
  download_url: string | null;
};

type UpdateState = {
  hasUpdate: boolean;
  latestVersion: string;
  currentVersion: string;
  changelog: string | null;
  downloadUrl: string | null;
  checking: boolean;
  downloading: boolean;
  downloadProgress: number;
  updateInstalled: boolean;
  error: string | null;
};

export function useUpdateChecker() {
  const [state, setState] = useState<UpdateState>({
    hasUpdate: false,
    latestVersion: '',
    currentVersion: '',
    changelog: null,
    downloadUrl: null,
    checking: false,
    downloading: false,
    downloadProgress: 0,
    updateInstalled: false,
    error: null,
  });
  const [dismissed, setDismissed] = useState(false);

  const stateRef = useRef(state);
  stateRef.current = state;

  const checkForUpdate = useCallback(async (showNoUpdateToast = false) => {
    setState((prev) => ({ ...prev, checking: true, error: null }));

    try {
      const info = await invoke<UpdateInfo>('check_for_update');

      if (info.has_update) {
        setState({
          hasUpdate: true,
          latestVersion: info.latest_version,
          currentVersion: info.current_version,
          changelog: info.body,
          downloadUrl: info.download_url,
          checking: false,
          downloading: false,
          downloadProgress: 0,
          updateInstalled: false,
          error: null,
        });
        setDismissed(false);
      } else {
        setState((prev) => ({
          ...prev,
          currentVersion: info.current_version,
          hasUpdate: false,
          checking: false,
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

    // Check for updates every 4 hours
    const interval = setInterval(() => {
      checkForUpdate(false);
    }, 4 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [checkForUpdate]);

  const dismissUpdate = useCallback(() => {
    setState((prev) => ({ ...prev, hasUpdate: false }));
    setDismissed(true);
  }, []);

  const installUpdate = useCallback(async () => {
    setState((prev) => ({ ...prev, downloading: true, downloadProgress: 0, error: null }));

    // Listen for progress events
    const unlisten = await listen<{ downloaded: number; total: number; status?: string }>(
      'update-progress',
      (event) => {
        const { downloaded, total, status } = event.payload;
        if (status === 'installing') {
          setState((prev) => ({ ...prev, downloadProgress: 100 }));
        } else if (total > 0) {
          const progress = Math.round((downloaded / total) * 100);
          setState((prev) => ({ ...prev, downloadProgress: progress }));
        }
      }
    );

    try {
      const url = stateRef.current.downloadUrl;
      if (!url) {
        throw new Error('Download URL not available');
      }

      const filePath = await invoke<string>('download_update', { url });

      setState((prev) => ({
        ...prev,
        hasUpdate: false,
        downloading: false,
        downloadProgress: 0,
        updateInstalled: true,
      }));

      // Auto-launch installer and close app
      await invoke('install_downloaded_update', { filePath });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setState((prev) => ({
        ...prev,
        downloading: false,
        downloadProgress: 0,
        error: message,
      }));

      const { toast } = await import('sonner');
      const { CircleX } = await import('lucide-react');
      toast.error('Не удалось загрузить обновление', {
        icon: <CircleX className="text-red-500 pe-1" />,
      });
    } finally {
      unlisten();
    }
  }, []);

  return {
    hasUpdate: state.hasUpdate && !dismissed,
    latestVersion: state.latestVersion,
    currentVersion: state.currentVersion,
    changelog: state.changelog,
    checking: state.checking,
    downloading: state.downloading,
    downloadProgress: state.downloadProgress,
    updateInstalled: state.updateInstalled,
    error: state.error,
    dismissUpdate,
    installUpdate,
    checkForUpdate,
  };
}
