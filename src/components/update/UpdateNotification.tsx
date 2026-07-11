import { X, Download, Loader2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

type UpdateNotificationProps = {
  latestVersion: string;
  currentVersion: string;
  changelog: string | null;
  downloading: boolean;
  downloadProgress: number;
  installing: boolean;
  installProgress: number;
  installPath: string;
  needsRestart: boolean;
  onInstall: () => void;
  onRestart: () => void;
  onDismiss: () => void;
};

export function UpdateNotification({
  latestVersion,
  currentVersion,
  changelog,
  downloading,
  downloadProgress,
  installing,
  installProgress,
  installPath,
  needsRestart,
  onInstall,
  onRestart,
  onDismiss,
}: UpdateNotificationProps) {
  const [showChangelog, setShowChangelog] = useState(false);

  const progress = installing ? installProgress : downloadProgress;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="rounded-xl border border-border bg-popover shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
              <Download size={14} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Доступно обновление</p>
              <p className="text-xs text-muted-foreground">
                v{currentVersion} → v{latestVersion}
              </p>
            </div>
          </div>
          {!downloading && !installing && !needsRestart && (
            <button
              onClick={onDismiss}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-4 py-3">
          {/* Download/Install Progress */}
          {(downloading || installing) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Loader2 size={12} className="animate-spin" />
                  {downloading ? 'Загрузка обновления...' : 'Установка обновления...'}
                </span>
                <span className="font-medium text-foreground">{progress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {installing && installPath && (
                <p className="text-[10px] text-muted-foreground truncate" title={installPath}>
                  Установка в: {installPath}
                </p>
              )}
            </div>
          )}

          {/* Installed - needs restart */}
          {needsRestart && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Обновление установлено. Требуется перезапуск для активации новой версии.
              </p>
              {installPath && (
                <p className="text-[10px] text-muted-foreground truncate" title={installPath}>
                  Путь установки: {installPath}
                </p>
              )}
            </div>
          )}

          {/* Changelog toggle */}
          {changelog && !downloading && !installing && !needsRestart && (
            <div className="mt-2">
              <button
                onClick={() => setShowChangelog(!showChangelog)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showChangelog ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {showChangelog ? 'Скрыть изменения' : 'Показать изменения'}
              </button>
              {showChangelog && (
                <div className="mt-2 max-h-24 overflow-y-auto rounded-lg border bg-muted/50 p-2 text-xs text-muted-foreground">
                  <p className="whitespace-pre-wrap">{changelog}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {!downloading && !installing && !needsRestart && (
          <div className="flex gap-2 border-t border-border px-4 py-3">
            <button
              onClick={onDismiss}
              className="flex-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Позже
            </button>
            <button
              onClick={onInstall}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Download size={12} />
              Обновить
            </button>
          </div>
        )}

        {needsRestart && (
          <div className="flex border-t border-border px-4 py-3">
            <button
              onClick={onRestart}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <RefreshCw size={12} />
              Перезапустить
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
