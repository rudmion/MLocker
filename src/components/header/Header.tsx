import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '../ui/button';
import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { CommandMenu } from './CommandMenu';
import { CreateRecordDialog } from './CreateRecordDialog';
import { Plus, Search, Settings, ArrowUpDown } from 'lucide-react';
import { useCreateRecordDialogStore } from '@/store/createRecordDialog';
import { getPasswordSecurityLevel } from '@/utils/passwordSecurityLevel';
import { notifications } from '@/lib/notifications';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSortStore } from '@/store/useSortStore';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { useSettingsStore } from '@/store/useSettingsStore';

export function Header() {
  const data = useStore((state) => state.data);
  const addEntry = useStore((state) => state.addEntry);
  const selectedSectionId = useStore((state) => state.selectedSectionId);
  const setSettingsOpen = useSettingsStore((state) => state.setSettingsOpen);

  const sectionSorts = useSortStore((state) => state.sectionSorts);
  const toggleSort = useSortStore((state) => state.toggleSort);
  const activeSorts = sectionSorts[selectedSectionId] ?? [];

  const openCreate = useCreateRecordDialogStore((state) => state.open);
  const setOpenCreate = useCreateRecordDialogStore((state) => state.setOpen);

  const currentSection = data?.sections.find((s) => s.id === selectedSectionId);

  const sections = data?.sections ?? [];
  const totalRecords = sections.reduce(
    (sum, s) => sum + (s.entries?.length ?? 0),
    0,
  );
  const hasAnyRecords = totalRecords > 0;
  const currentSectionCount =
    selectedSectionId === 'all'
      ? totalRecords
      : (currentSection?.entries?.length ?? 0);

  const [openSearch, setOpenSearch] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');

  useEffect(() => {
    if (!openCreate) {
      setTitle('');
      setDescription('');
      setUrl('');
      setLogin('');
      setPassword('');
      setFaviconUrl('');
    }
  }, [openCreate]);

  useEffect(() => {
    const handler = () => setOpenSearch(true);
    document.addEventListener('open-search', handler);
    return () => document.removeEventListener('open-search', handler);
  }, []);

  const handleCreateEntry = async () => {
    if (!title.trim() || selectedSectionId === 'all') return;

    const securityLevel = getPasswordSecurityLevel(password);

    addEntry(selectedSectionId, {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      iconUrl: faviconUrl,
      title,
      description: description || '',
      favourites: false,
      url,
      login,
      password,
      loginUpdatedAt: new Date().toISOString(),
      passwordUpdatedAt: new Date().toISOString(),
      securityLevel,
      customFields: [],
    });

    setTitle('');
    setDescription('');
    setUrl('');
    setLogin('');
    setPassword('');
    setFaviconUrl('');
    setOpenCreate(false);
    notifications.recordCreated();
  };

  return (
    <>
      <div className="flex justify-between gap-10 pt-1.75 pb-1.5">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarTrigger variant="outline" size="icon" />
            </TooltipTrigger>
            <TooltipContent>Меню</TooltipContent>
          </Tooltip>
          {/* <Separator orientation="vertical" /> */}
          <p className="truncate max-w-[300px]">
            {selectedSectionId === 'all' ? 'Все записи' : currentSection?.name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu modal={false}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="outline"
                    className={currentSectionCount > 0 ? undefined : 'hidden'}
                  >
                    <ArrowUpDown />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Сортировка</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-60 p-1.5">
              <DropdownMenuLabel className="px-2 py-1.5 text-sm font-semibold">
                Сортировка
              </DropdownMenuLabel>
              <DropdownMenuLabel className="px-2 pt-1 pb-1 text-xs font-medium text-muted-foreground">
                По дате
              </DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                className="py-2 pl-2 text-sm"
                checked={activeSorts.includes('date-desc')}
                onCheckedChange={() =>
                  toggleSort(selectedSectionId, 'date-desc')
                }
                onSelect={(e) => e.preventDefault()}
              >
                Новые
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                className="py-2 pl-2 text-sm"
                checked={activeSorts.includes('date-asc')}
                onCheckedChange={() =>
                  toggleSort(selectedSectionId, 'date-asc')
                }
                onSelect={(e) => e.preventDefault()}
              >
                Старые
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuCheckboxItem
                className="py-2 pl-2 text-sm"
                checked={activeSorts.includes('name-asc')}
                onCheckedChange={() =>
                  toggleSort(selectedSectionId, 'name-asc')
                }
                onSelect={(e) => e.preventDefault()}
              >
                По алфавиту (А–Я)
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                onClick={() => setOpenCreate(true)}
                className={`${selectedSectionId === 'all' ? 'hidden' : ''}`}
              >
                <Plus size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Создать запись
              <KbdGroup>
                <Kbd>Ctrl</Kbd>
                <span>+</span>
                <Kbd>+</Kbd>
              </KbdGroup>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                onClick={() => setOpenSearch(true)}
                className={hasAnyRecords ? undefined : 'hidden'}
              >
                <Search />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Поиск
              <KbdGroup>
                <Kbd>Ctrl</Kbd>
                <span>+</span>
                <Kbd>S</Kbd>
              </KbdGroup>
            </TooltipContent>
          </Tooltip>

          <Button
            size="icon"
            variant="outline"
            onClick={() => setSettingsOpen(true)}
            className="transition-all duration-200 me-1.75"
          >
            <Settings />
          </Button>

          <CommandMenu open={openSearch} onOpenChange={setOpenSearch} />

          <CreateRecordDialog
            open={openCreate}
            setOpen={setOpenCreate}
            title={title}
            setTitle={setTitle}
            description={description}
            setDescription={setDescription}
            url={url}
            setUrl={setUrl}
            login={login}
            setLogin={setLogin}
            password={password}
            setPassword={setPassword}
            onSubmit={handleCreateEntry}
            disabled={selectedSectionId === 'all'}
            setFaviconUrl={setFaviconUrl}
          />
        </div>
      </div>
    </>
  );
}
