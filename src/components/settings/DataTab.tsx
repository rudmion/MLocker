import { useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { save as saveDialog, open as openDialog } from '@tauri-apps/plugin-dialog';
import {
  AlertTriangle,
  Check,
  FileJson,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
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
import { useStore } from '@/store/useStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useMasterStateStore } from '@/store/useMasterStateStore';
import { notifications } from '@/lib/notifications';
import { cn } from '@/lib/utils';
import {
  backupFileName,
  buildPlaintextExport,
  parseBackupContent,
  parseSectionsArray,
  type BackupPreview,
} from '@/lib/backup';
import { MasterPasswordModal } from '@/components/master/MasterPasswordModal';

const JSON_FILTERS = [{ name: 'JSON', extensions: ['json'] }];

export function DataTab() {
  const masterPasswordEnabled = useSettingsStore(
    (s) => s.masterPasswordEnabled,
  );
  const data = useStore((s) => s.data);
  const replaceData = useStore((s) => s.replaceData);
  const mergeData = useStore((s) => s.mergeData);
  const setSettingsOpen = useSettingsStore((s) => s.setSettingsOpen);
  const setMasterState = useMasterStateStore((s) => s.setMasterState);

  const totalEntries = (data?.sections ?? []).reduce(
    (sum, section) => sum + (section.entries?.length ?? 0),
    0,
  );
  const hasEntries = totalEntries > 0;

  const [exportIntent, setExportIntent] = useState<
    'plain' | 'encrypted' | null
  >(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [plainWarningOpen, setPlainWarningOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const [importEncryptedRaw, setImportEncryptedRaw] = useState<string | null>(
    null,
  );
  const [importPreview, setImportPreview] = useState<BackupPreview | null>(
    null,
  );
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);

  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetAcknowledged, setResetAcknowledged] = useState(false);

  const decryptedBackupRef = useRef<string | null>(null);

  const writeExportFile = async (content: string, encrypted: boolean) => {
    try {
      const path = await saveDialog({
        title: 'Сохранить резервную копию',
        defaultPath: backupFileName(encrypted),
        filters: JSON_FILTERS,
      });
      if (!path) return;

      await invoke('export_backup_file', { path, content });
      notifications.exportCompleted();
      setSettingsOpen(false);
    } catch (e) {
      console.error('export error:', e);
      notifications.exportFailed();
    }
  };

  const proceedPlainExport = async () => {
    if (!data) return;
    await writeExportFile(buildPlaintextExport(data), false);
  };

  const proceedEncryptedExport = async () => {
    try {
      const raw = await invoke<string>('read_raw_vault');
      await writeExportFile(raw, true);
    } catch (e) {
      console.error('export error:', e);
      notifications.exportFailed();
    }
  };

  const handlePlainExportClick = () => {
    if (!hasEntries) return;
    if (masterPasswordEnabled) {
      setImportEncryptedRaw(null);
      setExportIntent('plain');
      setPasswordModalOpen(true);
    } else {
      setAcknowledged(false);
      setPlainWarningOpen(true);
    }
  };

  const handleEncryptedExportClick = () => {
    if (!hasEntries || !masterPasswordEnabled) return;
    setImportEncryptedRaw(null);
    setExportIntent('encrypted');
    setPasswordModalOpen(true);
  };

  const handlePasswordSuccess = () => {
    if (exportIntent === 'plain') {
      setExportIntent(null);
      setAcknowledged(false);
      setPlainWarningOpen(true);
    } else if (exportIntent === 'encrypted') {
      setExportIntent(null);
      void proceedEncryptedExport();
    } else if (importEncryptedRaw !== null) {
      const decrypted = decryptedBackupRef.current;
      decryptedBackupRef.current = null;
      setImportEncryptedRaw(null);
      if (!decrypted) return;

      try {
        const preview = parseSectionsArray(JSON.parse(decrypted));
        if (!preview) {
          notifications.invalidBackupFile(
            'Некорректная структура данных в файле',
          );
          return;
        }
        setImportPreview(preview);
        setImportConfirmOpen(true);
      } catch {
        notifications.invalidBackupFile(
          'Некорректная структура данных в файле',
        );
      }
    }
  };

  const handleImportClick = async () => {
    try {
      const path = await openDialog({
        title: 'Выберите файл резервной копии',
        filters: JSON_FILTERS,
        multiple: false,
      });
      if (!path || Array.isArray(path)) return;

      const raw = await invoke<string>('read_backup_file', { path });
      const parsed = parseBackupContent(raw);

      if (parsed.kind === 'invalid') {
        notifications.invalidBackupFile(parsed.reason);
        return;
      }

      if (parsed.kind === 'plain') {
        setImportPreview(parsed.preview);
        setImportConfirmOpen(true);
        return;
      }

      setExportIntent(null);
      setImportEncryptedRaw(raw);
      setPasswordModalOpen(true);
    } catch (e) {
      console.error('import error:', e);
      notifications.importFailed();
    }
  };

  const finishImport = (mode: 'replace' | 'merge') => {
    if (!importPreview) return;

    if (mode === 'replace') {
      replaceData(importPreview.sections);
    } else {
      mergeData(importPreview.sections);
    }

    setImportConfirmOpen(false);
    setImportPreview(null);
    notifications.importCompleted();
    setSettingsOpen(false);
  };

  const verifyBackupPassword = async (password: string): Promise<boolean> => {
    if (importEncryptedRaw === null) return false;
    try {
      const decrypted = await invoke<string>('decrypt_backup', {
        content: importEncryptedRaw,
        password,
      });
      decryptedBackupRef.current = decrypted;
      return true;
    } catch {
      decryptedBackupRef.current = null;
      return false;
    }
  };

  const handleFullReset = async () => {
    try {
      await invoke('full_reset');
      setResetConfirmOpen(false);
      setResetAcknowledged(false);
      setSettingsOpen(false);
      notifications.resetCompleted();
      setMasterState('setup');
    } catch (e) {
      console.error('reset error:', e);
      notifications.resetFailed();
    }
  };

  const buttonClass =
    'flex w-full items-start gap-2.5 rounded-lg border p-3 text-left text-sm transition-colors hover:bg-muted disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className="mt-4 space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Экспорт</p>

        <button
          type="button"
          className={buttonClass}
          onClick={handleEncryptedExportClick}
          disabled={!hasEntries || !masterPasswordEnabled}
          title={
            !hasEntries
              ? 'Нет записей для экспорта'
              : !masterPasswordEnabled
                ? 'Включите мастер-пароль, чтобы создать шифрованную копию'
                : undefined
          }
        >
          <ShieldCheck
            size={16}
            className="mt-0.5 shrink-0 text-muted-foreground"
          />
          <div>
            <p className="font-medium">Шифрованная резервная копия</p>
            <p className="text-xs text-muted-foreground">
              {masterPasswordEnabled
                ? 'Восстановление в MLocker с текущим мастер-паролем'
                : 'Недоступно: мастер-пароль выключен'}
            </p>
          </div>
        </button>

        <button
          type="button"
          className={buttonClass}
          onClick={handlePlainExportClick}
          disabled={!hasEntries}
          title={hasEntries ? undefined : 'Нет записей для экспорта'}
        >
          <FileJson
            size={16}
            className="mt-0.5 shrink-0 text-yellow-500 dark:text-yellow-400"
          />
          <div>
            <p className="font-medium">Открытый JSON</p>
            <p className="text-xs text-muted-foreground">
              Для переноса в другие приложения. Все пароли будут в открытом
              виде
            </p>
          </div>
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Импорт</p>

        <button
          type="button"
          className={buttonClass}
          onClick={() => void handleImportClick()}
        >
          <Upload size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
          <div>
            <p className="font-medium">Импортировать из файла</p>
            <p className="text-xs text-muted-foreground">
              Текущие данные будут полностью заменены
            </p>
          </div>
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Сброс</p>

        <button
          type="button"
          className={cn(
            buttonClass,
            'border-destructive/30 bg-destructive/5 hover:border-destructive/40 hover:bg-destructive/10',
          )}
          onClick={() => {
            setResetAcknowledged(false);
            setResetConfirmOpen(true);
          }}
        >
          <Trash2 size={16} className="mt-0.5 shrink-0 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Полный сброс</p>
            <p className="text-xs text-muted-foreground">
              Удалить все записи и сбросить мастер-пароль
            </p>
          </div>
        </button>
      </div>

      <MasterPasswordModal
        open={passwordModalOpen}
        onOpenChange={setPasswordModalOpen}
        title={
          importEncryptedRaw !== null
            ? 'Импорт резервной копии'
            : 'Подтверждение экспорта'
        }
        description={
          importEncryptedRaw !== null
            ? 'Файл зашифрован. Введите мастер-пароль, который использовался при создании копии'
            : 'Введите мастер-пароль для подтверждения экспорта'
        }
        verify={importEncryptedRaw !== null ? verifyBackupPassword : undefined}
        onSuccess={handlePasswordSuccess}
      />

      <AlertDialog
        open={plainWarningOpen}
        onOpenChange={setPlainWarningOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Экспорт в открытом виде?</AlertDialogTitle>
            <AlertDialogDescription>
              Все пароли, логины и заметки будут записаны в файл открытым
              текстом — без шифрования. Любой, кто получит этот файл, получит
              полный доступ к вашим данным.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              Не сохраняйте файл в облачные папки (OneDrive, Dropbox и т.п.) и
              не передавайте его третьим лицам.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setAcknowledged((a) => !a)}
            className="flex w-full items-center gap-2.5 rounded-lg border p-3 text-left text-sm transition-colors hover:bg-muted"
          >
            <span
              className={`flex size-4 shrink-0 items-center justify-center rounded border transition-colors ${
                acknowledged
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input'
              }`}
            >
              {acknowledged && <Check size={12} />}
            </span>
            <span>Я понимаю, что все пароли будут в открытом виде</span>
          </button>

          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              disabled={!acknowledged}
              onClick={() => void proceedPlainExport()}
            >
              Продолжить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={importConfirmOpen}
        onOpenChange={setImportConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Импорт данных</AlertDialogTitle>
            <AlertDialogDescription>
              В файле: {importPreview?.sectionCount ?? 0} разделов,{' '}
              {importPreview?.entryCount ?? 0} записей. Выберите, как
              импортировать данные.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <button
              type="button"
              className={cn(
                buttonClass,
                'border-primary/30 bg-primary/5 hover:border-primary/40 hover:bg-primary/10',
              )}
              onClick={() => finishImport('merge')}
            >
              <Plus size={16} className="mt-0.5 shrink-0 text-primary" />
              <div>
                <p className="font-medium">Объединить</p>
                <p className="text-xs text-muted-foreground">
                  Добавить записи к текущим данным, ничего не перезаписывая
                </p>
              </div>
            </button>

            <button
              type="button"
              className={cn(
                buttonClass,
                'border-destructive/30 bg-destructive/5 hover:border-destructive/40 hover:bg-destructive/10',
              )}
              onClick={() => finishImport('replace')}
            >
              <AlertTriangle
                size={16}
                className="mt-0.5 shrink-0 text-destructive"
              />
              <div>
                <p className="font-medium text-destructive">Заменить</p>
                <p className="text-xs text-muted-foreground">
                  Полностью перезаписать текущие данные. Действие нельзя отменить
                </p>
              </div>
            </button>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Полный сброс приложения?</AlertDialogTitle>
            <AlertDialogDescription>
              Все записи, разделы и мастер-пароль будут удалены безвозвратно.
              Приложение вернётся к начальному экрану создания мастер-ключа.
              Действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <button
            type="button"
            onClick={() => setResetAcknowledged((a) => !a)}
            className="flex w-full items-center gap-2.5 rounded-lg border p-3 text-left text-sm transition-colors hover:bg-muted"
          >
            <span
              className={`flex size-4 shrink-0 items-center justify-center rounded border transition-colors ${
                resetAcknowledged
                  ? 'border-destructive bg-destructive text-destructive-foreground'
                  : 'border-input'
              }`}
            >
              {resetAcknowledged && <Check size={12} />}
            </span>
            <span>Я понимаю, что все данные будут удалены безвозвратно</span>
          </button>

          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={!resetAcknowledged}
              onClick={() => void handleFullReset()}
            >
              Сбросить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
