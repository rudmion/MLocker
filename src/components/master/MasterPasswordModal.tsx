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
import { Input } from '@/components/ui/input';
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
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Мастер-пароль"
                autoFocus
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
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
