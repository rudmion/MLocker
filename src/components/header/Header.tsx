import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '../ui/button';
import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { CommandMenu } from './CommandMenu';
import { CreateRecordDialog } from './CreateRecordDialog';
import { Search } from 'lucide-react';
import { useCreateRecordDialogStore } from '@/store/createRecordDialog';
import { getPasswordSecurityLevel } from '@/utils/passwordSecurityLevel';
import { notifications } from '@/lib/notifications';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Kbd, KbdGroup } from '@/components/ui/kbd';

export function Header() {
  const data = useStore((state) => state.data);
  const addEntry = useStore((state) => state.addEntry);
  const selectedSectionId = useStore((state) => state.selectedSectionId);

  const openCreate = useCreateRecordDialogStore((state) => state.open);
  const setOpenCreate = useCreateRecordDialogStore((state) => state.setOpen);

  const currentSection = data?.sections.find((s) => s.id === selectedSectionId);

  const [openSearch, setOpenSearch] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');

  useEffect(() => {
    if (!openCreate) {
      setTitle('');
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
    setUrl('');
    setLogin('');
    setPassword('');
    setFaviconUrl('');
    setOpenCreate(false);
    notifications.recordCreated();
  };

  return (
    <>
      <div className="flex justify-between gap-10 py-3">
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarTrigger variant="outline" size="icon-sm" />
            </TooltipTrigger>
            <TooltipContent>
              Меню
            </TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" />
          <p className="truncate w-[300px]">
            {selectedSectionId === 'all' ? 'Все записи' : currentSection?.name}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-sm"
                variant="outline"
                onClick={() => setOpenSearch(true)}
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

          <CommandMenu open={openSearch} onOpenChange={setOpenSearch} />

          <CreateRecordDialog
            open={openCreate}
            setOpen={setOpenCreate}
            title={title}
            setTitle={setTitle}
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
