import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { SidebarGroup, SidebarGroupContent } from '@/components/ui/sidebar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProDialog } from '@/components/pro/ProDialog';

export function NavPro() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <SidebarGroup className="mt-auto">
        <SidebarGroupContent>
          <Card
            size="sm"
            className="gap-2 bg-[#151515] py-3 text-left ring-white/10 transition-colors duration-200 ease-linear has-[button:hover]:ring-white/30 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:py-1.5"
          >
            <CardHeader className="gap-1 px-3 group-data-[collapsible=icon]:hidden">
              <CardTitle className="text-sm font-bold text-white">
                MLocker PRO
              </CardTitle>
              <CardDescription className="text-xs text-white/50">
                Разблокируйте расширенные возможности MLocker
              </CardDescription>
            </CardHeader>

            <CardContent className="px-3 group-data-[collapsible=icon]:hidden">
              <Button
                type="button"
                onClick={() => setOpen(true)}
                className="w-full bg-[#2BBDAB] text-white hover:bg-[#2BBDAB] hover:brightness-110"
              >
                Разблокировать
              </Button>
            </CardContent>

            <Button
              type="button"
              aria-label="MLocker PRO"
              size="icon"
              onClick={() => setOpen(true)}
              className="hidden bg-[#2BBDAB] text-white hover:bg-[#2BBDAB] hover:brightness-110 group-data-[collapsible=icon]:inline-flex"
            >
              <Sparkles />
            </Button>
          </Card>
        </SidebarGroupContent>
      </SidebarGroup>

      <ProDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
