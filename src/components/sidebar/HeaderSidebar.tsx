import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from '@/components/ui/sidebar';

export function Header() {
  return (
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            className="data-[slot=sidebar-menu-button] hover:bg-transparent 
    focus:bg-transparent 
    active:bg-transparent
    data-[active=true]:bg-transparent
    data-[state=open]:bg-transparent"
          >
            <div>
              <img src={'/logo.svg'} className="w-[28px]" alt="Logo" />
              <span className="text-sm">MLocker</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  );
}
