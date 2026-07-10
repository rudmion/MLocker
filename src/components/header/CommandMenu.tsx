import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { convertFileSrc } from '@tauri-apps/api/core';
import { copyToClipboard } from '@/utils/clipboard';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function CommandMenu({ open, onOpenChange }: Props) {
  const data = useStore((state) => state.data);
  const sections = data?.sections ?? [];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command>
        <CommandInput placeholder="Поиск записей..." />

        <CommandList>
          <CommandEmpty>Записи не найдены</CommandEmpty>

          {sections.map((section) => {
            const entries = section.entries ?? [];

            if (entries.length === 0) return null;

            return (
              <CommandGroup key={section.id} heading={section.name}>
                {entries.map((record) => {
                  const iconSrc = record.iconUrl
                    ? convertFileSrc(record.iconUrl)
                    : '/material-icon-theme_folder-docs.svg';

                  return (
                    <CommandItem
                      key={record.id}
                      value={`${record.title} ${record.login} ${record.url ?? ''}`}
                      className="flex items-center gap-3"
                    >
                      <div className="flex w-full items-center">
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={iconSrc}
                            alt=""
                            className="w-5 h-5 object-contain"
                          />
                          <span className="w-100 truncate whitespace-nowrap overflow-hidden">
                            {record.title}
                          </span>
                        </div>

                        <div className="ml-auto flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(record.login)}
                            className="group/copy overflow-hidden transition-all duration-300 pe-2"
                          >
                            <Copy />
                            <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 group-hover/copy:max-w-[80px] group-hover/copy:opacity-100">
                              Логин
                            </span>
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(record.password)}
                            className="group/copy overflow-hidden transition-all duration-300 pe-2"
                          >
                            <Copy />
                            <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 group-hover/copy:max-w-[80px] group-hover/copy:opacity-100">
                              Пароль
                            </span>
                          </Button>
                        </div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            );
          })}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
