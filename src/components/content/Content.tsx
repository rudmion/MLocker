import { Records } from '@/components/content/Records';
import { StatsCards } from '@/components/content/StatsCards';
import { Sheet } from '@/components/ui/sheet';
import { Inspector } from '@/components/inspector/Inspector';
import { useStore } from '@/store/useStore';

export function Content() {
  const inspectorOpen = useStore((state) => state.inspectorOpen);
  const setInspectorOpen = useStore((state) => state.setInspectorOpen);

  return (
    <div className="flex flex-col gap-2.5 px-0.75 mb-3 mt-0.5">
      <StatsCards />
      <Records />
      <Sheet open={inspectorOpen} onOpenChange={setInspectorOpen}>
        <Inspector />
      </Sheet>
    </div>
  );
}
