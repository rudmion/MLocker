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

export function useUpdateChecker() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [latestVersion, setLatestVersion] = useState('');
  const [currentVersion, setCurrentVersion] = useState('');
  const [changelog, setChangelog] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const info = await invoke<UpdateInfo>('check_for_update');
        setCurrentVersion(info.current_version);
        if (info.has_update) {
          setLatestVersion(info.latest_version);
          setChangelog(info.body);
          setHasUpdate(true);
        }
      } catch (e) {
        console.error('Update check failed:', e);
      } finally {
        setChecking(false);
      }
    };

    check();
  }, []);

  const dismissUpdate = useCallback(() => {
    setHasUpdate(false);
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
    setHasUpdate(false);
  }, []);

  return {
    hasUpdate: hasUpdate && !dismissed,
    latestVersion,
    currentVersion,
    changelog,
    checking,
    dismissUpdate,
    installUpdate,
  };
}
