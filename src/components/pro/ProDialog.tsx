import { useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import {
  Check,
  Globe,
  KeyRound,
  Palette,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';

type ProDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const freeFeatures = [
  'Хранение паролей и логинов',
  'Разделы и поиск по записям',
  'Базовый генератор паролей',
  'Мастер-пароль и шифрование данных',
];

const proFeatures = [
  {
    icon: Palette,
    title: 'Создание иконок для разделов',
    description: 'Своя иконка для каждого раздела',
    badge: null,
  },
  {
    icon: SlidersHorizontal,
    title: 'Настройка генерации паролей',
    description: 'Полный контроль над сложностью паролей',
    badge: null,
  },
  {
    icon: Globe,
    title: 'Автозаполение в браузере',
    description: 'Быстрый ввод данных на сайтах',
    badge: 'Скоро',
  },
];

export function ProDialog({ open, onOpenChange }: ProDialogProps) {
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setShowKeyForm(false);
      setLicenseKey('');
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            MLocker PRO
          </DialogTitle>
          <DialogDescription>
            Оплатите один раз и получите расширенные возможности приложения.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Сейчас — бесплатно
            </p>
            <ul className="space-y-1.5">
              {freeFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <Check className="size-3.5 shrink-0 text-muted-foreground" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
                <Sparkles className="size-3.5" />
                MLocker PRO
              </p>
              <Badge>60 BYN</Badge>
            </div>
            <ul className="space-y-2">
              {proFeatures.map(({ icon: Icon, title, description, badge }) => (
                <li key={title} className="flex items-start gap-2">
                  <Icon className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium">{title}</p>
                      {badge && (
                        <Badge
                          variant="secondary"
                          className="h-4 px-1.5 text-[10px]"
                        >
                          {badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter>
          {showKeyForm ? (
            <div className="flex w-full flex-col gap-2">
              <Label
                htmlFor="pro-license-key"
                className="text-xs text-muted-foreground"
              >
                Ключ активации придёт на почту после оплаты
              </Label>
              <Input
                id="pro-license-key"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="MLK-XXXX-XXXX-XXXX"
                autoComplete="off"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setShowKeyForm(false)}
                >
                  Назад
                </Button>
                <Button type="button" className="flex-1">
                  Активировать
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              className="w-full"
              onClick={() => setShowKeyForm(true)}
            >
              <KeyRound className="mr-2 size-4" />
              Разблокировать PRO версию
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
