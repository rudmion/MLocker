import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Eye, EyeOff, Loader2, Lock } from 'lucide-react';

type MasterPasswordModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  /** Вернуть true, если пароль принят. По умолчанию — verify_master_password. */
  verify?: (password: string) => Promise<boolean>;
  onSuccess?: (password: string) => void;
};

export function MasterPasswordModal({
  open,
  onOpenChange,
  title = 'Подтверждение действия',
  description = 'Введите мастер-пароль для продолжения',
  verify,
  onSuccess,
}: MasterPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (open) {
      setPassword('');
      setError('');
      setShowPassword(false);
    }
  }, [open]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password || loading) return;

    setLoading(true);
    setError('');

    try {
      const check =
        verify ??
        ((p: string) =>
          invoke<boolean>('verify_master_password', { password: p }));

      const ok = await check(password);
      if (!ok) {
        setError('Неверный пароль');
        return;
      }

      onOpenChange(false);
      onSuccess?.(password);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock size={16} className="text-muted-foreground" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <InputGroup>
              <InputGroupInput
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Мастер-пароль"
                autoFocus
                disabled={loading}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-xs"
                  onClick={() => setShowPassword((s) => !s)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={!password || loading}>
            {loading && <Loader2 size={14} className="mr-2 animate-spin" />}
            {loading ? 'Проверка...' : 'Подтвердить'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
