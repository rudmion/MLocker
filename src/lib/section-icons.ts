import type { LucideIcon } from 'lucide-react';
import {
  Folder,
  Star,
  Heart,
  KeyRound,
  Lock,
  LockKeyhole,
  Shield,
  ShieldCheck,
  Fingerprint,
  Vault,
  FolderLock,
  Briefcase,
  Wallet,
  CreditCard,
  Landmark,
  Book,
  Users,
  Globe,
  Server,
  Mail,
} from 'lucide-react';

export const sectionIcons: Record<string, LucideIcon> = {
  Folder,
  Star,
  Heart,
  KeyRound,
  Lock,
  LockKeyhole,
  Shield,
  ShieldCheck,
  Fingerprint,
  Vault,
  FolderLock,
  Briefcase,
  Wallet,
  CreditCard,
  Landmark,
  Book,
  Users,
  Globe,
  Server,
  Mail,
};

export const sectionIconNames: string[] = Object.keys(sectionIcons);

export const DEFAULT_SECTION_ICON = 'Folder';

export function getSectionIcon(name?: string | null): LucideIcon {
  if (name && sectionIcons[name]) return sectionIcons[name];
  return sectionIcons[DEFAULT_SECTION_ICON];
}
