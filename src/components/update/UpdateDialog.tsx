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
import { Download, Clock } from 'lucide-react';

type UpdateDialogProps = {
  latestVersion: string;
  currentVersion: string;
  changelog: string | null;
  onInstall: () => void;
  onDismiss: () => void;
};

export function UpdateDialog({
  latestVersion,
  currentVersion,
  changelog,
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

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDismiss}>
            <Clock size={14} className="mr-1.5" />
            Позже
          </AlertDialogCancel>
          <AlertDialogAction onClick={onInstall}>
            <Download size={14} className="mr-1.5" />
            Обновить сейчас
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
