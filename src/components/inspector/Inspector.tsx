import {
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { InspectorHeader } from './InspectorHeader';
import { InspectorFooter } from './InspectorFooter';
import { InspectorForm } from './InspectorForm';
import { useInspector } from './useInspector';
import { useStore } from '@/store/useStore';

export function Inspector() {
  const {
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
  } = useInspector();

  const setInspectorOpen = useStore((state) => state.setInspectorOpen);
  const setSelectedEntry = useStore((state) => state.setSelectedEntry);

  const handleClose = () => {
    resetFormData();
    setInspectorOpen(false);
    setSelectedEntry(null);
  };

  if (!entry || !formData) {
    return null;
  }

  return (
    <SheetContent
      className="
        flex
        flex-col
        h-screen
      "
      showCloseButton={false}
      onPointerDownOutside={handleClose}
      onEscapeKeyDown={handleClose}
    >
      <SheetHeader className="sr-only">
        <SheetTitle>Инспектор</SheetTitle>

        <SheetDescription>Просмотр и редактирование данных</SheetDescription>
      </SheetHeader>

      <InspectorHeader
        title={formData.title}
        iconUrl={entry.iconUrl}
        onDelete={() => {
          handleDelete();
          handleClose();
        }}
        onClose={handleClose}
      />

      <Separator />

      <div className="inspector-scroll flex-1 overflow-y-auto">
        <InspectorForm formData={formData} setFormData={setFormData} errors={errors} clearError={clearError} />
      </div>

      <Separator />

      <InspectorFooter onAddField={handleAddField} onSave={handleSave} hasChanges={hasChanges} />
    </SheetContent>
  );
}
