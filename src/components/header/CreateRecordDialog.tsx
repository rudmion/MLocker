import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Field, FieldGroup, FieldError } from '@/components/ui/field';
import { Eye, EyeOff, RefreshCcw, Loader2, Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { getPasswordSecurityLevel } from '@/utils/passwordSecurityLevel';
import { generatePassword } from '@/utils/generatePassword';
import { useSettingsStore } from '@/store/useSettingsStore';
import { isValidUrl } from '@/utils/validUrl';
import { invoke } from '@tauri-apps/api/core';

type Props = {
  open: boolean;
  setOpen: (v: boolean) => void;
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  url: string;
  setUrl: (v: string) => void;
  login: string;
  setLogin: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  setFaviconUrl: (url: string) => void;
};

const strengthMap = {
  1: {
    label: 'Слабый',
    color: 'text-red-500',
    stroke: '#ef4444',
    progress: 33,
  },
  2: {
    label: 'Средний',
    color: 'text-yellow-500',
    stroke: '#eab308',
    progress: 66,
  },
  3: {
    label: 'Сильный',
    color: 'text-green-500',
    stroke: '#22c55e',
    progress: 100,
  },
} as const;

type ValidationErrors = {
  title?: string;
  login?: string;
  password?: string;
};

type FaviconStatus = 'idle' | 'downloading' | 'done' | 'error';

export function CreateRecordDialog({
  open,
  setOpen,
  title,
  setTitle,
  description,
  setDescription,
  url,
  setUrl,
  login,
  setLogin,
  password,
  setPassword,
  onSubmit,
  disabled,
  setFaviconUrl,
}: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [faviconStatus, setFaviconStatus] = useState<FaviconStatus>('idle');
  const abortRef = useRef<AbortController | null>(null);

  const securityLevel = getPasswordSecurityLevel(password);

  const strength = strengthMap[securityLevel];

  const radius = 26;
  const circumference = 2 * Math.PI * radius;

  const offset = circumference - (strength.progress / 100) * circumference;

  useEffect(() => {
    if (!open) {
      setFaviconStatus('idle');
      setFaviconUrl('');
      abortRef.current?.abort();
      abortRef.current = null;
      return;
    }

    if (!url || !isValidUrl(url)) {
      setFaviconStatus('idle');
      setFaviconUrl('');
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setFaviconStatus('downloading');

    invoke<string>('download_favicon', { url })
      .then((path) => {
        if (!controller.signal.aborted) {
          setFaviconUrl(path);
          setFaviconStatus('done');
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setFaviconUrl('');
          setFaviconStatus('error');
        }
      });

    return () => {
      controller.abort();
    };
  }, [url, open, setFaviconUrl]);

  const passwordOptions = useSettingsStore((s) => s.passwordOptions);

  const handleGeneratePassword = () => {
    setPassword(generatePassword(passwordOptions));
    setErrors((prev) => ({ ...prev, password: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!title.trim()) {
      newErrors.title = 'Обязательное поле';
    }

    if (!login.trim()) {
      newErrors.login = 'Обязательное поле';
    }

    if (!password) {
      newErrors.password = 'Обязательное поле';
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSubmit();
    }
  };

  const clearError = (field: keyof ValidationErrors) => {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setErrors({});
    }
    setOpen(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-sm flex flex-col max-h-[85vh]"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Создание записи</DialogTitle>
          <DialogDescription className="sr-only">
            Форма создания новой записи
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <div className="dialog-scroll flex-1 overflow-y-auto min-h-0">
          <FieldGroup>
            <Field>
              <Label>
                Наименование <span className="text-destructive">*</span>
              </Label>

              <Input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  clearError('title');
                }}
              />
              {errors.title && <FieldError>{errors.title}</FieldError>}
            </Field>

            <Field>
              <Label>URL</Label>

              <div className="relative">
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="pr-10"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {faviconStatus === 'downloading' && (
                    <Loader2
                      size={16}
                      className="animate-spin text-muted-foreground"
                    />
                  )}
                  {faviconStatus === 'done' && (
                    <Check size={16} className="text-green-500" />
                  )}
                </div>
              </div>
            </Field>

            <Field>
              <Label>
                Логин <span className="text-destructive">*</span>
              </Label>

              <Input
                value={login}
                onChange={(e) => {
                  setLogin(e.target.value);
                  clearError('login');
                }}
              />
              {errors.login && <FieldError>{errors.login}</FieldError>}
            </Field>

            <Field>
              <Label>
                Пароль <span className="text-destructive">*</span>
              </Label>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type="text"
                    style={
                      showPassword
                        ? undefined
                        : ({
                            WebkitTextSecurity: 'disc',
                          } as React.CSSProperties)
                    }
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearError('password');
                    }}
                    className="pr-10"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="
                      absolute
                      right-3
                      top-1/2
                      -translate-y-1/2
                      text-muted-foreground
                      hover:text-foreground
                      transition-colors
                    "
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleGeneratePassword}
                  type="button"
                >
                  <RefreshCcw />
                </Button>
              </div>

              {errors.password && <FieldError>{errors.password}</FieldError>}

              {password.length > 0 && (
                <div className="mt-4 flex items-center gap-3">
                  <div className="relative h-16 w-16">
                    <svg className="h-16 w-16 -rotate-90">
                      <circle
                        cx="32"
                        cy="32"
                        r={radius}
                        stroke="#e5e7eb"
                        strokeWidth="5"
                        fill="transparent"
                      />

                      <circle
                        cx="32"
                        cy="32"
                        r={radius}
                        stroke={strength.stroke}
                        strokeWidth="5"
                        fill="transparent"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        style={{
                          transition: 'all 0.3s ease',
                        }}
                      />
                    </svg>

                    <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                      {strength.progress}%
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">
                      Сложность пароля
                    </p>

                    <p className={`font-medium ${strength.color}`}>
                      {strength.label}
                    </p>
                  </div>
                </div>
              )}
            </Field>

            <Field>
              <Label>Описание</Label>

              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Введите описание"
                maxLength={300}
              />
              <p className="text-xs text-muted-foreground text-right">
                {description.length}/300
              </p>
            </Field>
          </FieldGroup>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={disabled}>
            Создать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
