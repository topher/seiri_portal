import { EditTaskModal } from "@/features/tasks/components/edit-task-modal";
import { CreateTaskModal } from "@/features/tasks/components/create-task-modal";
import { CreateInitiativeModal } from "@/features/initiatives/components/create-initiative-modal";
import { CreateSuiteModal } from "@/features/suites/components/create-suite-modal";
import { CreateWorkspaceModal } from "@/features/workspaces/components/create-workspace-modal";

import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { ChatSidebar } from "@/components/agent-chat/ChatSidebar";
import { CommandPalette } from "@/components/command-palette/CommandPalette";
// No longer need ChatProvider since we're using direct hook

interface DashboardLayoutProps {
  children: React.ReactNode;
};

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return ( 
    <div className="min-h-screen">
      <CreateWorkspaceModal />
      <CreateInitiativeModal />
      <CreateSuiteModal />
      <CreateTaskModal />
      <EditTaskModal />
      <div className="flex w-full h-full">
        <div className="fixed left-0 top-0 hidden lg:block lg:w-64 h-full overflow-y-auto">
          <Sidebar />
        </div>
        <div className="lg:pl-64 w-full">
          <div className="mx-auto max-w-screen-2xl h-full">
            <Navbar />
            <main className="h-full py-8 px-6 flex flex-col">
              {children}
            </main>
          </div>
        </div>
        {/* AI Chat Sidebar */}
        <ChatSidebar />
      </div>
      
      {/* Command Palette */}
      <CommandPalette />
    </div>
  );
};
 
export default DashboardLayout;
