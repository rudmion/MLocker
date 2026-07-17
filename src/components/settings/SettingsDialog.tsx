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
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTheme } from '@/components/theme-provider';
import {
  Shield,
  Info,
  Sun,
  Moon,
  Monitor,
  RefreshCw,
  Minus,
  Plus,
  Settings,
  Dices,
  Check,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useState, useEffect, useMemo } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { generatePassword } from '@/utils/generatePassword';

type SettingsDialogProps = {
  onCheckForUpdate?: () => void;
  isCheckingUpdate?: boolean;
};

export function SettingsDialog({
  onCheckForUpdate,
  isCheckingUpdate = false,
}: SettingsDialogProps) {
  const open = useSettingsStore((s) => s.settingsOpen);
  const setOpen = useSettingsStore((s) => s.setSettingsOpen);
  const masterPasswordEnabled = useSettingsStore(
    (s) => s.masterPasswordEnabled,
  );
  const setMasterPasswordEnabled = useSettingsStore(
    (s) => s.setMasterPasswordEnabled,
  );
  const passwordOptions = useSettingsStore((s) => s.passwordOptions);
  const setPasswordOptions = useSettingsStore((s) => s.setPasswordOptions);

  const [confirmDisableOpen, setConfirmDisableOpen] = useState(false);
  const [version, setVersion] = useState('0.1.0');
  const [saved, setSaved] = useState(false);

  const { theme, setTheme } = useTheme();

  useEffect(() => {
    getVersion()
      .then(setVersion)
      .catch(() => {});
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

  const previewPassword = useMemo(
    () => generatePassword(passwordOptions),
    [passwordOptions],
  );

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const activeCount = [
    passwordOptions.uppercase,
    passwordOptions.lowercase,
    passwordOptions.digits,
    passwordOptions.symbols,
  ].filter(Boolean).length;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Настройки</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="general">
            <TabsList className="w-full">
              <TabsTrigger value="general" className="flex-1 gap-1.5">
                <Settings size={14} />
                Общие
              </TabsTrigger>
              <TabsTrigger value="generator" className="flex-1 gap-1.5">
                <Dices size={14} />
                Генератор
              </TabsTrigger>
            </TabsList>

            {/* === General Tab === */}
            <TabsContent value="general" className="mt-4 space-y-4">
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

                {onCheckForUpdate && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={onCheckForUpdate}
                    disabled={isCheckingUpdate}
                  >
                    <RefreshCw
                      size={14}
                      className={`mr-2 ${isCheckingUpdate ? 'animate-spin' : ''}`}
                    />
                    {isCheckingUpdate ? 'Проверка...' : 'Проверить обновления'}
                  </Button>
                )}
              </div>
            </TabsContent>

            {/* === Generator Tab === */}
            <TabsContent value="generator" className="mt-4 space-y-4">
              {/* Length */}

              {/* Live Preview */}
              <div className="space-y-2">
                <div className="rounded-md border bg-muted/50 px-3 py-2">
                  <code className="block font-mono break-all text-muted-foreground select-all text-2xl">
                    {previewPassword}
                  </code>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Длина</span>
                  <span className="text-xs font-mono font-medium">
                    {passwordOptions.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon-xs"
                    onClick={() =>
                      setPasswordOptions({
                        length: Math.max(
                          activeCount,
                          passwordOptions.length - 1,
                        ),
                      })
                    }
                    disabled={passwordOptions.length <= activeCount}
                  >
                    <Minus size={14} />
                  </Button>
                  <input
                    type="range"
                    min={activeCount}
                    max={24}
                    value={passwordOptions.length}
                    onChange={(e) =>
                      setPasswordOptions({ length: Number(e.target.value) })
                    }
                    className="flex-1 h-1.5 appearance-none bg-muted rounded-full cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-4
                      [&::-webkit-slider-thumb]:h-4
                      [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:bg-primary
                      [&::-webkit-slider-thumb]:cursor-pointer
                      [&::-webkit-slider-thumb]:border-2
                      [&::-webkit-slider-thumb]:border-background
                      [&::-moz-range-thumb]:w-4
                      [&::-moz-range-thumb]:h-4
                      [&::-moz-range-thumb]:rounded-full
                      [&::-moz-range-thumb]:bg-primary
                      [&::-moz-range-thumb]:cursor-pointer
                      [&::-moz-range-thumb]:border-2
                      [&::-moz-range-thumb]:border-background"
                  />
                  <Button
                    variant="outline"
                    size="icon-xs"
                    onClick={() =>
                      setPasswordOptions({
                        length: Math.min(64, passwordOptions.length + 1),
                      })
                    }
                    disabled={passwordOptions.length >= 24}
                  >
                    <Plus size={14} />
                  </Button>
                </div>
              </div>

              {/* Character types */}
              <div className="space-y-1">
                {(
                  [
                    { key: 'uppercase' as const, label: 'Заглавные (A-Z)' },
                    { key: 'lowercase' as const, label: 'Строчные (a-z)' },
                    { key: 'digits' as const, label: 'Цифры (0-9)' },
                    { key: 'symbols' as const, label: 'Символы (!@#...)' },
                  ] as const
                ).map(({ key, label }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-xs text-muted-foreground">
                      {label}
                    </span>
                    <Switch
                      checked={passwordOptions[key]}
                      onCheckedChange={(checked) => {
                        const next = { ...passwordOptions, [key]: checked };
                        const nextCount = [
                          next.uppercase,
                          next.lowercase,
                          next.digits,
                          next.symbols,
                        ].filter(Boolean).length;
                        if (nextCount === 0) return;
                        if (next.length < nextCount) {
                          next.length = nextCount;
                        }
                        setPasswordOptions(next);
                      }}
                    />
                  </div>
                ))}
              </div>

              <Separator />

              {/* Save */}
              <Button className="w-full" onClick={handleSave}>
                {saved ? (
                  <>
                    <Check size={14} className="mr-2" />
                    Сохранено
                  </>
                ) : (
                  'Сохранить'
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmDisableOpen}
        onOpenChange={setConfirmDisableOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Отключить мастер-пароль?</AlertDialogTitle>
            <AlertDialogDescription>
              Без мастер-пароля ваши данные не защищены. Любой, кто получит
              доступ к вашему компьютеру, сможет открыть приложение и
              просмотреть все пароли. Это действие небезопасно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Оставить включённым</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDisable}>
              Отключить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
