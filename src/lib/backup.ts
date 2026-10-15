import type { CustomField, DataFile, Entry, Section } from '@/components/types/data-types';
import { getPasswordSecurityLevel } from '@/utils/passwordSecurityLevel';
import { sectionIcons } from '@/lib/section-icons';

export const BACKUP_APP_ID = 'MLocker';
export const BACKUP_FORMAT_VERSION = 1;

export type BackupPreview = {
  sections: Section[];
  sectionCount: number;
  entryCount: number;
};

export type ParseBackupResult =
  | { kind: 'invalid'; reason: string }
  | { kind: 'encrypted' }
  | { kind: 'plain'; preview: BackupPreview };

export const backupFileName = (encrypted: boolean): string => {
  const d = new Date();
  const date = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
  return encrypted
    ? `MLocker Backup (encrypted) ${date}.json`
    : `MLocker Backup ${date}.json`;
};

export const buildPlaintextExport = (data: DataFile): string =>
  JSON.stringify(
    {
      app: BACKUP_APP_ID,
      formatVersion: BACKUP_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      sections: data.sections,
    },
    null,
    2,
  );

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const asString = (v: unknown, fallback = ''): string =>
  typeof v === 'string' ? v : fallback;

const nowIso = (): string => new Date().toISOString();

const normalizeCustomField = (raw: unknown, index: number): CustomField => {
  const field = isRecord(raw) ? raw : {};
  return {
    id: asString(field.id) || crypto.randomUUID(),
    key: asString(field.key) || `field-${index + 1}`,
    label: asString(field.label),
    value: asString(field.value),
    hidden: field.hidden === true,
  };
};

const normalizeEntry = (raw: unknown): Entry | null => {
  if (!isRecord(raw)) return null;

  const password = asString(raw.password);
  const createdAt = asString(raw.createdAt) || nowIso();
  const rawFields = Array.isArray(raw.customFields) ? raw.customFields : [];

  return {
    id: asString(raw.id) || crypto.randomUUID(),
    createdAt,
    updatedAt: asString(raw.updatedAt) || createdAt,
    iconUrl: typeof raw.iconUrl === 'string' ? raw.iconUrl : null,
    title: asString(raw.title),
    description: asString(raw.description),
    url: asString(raw.url),
    favourites: raw.favourites === true,
    login: asString(raw.login),
    password,
    loginUpdatedAt: asString(raw.loginUpdatedAt) || createdAt,
    passwordUpdatedAt: asString(raw.passwordUpdatedAt) || createdAt,
    securityLevel: getPasswordSecurityLevel(password),
    customFields: rawFields.map(normalizeCustomField),
  };
};

const normalizeSection = (raw: unknown): Section | null => {
  if (!isRecord(raw)) return null;

  const rawEntries = Array.isArray(raw.entries) ? raw.entries : [];
  const entries = rawEntries
    .map(normalizeEntry)
    .filter((entry): entry is Entry => entry !== null);

  const icon = asString(raw.icon);
  const createdAt = asString(raw.createdAt) || nowIso();

  return {
    id: asString(raw.id) || crypto.randomUUID(),
    createdAt,
    name: asString(raw.name) || 'Импорт',
    entries,
    icon: icon in sectionIcons ? icon : 'Folder',
  };
};

export const parseSectionsArray = (raw: unknown): BackupPreview | null => {
  if (!Array.isArray(raw)) return null;

  const sections = raw
    .map(normalizeSection)
    .filter((section): section is Section => section !== null);

  if (raw.length > 0 && sections.length === 0) return null;

  return {
    sections,
    sectionCount: sections.length,
    entryCount: sections.reduce((sum, s) => sum + s.entries.length, 0),
  };
};

export const parseBackupContent = (raw: string): ParseBackupResult => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: 'invalid', reason: 'Файл не является корректным JSON' };
  }

  if (!isRecord(parsed) || !('sections' in parsed)) {
    return {
      kind: 'invalid',
      reason: 'В файле нет данных (поле sections)',
    };
  }

  const hasMaster = asString(parsed.master_hash) !== '';
  if (hasMaster) {
    return { kind: 'encrypted' };
  }

  const preview = parseSectionsArray(parsed.sections);
  if (!preview) {
    return {
      kind: 'invalid',
      reason: 'Некорректная структура данных в файле',
    };
  }

  return { kind: 'plain', preview };
};
