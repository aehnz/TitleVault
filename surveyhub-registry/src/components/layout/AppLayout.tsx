import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';

const AppLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AppHeader />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
