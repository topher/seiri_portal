import { Suites } from "./suites";
import { Initiatives } from "./initiatives";
import { Navigation } from "./navigation";
import { DottedSeparator } from "./dotted-separator";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { BrandCard } from "./brand-card";

export const Sidebar = () => {
  return (
    <aside className="h-full bg-white border-r border-seiri-gray-100 w-64 flex flex-col">
      {/* Brand Header */}
      <BrandCard className="px-2" />
      
      <div className="flex-1 px-4 pb-4 space-y-6">
        {/* Workspace Switcher */}
        <div key="workspaces-section">
          <WorkspaceSwitcher />
        </div>
        
        <DottedSeparator />
        
        {/* Navigation */}
        <div key="navigation-section">
          <h3 className="text-xs font-semibold tracking-wide text-seiri-gray-900/60 uppercase mb-3">
            NAVIGATION
          </h3>
          <Navigation />
        </div>
        
        <DottedSeparator />
        
        {/* Suites */}
        <div key="suites-section">
          <Suites />
        </div>
        
        <DottedSeparator />
        
        {/* Initiatives */}
        <div key="initiatives-section" className="flex-1">
          <Initiatives />
        </div>
      </div>
    </aside>
  );
};
