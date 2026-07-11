import './index.css';
import { ThemeProvider } from '@/components/theme-provider';
import Main from './screens/main/main';
import { SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { MasterPasswordScreen } from '@/components/master/MasterPasswordScreen';
import { RecoveryScreen } from '@/components/master/RecoveryScreen';
import { invoke } from '@tauri-apps/api/core';
import { Toaster } from '@/components/ui/sonner';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useMasterPasswordAttempts } from '@/hooks/useMasterPasswordAttempts';
import { useUpdateChecker } from '@/hooks/useUpdateChecker';
import { UpdateNotification } from '@/components/update/UpdateNotification';

function App() {
  const loadData = useStore((s) => s.loadData);
  const masterPasswordEnabled = useSettingsStore(
    (s) => s.masterPasswordEnabled,
  );
  const setSettingsOpen = useSettingsStore((s) => s.setSettingsOpen);

  useKeyboardShortcuts();

  const {
    hasUpdate,
    latestVersion,
    currentVersion,
    changelog,
    checking,
    downloading,
    downloadProgress,
    downloadedBytes,
    totalBytes,
    installing,
    installProgress,
    installPath,
    needsRestart,
    dismissUpdate,
    installUpdate,
    restartApp,
    checkForUpdate,
  } = useUpdateChecker();

  const [masterState, setMasterState] = useState<
    'loading' | 'setup' | 'locked' | 'recovery' | 'unlocked'
  >('loading');

  const initialized = useRef(false);
  const {
    isBlocked,
    remainingSeconds,
    attemptsLeft,
    recordFailedAttempt,
    reset: resetAttempts,
  } = useMasterPasswordAttempts();

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const init = async () => {
      try {
        const isSet = await invoke<boolean>('check_master_lock');

        if (!masterPasswordEnabled) {
          setMasterState('unlocked');
          await loadData();
          return;
        }

        setMasterState(isSet ? 'locked' : 'setup');
      } catch {
        setMasterState('setup');
      }
    };

    init();
  }, []);

  const handleUnlocked = async () => {
    resetAttempts();
    setMasterState('unlocked');
    await loadData();
  };

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Toaster />
      {masterState === 'unlocked' && hasUpdate && (
        <UpdateNotification
          latestVersion={latestVersion}
          currentVersion={currentVersion}
          changelog={changelog}
          downloading={downloading}
          downloadProgress={downloadProgress}
          downloadedBytes={downloadedBytes}
          totalBytes={totalBytes}
          installing={installing}
          installProgress={installProgress}
          installPath={installPath}
          needsRestart={needsRestart}
          onInstall={installUpdate}
          onRestart={restartApp}
          onDismiss={dismissUpdate}
        />
      )}
      {masterState === 'loading' && (
        <div className="flex h-screen items-center justify-center bg-background">
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      )}
      {masterState === 'recovery' && (
        <RecoveryScreen
          onBack={() => setMasterState('locked')}
          onRecovered={handleUnlocked}
          onResetAttempts={resetAttempts}
        />
      )}
      {(masterState === 'setup' || masterState === 'locked') && (
        <MasterPasswordScreen
          isSetup={masterState === 'setup'}
          onUnlocked={handleUnlocked}
          onForgotPassword={() => setMasterState('recovery')}
          isBlocked={isBlocked}
          remainingSeconds={remainingSeconds}
          attemptsLeft={attemptsLeft}
          onFailedAttempt={recordFailedAttempt}
        />
      )}
      {masterState === 'unlocked' && (
        <TooltipProvider delayDuration={2000}>
          <SettingsDialog
            onCheckForUpdate={() => checkForUpdate(true, () => setSettingsOpen(false))}
            isCheckingUpdate={checking}
          />
          <SidebarProvider>
            <Main />
          </SidebarProvider>
        </TooltipProvider>
      )}
    </ThemeProvider>
  );
}

export default App;
