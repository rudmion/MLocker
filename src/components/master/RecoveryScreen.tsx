import { useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { notifications } from '@/lib/notifications';

interface Props {
  onBack: () => void;
  onRecovered: () => void;
  onResetAttempts: () => void;
}

export function RecoveryScreen({ onBack, onRecovered, onResetAttempts }: Props) {
  const [step, setStep] = useState<'key' | 'password'>('key');
  const [blocks, setBlocks] = useState(['', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleBlockChange = (index: number, value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    const newBlocks = [...blocks];
    newBlocks[index] = digits;
    setBlocks(newBlocks);

    if (digits.length === 4 && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleBlockKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && blocks[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter' && step === 'key') {
      handleVerifyKey();
    }
    if (e.key === 'Enter' && step === 'password') {
      handleReset();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
    if (pasted.length >= 16) {
      setBlocks([
        pasted.slice(0, 4),
        pasted.slice(4, 8),
        pasted.slice(8, 12),
        pasted.slice(12, 16),
      ]);
      inputRefs.current[3]?.focus();
    }
  };

  const fullKey = blocks.join(' ');

  const handleVerifyKey = () => {
    if (blocks.some((b) => b.length !== 4)) {
      setError('Введите все 4 блока ключа');
      return;
    }
    setError('');
    setStep('password');
  };

  const handleReset = async () => {
    setError('');

    if (newPassword.length < 4) {
      setError('Пароль должен быть не менее 4 символов');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setLoading(true);

    try {
      await invoke('reset_master_password', {
        recoveryKey: fullKey,
        newPassword,
      });
      notifications.masterPasswordRecovered();
      onResetAttempts();
      onRecovered();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  if (step === 'password') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
              <p className="text-sm text-muted-foreground">Восстановление...</p>
            </div>
          </div>
        )}
        <div className="w-full max-w-sm space-y-6 px-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <KeyRound size={28} className="text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Новый мастер-пароль</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Задайте новый пароль для входа в приложение
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Новый пароль</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleReset()}
                  placeholder="Введите пароль"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-new">Подтвердите пароль</Label>
              <Input
                id="confirm-new"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleReset()}
                placeholder="Повторите пароль"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              className="w-full"
              onClick={handleReset}
              disabled={loading}
            >
              {loading ? 'Загрузка...' : 'Восстановить доступ'}
            </Button>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setStep('key');
                setError('');
              }}
            >
              <ArrowLeft size={16} className="mr-2" />
              Назад
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <KeyRound size={28} className="text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Восстановление доступа</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Введите ключ восстановления, который был получен при создании мастер-пароля
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {blocks.map((block, i) => (
              <Input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                className="w-full text-center text-lg tracking-widest font-mono"
                maxLength={4}
                value={block}
                onChange={(e) => handleBlockChange(i, e.target.value)}
                onKeyDown={(e) => handleBlockKeyDown(i, e)}
                onPaste={i === 0 ? handlePaste : undefined}
              />
            ))}
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <Button
            className="w-full"
            onClick={handleVerifyKey}
            disabled={loading}
          >
            {loading ? 'Загрузка...' : 'Далее'}
          </Button>

          <Button
            variant="ghost"
            className="w-full"
            onClick={onBack}
          >
            <ArrowLeft size={16} className="mr-2" />
            Назад к входу
          </Button>
        </div>
      </div>
    </div>
  );
}
