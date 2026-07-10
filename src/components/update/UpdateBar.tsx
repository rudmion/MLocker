import { Progress } from '@/components/ui/progress';
import { Download, Loader2, RotateCw, X } from 'lucide-react';

type UpdateBarProps = {
  latestVersion: string;
  status: 'idle' | 'downloading' | 'installing' | 'restart_needed' | 'error';
  downloadProgress: number;
  onInstall: () => void;
  onRestart: () => void;
  onDismiss: () => void;
};

export function UpdateBar({
  latestVersion,
  status,
  downloadProgress,
  onInstall,
  onRestart,
  onDismiss,
}: UpdateBarProps) {
  if (status === 'idle') return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-3 px-4 py-3">
        {status === 'downloading' && (
          <>
            <Loader2 size={16} className="shrink-0 animate-spin text-primary" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-muted-foreground truncate">
                  Загрузка обновления v{latestVersion}...
                </span>
                <span className="text-muted-foreground tabular-nums ml-2">{downloadProgress}%</span>
              </div>
              <Progress value={downloadProgress} className="h-1.5" />
            </div>
            <button
              onClick={onDismiss}
              className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X size={14} />
            </button>
          </>
        )}

        {status === 'installing' && (
          <>
            <Loader2 size={16} className="shrink-0 animate-spin text-primary" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground truncate">
                  Установка обновления...
                </span>
                <span className="text-muted-foreground tabular-nums ml-2">100%</span>
              </div>
            </div>
            <Progress value={100} className="h-1.5 absolute bottom-0 left-0 right-0" />
          </>
        )}

        {status === 'restart_needed' && (
          <>
            <RotateCw size={16} className="shrink-0 text-green-500" />
            <span className="flex-1 text-sm text-muted-foreground truncate">
              Обновление установлено. Перезапустите приложение.
            </span>
            <button
              onClick={onRestart}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <RotateCw size={12} />
              Перезапустить
            </button>
            <button
              onClick={onDismiss}
              className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X size={14} />
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <Download size={16} className="shrink-0 text-destructive" />
            <span className="flex-1 text-sm text-destructive truncate">
              Ошибка обновления
            </span>
            <button
              onClick={onInstall}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Повторить
            </button>
            <button
              onClick={onDismiss}
              className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
