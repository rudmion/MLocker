import { Sidebar, SidebarContent } from '@/components/ui/sidebar';
import { Header } from './HeaderSidebar';
import { NavMain } from './NavMain';
import { NavPro } from './NavPro';
import { Separator } from '@/components/ui/separator';

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon" variant="floating">
      <Header />
      <Separator />
      <SidebarContent>
        <NavMain />
      </SidebarContent>
      <NavPro />
    </Sidebar>
  );
}
