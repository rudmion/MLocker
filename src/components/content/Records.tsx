import { Button } from '@/components/ui/button';
import { ItemMedia } from '@/components/ui/item';
import {
  Copy,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Star,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useStore } from '@/store/useStore';
import { Entry } from '@/components/types/data-types';
import { open } from '@tauri-apps/plugin-shell';
import { convertFileSrc } from '@tauri-apps/api/core';
import { copyToClipboard } from '@/utils/clipboard';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useRef, useState, useEffect } from 'react';

function TruncatedText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (el) {
      setIsTruncated(el.scrollWidth > el.clientWidth);
    }
  }, [text]);

  if (!isTruncated) {
    return (
      <span ref={ref} className={className}>
        {text}
      </span>
    );
  }

  return (
    <Tooltip delayDuration={1000}>
      <TooltipTrigger asChild>
        <span ref={ref} className={className}>
          {text}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-none whitespace-normal">{text}</TooltipContent>
    </Tooltip>
  );
}

export function Records() {
  const data = useStore((state) => state.data);
  const selectedSectionId = useStore((state) => state.selectedSectionId);
  const setSelectedEntry = useStore((state) => state.setSelectedEntry);
  const setInspectorOpen = useStore((state) => state.setInspectorOpen);

  const sections = data?.sections ?? [];

  const allEntries = sections.flatMap((section) => section.entries ?? []);

  const records = (
    selectedSectionId === 'all'
      ? allEntries
      : (sections.find((section) => section.id === selectedSectionId)
          ?.entries ?? [])
  ).sort((a, b) => {
    if (a.favourites === b.favourites) return 0;
    return a.favourites ? -1 : 1;
  });

  const handleOpenLink = async (record: Entry) => {
    if (!record.url) return;

    try {
      await open(record.url);
    } catch (error) {
      console.error('Error opening link:', error);
    }
  };

  const renderSecurityIcon = (level: number) => {
    switch (level) {
      case 1:
        return <ShieldAlert size={18} color="#ef4444" />;
      case 2:
        return <ShieldAlert size={18} color="#eab308" />;
      case 3:
        return <ShieldCheck size={18} color="#22c55e" />;
      default:
        return <ShieldAlert size={18} color="#9ca3af" />;
    }
  };

  return (
    <>
      {records.map((record) => {
        const faviconSrc = record.iconUrl
          ? convertFileSrc(record.iconUrl)
          : '/material-icon-theme_folder-docs.svg';

        return (
          <Card className="p-2 w-full" key={record.id}>
            <CardContent
              className="
                px-0
                flex
                items-center
                justify-between
              "
            >
              <div
                className="
                  flex
                  items-center
                  gap-1
                "
              >
                <Button
                  variant="link"
                  size="icon-sm"
                  onClick={() => {
                    const section = sections.find((section) =>
                      section.entries.some((entry) => entry.id === record.id),
                    );

                    if (!section) return;

                    useStore.getState().updateEntry(section.id, record.id, {
                      favourites: !record.favourites,
                    });
                  }}
                >
                  <Star
                    size={18}
                    className={
                      record.favourites
                        ? 'fill-yellow-400 stroke-yellow-400'
                        : 'fill-none stroke-gray-500'
                    }
                  />
                </Button>
                <ItemMedia
                  variant="image"
                  style={{
                    width: 30,
                    height: 'auto',
                  }}
                >
                  <img
                    src={faviconSrc}
                    alt="Logo"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/material-icon-theme_folder-docs.svg';
                    }}
                  />
                </ItemMedia>

                <TruncatedText
                  text={record.title}
                  className="max-w-[200px] truncate whitespace-nowrap overflow-hidden ps-1.5"
                />

                {record.url && /^https?:\/\//.test(record.url) && (
                  <Button
                    variant="link"
                    size="icon-sm"
                    onClick={() => handleOpenLink(record)}
                  >
                    <ExternalLink size={18} />
                  </Button>
                )}
              </div>

              <div
                className="
                  flex
                  items-center
                  gap-2
                "
              >
                {renderSecurityIcon(record.securityLevel)}
                <Button
                  size="sm"
                  variant="outline"
                  className="group/copy overflow-hidden transition-all duration-300 pe-2 "
                  onClick={() => copyToClipboard(record.login)}
                >
                  <Copy />
                  <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 group-hover/copy:max-w-[80px] group-hover/copy:opacity-100 ">
                    Логин
                  </span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="group/copy overflow-hidden transition-all duration-300 pe-2"
                  onClick={() => copyToClipboard(record.password)}
                >
                  <Copy />
                  <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 group-hover/copy:max-w-[80px] group-hover/copy:opacity-100">
                    Пароль
                  </span>
                </Button>

                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => {
                    setSelectedEntry(record.id);
                    setInspectorOpen(true);
                  }}
                >
                  <ChevronRight />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </>
  );
}
