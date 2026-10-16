import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  X,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import type { UpdateStatus } from '@/hooks/useUpdateChecker';

interface UpdateNotificationProps {
  status: UpdateStatus;
  currentVersion: string;
  latestVersion: string;
  changelog: string | null;
  downloadProgress: number;
  error: string | null;
  onInstall: () => void;
  onRestart: () => void;
  onDismiss: () => void;
}

export function UpdateNotification({
  status,
  currentVersion,
  latestVersion,
  changelog,
  downloadProgress,
  error,
  onInstall,
  onRestart,
  onDismiss,
}: UpdateNotificationProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  if (status === 'idle' || status === 'checking') return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 rounded-xl border border-border bg-background shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Download size={16} className="text-primary" />
          <span className="text-sm font-medium">Доступно обновление</span>
        </div>
        {status !== 'downloading' && status !== 'installing' && (
          <button
            onClick={onDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {/* Version info */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{currentVersion}</span>
          <span className="text-muted-foreground">&rarr;</span>
          <span className="font-medium text-primary">{latestVersion}</span>
        </div>

        {/* Details button (replaces inline changelog) */}
        {changelog && status === 'hasUpdate' && (
          <button
            type="button"
            onClick={() => setDetailsOpen(true)}
            className="flex w-full items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted"
          >
            <FileText size={14} className="shrink-0" />
            <span className="truncate">
              {changelog.split('\n').find((l) => l.trim()) ?? 'Описание обновления'}
            </span>
          </button>
        )}

        {/* Download progress */}
        {status === 'downloading' && (
          <div className="space-y-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {Math.round(downloadProgress)}%
            </p>
          </div>
        )}

        {/* Installing state */}
        {status === 'installing' && (
          <p className="text-xs text-muted-foreground text-center">
            Установка обновления...
          </p>
        )}

        {/* Installed state */}
        {status === 'installed' && (
          <div className="flex items-center gap-2 text-sm text-green-500">
            <CheckCircle2 size={14} />
            <span>Обновление установлено</span>
          </div>
        )}

        {/* Error */}
        {status === 'error' && error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        {status === 'hasUpdate' && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setDetailsOpen(true)}
            >
              Подробнее
            </Button>
            <Button size="sm" className="flex-1" onClick={onInstall}>
              Обновить
            </Button>
          </div>
        )}

        {status === 'installed' && (
          <Button size="sm" className="w-full" onClick={onRestart}>
            <RotateCcw size={14} className="mr-2" />
            Перезапустить
          </Button>
        )}

        {status === 'error' && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onDismiss}
          >
            Закрыть
          </Button>
        )}
      </div>

      {/* Details modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Обновление до версии {latestVersion}</DialogTitle>
            <DialogDescription>
              Текущая версия {currentVersion} &rarr; {latestVersion}
            </DialogDescription>
          </DialogHeader>

          {changelog ? (
            <div className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm leading-relaxed text-muted-foreground">
              {changelog}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Описание обновления недоступно.
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Позже
            </Button>
            <Button
              onClick={() => {
                setDetailsOpen(false);
                onInstall();
              }}
            >
              Обновить сейчас
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
