import {
  X,
  Download,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ChevronRight,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

type UpdateNotificationProps = {
  latestVersion: string;
  currentVersion: string;
  changelog: string | null;
  downloading: boolean;
  downloadProgress: number;
  downloadedBytes: number;
  totalBytes: number;
  installing: boolean;
  installPath: string;
  needsRestart: boolean;
  logs: string[];
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
  downloadedBytes,
  totalBytes,
  installing,
  installPath,
  needsRestart,
  logs,
  onInstall,
  onRestart,
  onDismiss,
}: UpdateNotificationProps) {
  const [showChangelog, setShowChangelog] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

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
              {downloading ? (
                <>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Loader2 size={12} className="animate-spin" />
                      Загрузка обновления...
                    </span>
                    <span className="font-medium text-foreground">
                      {downloadProgress}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                  {totalBytes > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      Загружено: {formatBytes(downloadedBytes)} из{' '}
                      {formatBytes(totalBytes)}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 size={12} className="animate-spin" />
                    Установка обновления...
                  </div>
                  {installPath && (
                    <p
                      className="text-[10px] text-muted-foreground truncate"
                      title={installPath}
                    >
                      Установка в: {installPath}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Installed - needs restart */}
          {needsRestart && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Обновление установлено. Требуется перезапуск для активации новой
                версии.
              </p>
              {installPath && (
                <p
                  className="text-[10px] text-muted-foreground truncate"
                  title={installPath}
                >
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
                {showChangelog ? (
                  <ChevronUp size={12} />
                ) : (
                  <ChevronDown size={12} />
                )}
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

        {/* Log panel */}
        {logs.length > 0 && (
          <div className="border-t border-border">
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="flex w-full items-center gap-1.5 px-4 py-2 text-[10px] text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <ChevronRight
                size={10}
                className={`transition-transform ${showLogs ? 'rotate-90' : ''}`}
              />
              Журнал обновления ({logs.length})
            </button>
            {showLogs && (
              <div className="max-h-28 overflow-y-auto border-t border-border bg-muted/30 px-4 py-2">
                {logs.map((log, i) => (
                  <p key={i} className="text-[10px] text-muted-foreground font-mono leading-relaxed">
                    {log}
                  </p>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        )}

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
