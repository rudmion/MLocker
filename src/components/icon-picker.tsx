import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { getSectionIcon, sectionIconNames } from '@/lib/section-icons';

type IconPickerProps = {
  value: string;
  onChange: (name: string) => void;
};

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);

  const SelectedIcon = getSectionIcon(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Выбрать иконку"
          title="Выбрать иконку"
        >
          <SelectedIcon />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-56 p-2">
        <div className="grid grid-cols-5 gap-1">
          {sectionIconNames.map((name) => {
            const Icon = getSectionIcon(name);
            const isActive = name === value;

            return (
              <button
                key={name}
                type="button"
                title={name}
                aria-label={name}
                onClick={() => {
                  onChange(name);
                  setOpen(false);
                }}
                className={cn(
                  'flex size-9 items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground',
                  isActive && 'bg-accent text-accent-foreground ring-1 ring-primary'
                )}
              >
                <Icon className="size-4" />
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
