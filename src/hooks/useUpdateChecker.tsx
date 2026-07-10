import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';

type UpdateInfo = {
  has_update: boolean;
  current_version: string;
  latest_version: string;
  body: string | null;
  html_url: string | null;
};

type UpdateState = {
  hasUpdate: boolean;
  latestVersion: string;
  currentVersion: string;
  changelog: string | null;
  checking: boolean;
  error: string | null;
};

export function useUpdateChecker() {
  const [state, setState] = useState<UpdateState>({
    hasUpdate: false,
    latestVersion: '',
    currentVersion: '',
    changelog: null,
    checking: false,
    error: null,
  });
  const [dismissed, setDismissed] = useState(false);

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
          checking: false,
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
  }, [checkForUpdate]);

  const dismissUpdate = useCallback(() => {
    setState((prev) => ({ ...prev, hasUpdate: false }));
    setDismissed(true);
  }, []);

  const installUpdate = useCallback(async () => {
    try {
      const info = await invoke<UpdateInfo>('check_for_update');
      if (info.html_url) {
        await open(info.html_url);
      }
    } catch (e) {
      console.error('Failed to open update page:', e);
    }
    setState((prev) => ({ ...prev, hasUpdate: false }));
  }, []);

  return {
    hasUpdate: state.hasUpdate && !dismissed,
    latestVersion: state.latestVersion,
    currentVersion: state.currentVersion,
    changelog: state.changelog,
    checking: state.checking,
    error: state.error,
    dismissUpdate,
    installUpdate,
    checkForUpdate,
  };
}
