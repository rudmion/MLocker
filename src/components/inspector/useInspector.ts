import { useEffect, useMemo, useState, createElement } from 'react';

import { useStore } from '@/store/useStore';

import { Entry, CustomField } from '@/components/types/data-types';
import { toast } from 'sonner';
import { CheckCircle2, AlertCircle } from 'lucide-react';

type InspectorFormState = {
  title: string;
  description: string;
  url: string;
  login: string;
  password: string;
  securityLevel: number;
  customFields: CustomField[];
  iconUrl: string;
  passwordUpdatedAt: string;
};

type ValidationErrors = {
  title?: string;
  login?: string;
  password?: string;
};

export function useInspector() {
  const data = useStore((state) => state.data);
  const updateEntry = useStore((state) => state.updateEntry);
  const removeEntry = useStore((state) => state.removeEntry);
  const selectedEntryId = useStore((state) => state.selectedEntryId);
  const setSelectedEntry = useStore((state) => state.setSelectedEntry);
  const setInspectorOpen = useStore((state) => state.setInspectorOpen);

  const entry = useMemo((): (Entry & { sectionId: string }) | undefined => {
    if (!data || !selectedEntryId) return undefined;

    for (const section of data.sections) {
      const found = section.entries.find((e) => e.id === selectedEntryId);

      if (found) {
        return {
          ...found,
          sectionId: section.id,
        };
      }
    }

    return undefined;
  }, [data, selectedEntryId]);

  const [formData, setFormData] = useState<InspectorFormState | null>(null);
  const [initialFormData, setInitialFormData] = useState<InspectorFormState | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});

  useEffect(() => {
    if (!entry) {
      setFormData(null);
      setInitialFormData(null);
      return;
    }

    const initial = {
      title: entry.title,
      description: entry.description ?? '',
      url: entry.url,
      login: entry.login,
      password: entry.password,
      securityLevel: entry.securityLevel,
      customFields: entry.customFields,
      iconUrl: entry.iconUrl ?? '',
      passwordUpdatedAt: entry.passwordUpdatedAt,
    };

    setFormData(initial);
    setInitialFormData(initial);
  }, [entry]);

  const hasChanges = useMemo(() => {
    if (!formData || !initialFormData) return false;
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  }, [formData, initialFormData]);

  const validate = (): boolean => {
    if (!formData) return false;
    const newErrors: ValidationErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Обязательное поле';
    if (!formData.login.trim()) newErrors.login = 'Обязательное поле';
    if (!formData.password) newErrors.password = 'Обязательное поле';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearError = (field: keyof ValidationErrors) => {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSave = () => {
    if (!entry || !formData) return;

    if (!validate()) return;

    const hasEmptyLabel = formData.customFields.some(
      (f) => f.label.trim() === '' && f.value.trim() !== '',
    );
    if (hasEmptyLabel) {
      toast.error('Заполните названия всех кастомных полей', {
        icon: createElement(AlertCircle, { className: 'text-red-500 pe-1' }),
      });
      return;
    }

    const validCustomFields = formData.customFields.filter(
      (f) => f.label.trim() !== '' && f.value.trim() !== '',
    );

    const droppedCount =
      formData.customFields.length - validCustomFields.length;

    updateEntry(entry.sectionId, entry.id, {
      title: formData.title,
      description: formData.description,
      url: formData.url,
      login: formData.login,
      password: formData.password,
      securityLevel: formData.securityLevel,
      customFields: validCustomFields,
      iconUrl: formData.iconUrl,
      passwordUpdatedAt: formData.passwordUpdatedAt,
    });

    if (droppedCount > 0) {
      toast.success(
        `Сохранено. ${droppedCount} поле(ей) без значения удалено.`,
        {
          icon: createElement(CheckCircle2, {
            className: 'text-green-500 pe-1',
          }),
        },
      );
    } else {
      toast.success('Изменения сохранены', {
        icon: createElement(CheckCircle2, { className: 'text-green-500 pe-1' }),
      });
    }

    setInspectorOpen(false);
    setSelectedEntry(null);
  };

  const handleDelete = () => {
    if (!entry) return;

    removeEntry(entry.sectionId, entry.id);
    setSelectedEntry(null);
    toast.success('Запись удалена', {
      icon: createElement(CheckCircle2, { className: 'text-green-500' }),
    });
  };

  const handleAddField = () => {
    setFormData((prev) => {
      if (!prev) return prev;

      const newField: CustomField = {
        id: crypto.randomUUID(),
        key: '',
        label: '',
        value: '',
        hidden: false,
      };

      return {
        ...prev,
        customFields: [...prev.customFields, newField],
      };
    });
  };

  const resetFormData = () => {
    setFormData(null);
    setInitialFormData(null);
    setErrors({});
  };

  return {
    entry,
    formData,
    setFormData,
    hasChanges,
    errors,
    clearError,
    handleSave,
    handleDelete,
    handleAddField,
    resetFormData,
  };
}
