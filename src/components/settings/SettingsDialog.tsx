import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTheme } from '@/components/theme-provider';
import { Shield, Info, Sun, Moon, Monitor } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useState, useEffect } from 'react';
import { getVersion } from '@tauri-apps/api/app';

export function SettingsDialog() {
  const open = useSettingsStore((s) => s.settingsOpen);
  const setOpen = useSettingsStore((s) => s.setSettingsOpen);
  const masterPasswordEnabled = useSettingsStore(
    (s) => s.masterPasswordEnabled,
  );
  const setMasterPasswordEnabled = useSettingsStore(
    (s) => s.setMasterPasswordEnabled,
  );

  const [confirmDisableOpen, setConfirmDisableOpen] = useState(false);
  const [version, setVersion] = useState('0.1.0');

  const { theme, setTheme } = useTheme();

  useEffect(() => {
    getVersion().then(setVersion).catch(() => {});
  }, []);

  const themeOptions = [
    { value: 'light' as const, label: 'Светлая', icon: Sun },
    { value: 'dark' as const, label: 'Тёмная', icon: Moon },
    { value: 'system' as const, label: 'Система', icon: Monitor },
  ];

  const handleMasterPasswordToggle = (checked: boolean) => {
    if (!checked && masterPasswordEnabled) {
      setConfirmDisableOpen(true);
    } else {
      setMasterPasswordEnabled(checked);
    }
  };

  const confirmDisable = () => {
    setMasterPasswordEnabled(false);
    setConfirmDisableOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Настройки</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Theme Toggle */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Тема</p>
              <div className="grid grid-cols-3 gap-2">
                {themeOptions.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs transition-colors ${
                      theme === value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Master Password Toggle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-muted-foreground" />
                  <span className="text-sm font-medium">Мастер-пароль</span>
                </div>
                <Switch
                  checked={masterPasswordEnabled}
                  onCheckedChange={handleMasterPasswordToggle}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {masterPasswordEnabled
                  ? 'При входе требуется ввод пароля'
                  : 'Приложение доступно без пароля'}
              </p>
            </div>

            <Separator />

            {/* About */}
            <div className="space-y-2">
              <p className="text-sm font-medium">О приложении</p>
              <button
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2 rounded-lg border p-3 text-left text-sm hover:bg-muted transition-colors"
              >
                <Info size={16} className="text-muted-foreground shrink-0" />
                <div>
                  <p className="font-medium">MLocker</p>
                  <p className="text-xs text-muted-foreground">
                    Менеджер паролей v{version}
                  </p>
                </div>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDisableOpen} onOpenChange={setConfirmDisableOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Отключить мастер-пароль?</AlertDialogTitle>
            <AlertDialogDescription>
              Без мастер-пароля ваши данные не защищены. Любой, кто получит доступ
              к вашему компьютеру, сможет открыть приложение и просмотреть все
              пароли. Это действие небезопасно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Оставить включённым</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmDisable}
            >
              Отключить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
