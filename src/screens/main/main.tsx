import { AppSidebar } from '@/components/sidebar/Sidebar';
import { Header } from '@/components/header/Header';
import { Content } from '@/components/content/Content';

function Main() {
  return (
    <div className="section flex flex-1 min-w-0">
      <div className="sidebar">
        <AppSidebar />
      </div>
      <div className="section-content w-full">
        <div className="sticky top-0 z-50 bg-background/50 backdrop-blur-md px-0.5">
          <Header />
          {/* <Separator /> */}
        </div>
        <Content />
      </div>
    </div>
  );
}

export default Main;
