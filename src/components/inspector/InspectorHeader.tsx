import { convertFileSrc } from '@tauri-apps/api/core';

import { SheetHeader } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { XIcon } from 'lucide-react';

import { DeleteDialog } from './DeleteDialog';

interface Props {
  title: string;
  iconUrl?: string | null;
  onDelete: () => void;
  onClose: () => void;
}

export function InspectorHeader({ title, iconUrl, onDelete, onClose }: Props) {
  return (
    <SheetHeader className="flex flex-row items-center gap-3 pb-0">
      <img
        src={
          iconUrl
            ? convertFileSrc(iconUrl)
            : '/material-icon-theme_folder-docs.svg'
        }
        className="w-[20px] h-[20px] rounded-sm"
        alt="Logo"
      />

      <p className="font-medium max-w-[200px] truncate whitespace-nowrap overflow-hidden">
        {title || 'Без названия'}
      </p>

      <DeleteDialog onDelete={onDelete} />

      <div className="ms-auto flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <XIcon />
          <span className="sr-only">Close</span>
        </Button>
      </div>
    </SheetHeader>
  );
}
