import { SheetFooter } from '@/components/ui/sheet';

import { Button } from '@/components/ui/button';
import { Loader2, Plus, Save } from 'lucide-react';
import { useStore } from '@/store/useStore';

interface Props {
  onAddField: () => void;
  onSave: () => void;
  hasChanges: boolean;
}

export function InspectorFooter({ onAddField, onSave, hasChanges }: Props) {
  const isSaving = useStore((state) => state.isSaving);

  return (
    <SheetFooter
      className="
        pt-0
        flex
        flex-row
        items-center
        justify-between
      "
    >
      <Button
        type="button"
        onClick={onAddField}
        variant="outline"
        className="transition-all duration-200"
      >
        <Plus /> поле
      </Button>

      <Button type="button" size="icon" onClick={onSave} disabled={isSaving || !hasChanges}>
        {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
      </Button>
    </SheetFooter>
  );
}
