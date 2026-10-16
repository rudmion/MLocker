import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarHeader,
} from '@/components/ui/sidebar';

export function Header() {
  return (
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex h-8 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm transition-[padding] duration-200 ease-linear group-data-[collapsible=icon]:px-[3px]">
            <img src={'/logo.svg'} className="w-[28px] shrink-0" alt="Logo" />
            <span className="truncate transition-opacity duration-200 ease-linear group-data-[collapsible=icon]:opacity-0">
              MLocker
            </span>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  );
}
