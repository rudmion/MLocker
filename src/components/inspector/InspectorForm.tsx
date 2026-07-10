import { useEffect, useState } from 'react';

import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';

import {
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';

import { CustomFields } from './CustomFields';

import { CustomField } from '@/components/types/data-types';
import { Button } from '../ui/button';

import { getPasswordSecurityLevel } from '@/utils/passwordSecurityLevel';
import { copyToClipboard } from '@/utils/clipboard';

type InspectorFormState = {
  title: string;
  url: string;
  login: string;
  password: string;
  securityLevel: number;
  customFields: CustomField[];
};

type ValidationErrors = {
  title?: string;
  login?: string;
  password?: string;
};

interface Props {
  formData: InspectorFormState | null;
  setFormData: React.Dispatch<React.SetStateAction<InspectorFormState | null>>;
  errors: ValidationErrors;
  clearError: (field: keyof ValidationErrors) => void;
}

export function InspectorForm({ formData, setFormData, errors, clearError }: Props) {
  const [showPassword, setShowPassword] = useState(false);

  if (!formData) return null;

  // 🔥 securityLevel теперь синхронизирован с password
  useEffect(() => {
    const level = getPasswordSecurityLevel(formData.password);

    setFormData((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        securityLevel: level,
      };
    });
  }, [formData.password, setFormData]);

  const updateField = <K extends keyof InspectorFormState>(
    key: K,
    value: InspectorFormState[K],
  ) => {
    setFormData((prev) => {
      if (!prev) return prev;
      return { ...prev, [key]: value };
    });
  };

  const renderSecurityIcon = (level: number) => {
    if (level === 1) return <ShieldAlert size={18} color="#ef4444" />;
    if (level === 2) return <ShieldAlert size={18} color="#eab308" />;
    return <ShieldCheck size={18} color="#22c55e" />;
  };

  const generatePassword = () => {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()-_=+[]{}|;:,.<>?';
    const all = upper + lower + numbers + symbols;

    const array = new Uint8Array(20);
    crypto.getRandomValues(array);

    const password = Array.from(array)
      .map((byte) => all[byte % all.length])
      .join('');

    updateField('password', password);
  };

  return (
    <div className="grid flex-1 auto-rows-min gap-6 px-4">
      <FieldGroup className="mb-4 w-full">
        {/* TITLE */}
        <Field className="flex-1">
          <FieldLabel>
            Наименование <span className="text-destructive">*</span>
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              value={formData.title}
              onChange={(e) => {
                updateField('title', e.target.value);
                clearError('title');
              }}
              placeholder="Введите название"
            />
          </InputGroup>
          {errors.title && <FieldError>{errors.title}</FieldError>}
        </Field>

        {/* URL */}
        <Field className="flex-1">
          <FieldLabel>Ресурс</FieldLabel>
          <InputGroup>
            <InputGroupInput
              value={formData.url}
              onChange={(e) => updateField('url', e.target.value)}
              placeholder="Введите URL"
            />

            {formData.url && /^https?:\/\//.test(formData.url) && (
              <InputGroupAddon align="inline-end">
                <InputGroupButton asChild size="icon-xs">
                  <a href={formData.url} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>
        </Field>

        {/* LOGIN */}
        <Field className="flex-1">
          <FieldLabel>
            Логин <span className="text-destructive">*</span>
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              value={formData.login}
              onChange={(e) => {
                updateField('login', e.target.value);
                clearError('login');
              }}
              placeholder="Введите логин"
            />

            {formData.login && (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-xs"
                  onClick={() => copyToClipboard(formData.login)}
                >
                  <Copy className="h-4 w-4" />
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>
          {errors.login && <FieldError>{errors.login}</FieldError>}
        </Field>

        {/* PASSWORD */}
        <div className="flex items-end gap-3">
          <Field className="flex-1">
            <FieldLabel>
              Пароль <span className="text-destructive">*</span>
            </FieldLabel>

            <InputGroup className="gap-2 ps-2">
              {renderSecurityIcon(formData.securityLevel)}

              <InputGroupInput
                value={formData.password}
                onChange={(e) => {
                  updateField('password', e.target.value);
                  clearError('password');
                }}
                type={showPassword ? 'text' : 'password'}
                placeholder="Введите пароль"
              />

              {formData.password && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </InputGroupButton>

                  <InputGroupButton
                    size="icon-xs"
                    onClick={() => copyToClipboard(formData.password)}
                  >
                    <Copy className="h-4 w-4" />
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>
            {errors.password && <FieldError>{errors.password}</FieldError>}
          </Field>

          <Button variant="outline" size="icon" onClick={generatePassword}>
            <RefreshCcw />
          </Button>
        </div>

        {/* CUSTOM FIELDS */}
        <CustomFields
          fields={formData.customFields}
          onChange={(customFields) => updateField('customFields', customFields)}
        />
      </FieldGroup>
    </div>
  );
}
