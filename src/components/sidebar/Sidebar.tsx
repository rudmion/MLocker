import { Sidebar, SidebarContent } from '@/components/ui/sidebar';
import { Header } from './HeaderSidebar';
import { NavSecondary } from './NavSecondary';
import { NavMain } from './NavMain';
import { Separator } from '@/components/ui/separator';

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <Header />
      <Separator />
      <SidebarContent>
        <NavMain />
      </SidebarContent>
      <Separator />
      <NavSecondary />
    </Sidebar>
  );
}
