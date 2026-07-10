import { Copy, Pencil, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { copyToClipboard } from '@/utils/clipboard';

interface CustomField {
  key: string;
  id: string;
  label: string;
  value: string;
}

interface Props {
  fields: CustomField[];
  onChange: (fields: CustomField[]) => void;
}

export function CustomFields({ fields, onChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const updateField = (id: string, key: keyof CustomField, value: string) => {
    onChange(
      fields.map((field) =>
        field.id === id ? { ...field, [key]: value } : field,
      ),
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {fields.map((field) => {
        const isEditing = editingId === field.id;
        const showLabelError =
          field.label.trim() === '' && field.value.trim() !== '';
        const showValueError =
          field.label.trim() !== '' && field.value.trim() === '';

        return (
          <div key={field.id} className="flex items-end gap-3">
            <Field className="flex-1">
              <FieldLabel className="flex items-center gap-1">
                {isEditing ? (
                  <Input
                    value={field.label}
                    onChange={(e) =>
                      updateField(field.id, 'label', e.target.value)
                    }
                    className={`h-7 ${showLabelError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    autoFocus
                  />
                ) : (
                  <span className={showLabelError ? 'text-red-500' : ''}>
                    {field.label || 'Кастомное поле'}
                  </span>
                )}

                <Button
                  variant="ghost"
                  size="xs"
                  type="button"
                  onClick={() => {
                    setEditingId(isEditing ? null : field.id);
                  }}
                >
                  {isEditing ? <Check size={14} /> : <Pencil size={14} />}
                </Button>
              </FieldLabel>

              <InputGroup>
                <InputGroupInput
                  value={field.value}
                  onChange={(e) =>
                    updateField(field.id, 'value', e.target.value)
                  }
                  placeholder="Введите значение"
                  className={
                    showValueError
                      ? 'border-red-500 focus-visible:ring-red-500'
                      : ''
                  }
                />

                {field.value && (
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      aria-label="Copy"
                      title="Copy"
                      size="icon-xs"
                      onClick={() => copyToClipboard(field.value)}
                    >
                      <Copy className="h-4 w-4" />
                    </InputGroupButton>
                  </InputGroupAddon>
                )}
              </InputGroup>
            </Field>

            <Button
              variant="outline"
              size="icon"
              type="button"
              aria-label="Удалить поле"
              onClick={() => {
                onChange(fields.filter((f) => f.id !== field.id));
              }}
            >
              <Trash2 />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
