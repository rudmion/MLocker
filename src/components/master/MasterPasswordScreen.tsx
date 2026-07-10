import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Eye, EyeOff, KeyRound, Copy, Check } from 'lucide-react';
import { notifications } from '@/lib/notifications';

interface Props {
  isSetup: boolean;
  onUnlocked: () => void;
  onForgotPassword: () => void;
  isBlocked: boolean;
  remainingSeconds: number;
  attemptsLeft: number;
  onFailedAttempt: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function MasterPasswordScreen({
  isSetup,
  onUnlocked,
  onForgotPassword,
  isBlocked,
  remainingSeconds,
  attemptsLeft,
  onFailedAttempt,
}: Props) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);

  useEffect(() => {
    if (isBlocked) {
      setError(
        `Слишком много попыток. Попробуйте через ${formatTime(remainingSeconds)}`,
      );
    } else {
      setError('');
    }
  }, [isBlocked, remainingSeconds]);

  const handleSubmit = async () => {
    setError('');

    if (isBlocked) return;

    if (!password) {
      setError('Введите пароль');
      return;
    }

    if (isSetup) {
      if (password.length < 4) {
        notifications.invalidMasterPassword(
          'Пароль должен содержать минимум 4 символа',
        );
        return;
      }

      if (password.length > 16) {
        notifications.invalidMasterPassword(
          'Пароль не должен превышать 16 символов',
        );
        return;
      }

      if (password !== confirmPassword) {
        setError('Пароли не совпадают');
        return;
      }
    }

    setLoading(true);

    try {
      if (isSetup) {
        const key = await invoke<string>('generate_recovery_key_command');
        await invoke('setup_master_password_with_recovery', {
          password,
          recoveryKey: key,
        });
        setRecoveryKey(key);
        notifications.masterPasswordSet();
      } else {
        const ok = await invoke<boolean>('verify_master_password', {
          password,
        });
        if (!ok) {
          onFailedAttempt();
          if (attemptsLeft <= 1) {
            setError('Неверный пароль. Блокировка на 1 минуту');
          } else {
            setError(`Неверный пароль. Осталось попыток: ${attemptsLeft - 1}`);
          }
          setLoading(false);
          return;
        }
        onUnlocked();
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleCopyKey = async () => {
    if (!recoveryKey) return;
    try {
      await navigator.clipboard.writeText(recoveryKey);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    } catch {
      notifications.copyFailed();
    }
  };

  if (recoveryKey) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="w-full max-w-md space-y-6 px-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <KeyRound size={28} className="text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">
                Сохраните ключ восстановления
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Запишите или сохраните этот ключ. Он понадобится, если вы
                забудете мастер-пароль. Ключ будет показан только один раз.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 rounded-lg border p-1">
              <span className="text-xl font-mono tracking-[0.3em] select-all">
                {recoveryKey}
              </span>
            </div>

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleCopyKey}
            >
              {keyCopied ? <Check size={16} /> : <Copy size={16} />}
              {keyCopied ? 'Скопировано' : 'Скопировать ключ'}
            </Button>

            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
              <p className="text-sm text-yellow-600 dark:text-yellow-400 text-center">
                Сохраните этот ключ в надёжном месте. Без него вы не сможете
                восстановить доступ к приложению.
              </p>
            </div>

            <Button className="w-full" onClick={onUnlocked}>
              Я сохранил ключ
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
            <p className="text-sm text-muted-foreground">
              Вход в приложение...
            </p>
          </div>
        </div>
      )}
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Lock size={28} className="text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">
              {isSetup ? 'Создайте мастер-пароль' : 'Введите мастер-пароль'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isSetup
                ? 'Пароль будет использоваться для доступа к приложению'
                : 'Введите пароль для входа в приложение'}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Введите пароль"
                disabled={isBlocked}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                disabled={isBlocked}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {isSetup && (
            <div className="space-y-2">
              <Label htmlFor="confirm">Подтвердите пароль</Label>
              <Input
                id="confirm"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Повторите пароль"
              />
            </div>
          )}

          {/* {!isSetup &&
            !isBlocked &&
            attemptsLeft < MAX_ATTEMPTS &&
            attemptsLeft > 0 && (
              <p className="text-sm text-muted-foreground text-center">
                Осталось попыток: {attemptsLeft}
              </p>
            )} */}

          {/* {isBlocked && (
            <div className="flex flex-col items-center gap-2">
              <div className="text-2xl font-mono font-bold tabular-nums text-destructive">
                {formatTime(remainingSeconds)}
              </div>
            </div>
          )} */}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={loading || isBlocked}
          >
            {loading ? 'Загрузка...' : isSetup ? 'Установить' : 'Войти'}
          </Button>

          {!isSetup && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={onForgotPassword}
              disabled={isBlocked}
            >
              Забыли пароль?
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

const MAX_ATTEMPTS = 5;
