import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Download, Clock, Loader2 } from 'lucide-react';

type UpdateDialogProps = {
  latestVersion: string;
  currentVersion: string;
  changelog: string | null;
  downloading: boolean;
  downloadProgress: number;
  onInstall: () => void;
  onDismiss: () => void;
};

export function UpdateDialog({
  latestVersion,
  currentVersion,
  changelog,
  downloading,
  downloadProgress,
  onInstall,
  onDismiss,
}: UpdateDialogProps) {
  return (
    <AlertDialog open onOpenChange={(open) => !open && onDismiss()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Доступно обновление</AlertDialogTitle>
          <AlertDialogDescription>
            Версия {latestVersion} доступна для скачивания. Текущая версия:{' '}
            {currentVersion}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {changelog && (
          <div className="max-h-40 overflow-y-auto rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
            <p className="whitespace-pre-wrap">{changelog}</p>
          </div>
        )}

        {downloading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Загрузка обновления...</span>
              <span>{downloadProgress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDismiss} disabled={downloading}>
            <Clock size={14} className="mr-1.5" />
            Позже
          </AlertDialogCancel>
          <AlertDialogAction onClick={onInstall} disabled={downloading}>
            {downloading ? (
              <Loader2 size={14} className="mr-1.5 animate-spin" />
            ) : (
              <Download size={14} className="mr-1.5" />
            )}
            {downloading ? 'Загрузка...' : 'Обновить сейчас'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
