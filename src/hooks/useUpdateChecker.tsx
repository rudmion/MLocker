import { useState, useEffect, useCallback } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

type UpdateState = {
  hasUpdate: boolean;
  latestVersion: string;
  currentVersion: string;
  changelog: string | null;
  checking: boolean;
  downloading: boolean;
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
    downloading: false,
    downloadProgress: 0,
    error: null,
  });
  const [dismissed, setDismissed] = useState(false);

  const checkForUpdate = useCallback(async (showNoUpdateToast = false) => {
    setState((prev) => ({ ...prev, checking: true, error: null }));

    try {
      const update = await check();

      if (update) {
        setState({
          hasUpdate: true,
          latestVersion: update.version,
          currentVersion: update.currentVersion,
          changelog: update.body ?? null,
          checking: false,
          downloading: false,
          downloadProgress: 0,
          error: null,
        });
        setDismissed(false);
      } else {
        setState((prev) => ({
          ...prev,
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
  }, [checkForUpdate]);

  const dismissUpdate = useCallback(() => {
    setState((prev) => ({ ...prev, hasUpdate: false }));
    setDismissed(true);
  }, []);

  const installUpdate = useCallback(async () => {
    setState((prev) => ({ ...prev, downloading: true, downloadProgress: 0, error: null }));

    try {
      const update = await check();
      if (!update) {
        throw new Error('Update no longer available');
      }

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            if (event.data.contentLength) {
              setState((prev) => ({ ...prev, downloadProgress: 0 }));
            }
            break;
          case 'Progress':
            setState((prev) => ({ ...prev, downloadProgress: -1 }));
            break;
          case 'Finished':
            setState((prev) => ({ ...prev, downloadProgress: 100 }));
            break;
        }
      });

      // Auto-relaunch after install (on Windows app exits during downloadAndInstall,
      // so this only runs on macOS/Linux)
      await relaunch();
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
    error: state.error,
    dismissUpdate,
    installUpdate,
    checkForUpdate,
  };
}
