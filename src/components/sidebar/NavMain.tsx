import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuAction,
  SidebarGroupLabel,
  useSidebar,
} from '@/components/ui/sidebar';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import {
  Ellipsis,
  Trash2,
  Folder,
  Book,
  Wallet,
  Briefcase,
  Users,
  Plus,
  Layers,
  PencilLine,
} from 'lucide-react';

import { useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useStore } from '@/store/useStore';
import { notifications } from '@/lib/notifications';

const iconMap = {
  Folder,
  Book,
  Wallet,
  Briefcase,
  Users,
  Plus,
};

function ConditionalTooltip({
  children,
  content,
  show,
}: {
  children: React.ReactNode;
  content: string;
  show: boolean;
}) {
  if (!show) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{content}</TooltipContent>
    </Tooltip>
  );
}

export function NavMain() {
  const data = useStore((state) => state.data);
  const removeSection = useStore((state) => state.removeSection);
  const selectedSectionId = useStore((state) => state.selectedSectionId);
  const setSelectedSection = useStore((state) => state.setSelectedSection);
  const { state } = useSidebar();

  const isCollapsed = state === 'collapsed';
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const updateSection = useStore((state) => state.updateSection);

  const handleRemoveSection = (sectionId: string) => {
    removeSection(sectionId);
    setSelectedSection('all');
    setDeleteTarget(null);
    notifications.sectionDeleted();
  };

  const handleUpdateSection = () => {
    if (!editTarget || !editName.trim()) return;

    updateSection(editTarget, { name: editName.trim() });
    setEditTarget(null);
    setEditName('');
    notifications.sectionUpdated();
  };

  const sections = data?.sections ?? [];

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu className="gap-1 mt-1">
            <SidebarGroupLabel>Разделы</SidebarGroupLabel>
            <SidebarMenuItem>
              <ConditionalTooltip content="Все записи" show={isCollapsed}>
                <SidebarMenuButton asChild>
                  <button
                    onClick={() => setSelectedSection('all')}
                    className={`
                      flex
                      items-center
                      gap-2
                      w-full
                      rounded-sm
                      px-2
                      py-1.5
                      transition-colors

                      ${
                        selectedSectionId === 'all'
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-accent/50'
                      }
                    `}
                  >
                    <Layers className="size-4" />

                    <span>Все записи</span>
                  </button>
                </SidebarMenuButton>
              </ConditionalTooltip>
            </SidebarMenuItem>

            {sections.map((section) => {
              const Icon =
                iconMap[section.icon as keyof typeof iconMap] || Folder;

              return (
                <SidebarMenuItem key={section.id}>
                  <ConditionalTooltip content={section.name} show={isCollapsed}>
                    <SidebarMenuButton asChild>
                      <button
                        onClick={() => setSelectedSection(section.id)}
                        className={`
                            flex
                            items-center
                            gap-2
                            w-full
                            rounded-sm
                            px-2
                            py-1.5
                            transition-colors

                            ${
                              selectedSectionId === section.id
                                ? 'bg-accent text-accent-foreground'
                                : 'hover:bg-accent/50'
                            }
                          `}
                      >
                        <Icon className="size-4 shrink-0" />

                        <span className="truncate">{section.name}</span>
                      </button>
                    </SidebarMenuButton>
                  </ConditionalTooltip>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuAction
                        showOnHover
                        className="
                            rounded
                            data-[state=open]:bg-accent
                          "
                      >
                        <Ellipsis className="size-4" />

                        <span className="sr-only">Действия</span>
                      </SidebarMenuAction>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-full">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditTarget(section.id);
                          setEditName(section.name);
                        }}
                      >
                        <PencilLine className="size-4" />

                        <span>Редактировать</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDeleteTarget(section.id)}
                      >
                        <Trash2 className="size-4" />

                        <span>Удалить</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить раздел?</AlertDialogTitle>
            <AlertDialogDescription>
              Все записи в этом разделе будут удалены. Это действие нельзя
              отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && handleRemoveSection(deleteTarget)}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать раздел</DialogTitle>
          </DialogHeader>
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleUpdateSection();
            }}
            placeholder="Название раздела"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Отмена
            </Button>
            <Button onClick={handleUpdateSection}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
