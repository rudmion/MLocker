import { toast } from 'sonner';
import { CircleCheckBig, CircleX, Trash2, AlertTriangle } from 'lucide-react';

export const notifications = {
  sectionCreated: () =>
    toast.success('Раздел создан', {
      icon: <CircleCheckBig className="text-green-500 pe-1" />,
    }),

  sectionDeleted: () =>
    toast.success('Раздел удалён', {
      icon: <Trash2 className="text-red-500 pe-1" />,
    }),

  sectionUpdated: () =>
    toast.success('Раздел обновлён', {
      icon: <CircleCheckBig className="text-green-500 pe-1" />,
    }),

  recordCreated: () =>
    toast.success('Запись создана', {
      icon: <CircleCheckBig className="text-green-500 pe-1" />,
    }),

  masterPasswordSet: () =>
    toast.success('Мастер-пароль установлен', {
      icon: <CircleCheckBig className="text-green-500 pe-1" />,
    }),

  masterPasswordRecovered: () =>
    toast.success('Мастер-пароль восстановлен', {
      icon: <CircleCheckBig className="text-green-500 pe-1" />,
    }),

  copied: () =>
    toast.success('Скопировано', {
      icon: <CircleCheckBig className="text-green-500 pe-1" />,
    }),

  copyFailed: () =>
    toast.error('Не удалось скопировать', {
      icon: <CircleX className="text-red-500 pe-1" />,
    }),

  saveFailed: () =>
    toast.error('Не удалось сохранить данные', {
      icon: <CircleX className="text-red-500 pe-1" />,
    }),

  loadFailed: () =>
    toast.error('Не удалось загрузить данные', {
      icon: <CircleX className="text-red-500 pe-1" />,
    }),

  invalidMasterPassword: (message: string) =>
    toast.warning(message, {
      icon: <AlertTriangle className="text-yellow-500 pe-1" />,
    }),
};
