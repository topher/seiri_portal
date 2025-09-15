"use client";

import { useGetSuite } from "@/features/suites/api/use-get-suite";
import { useSuiteId } from "@/features/suites/hooks/use-suite-id";

import { PageError } from "@/components/page-error";
import { PageLoader } from "@/components/page-loader";

export const SuiteIdClient = () => {
  const suiteId = useSuiteId();
  
  const { data: suite, isLoading } = useGetSuite({ suiteId });

  if (isLoading) {
    return <PageLoader />;
  }

  if (!suite) {
    return <PageError message="Suite not found" />;
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{suite.name}</h1>
          {suite.description && (
            <p className="text-muted-foreground">{suite.description}</p>
          )}
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <h2 className="text-lg font-medium mb-2">Suite Dashboard</h2>
          <p>Suite-specific content and tools will be displayed here.</p>
        </div>
      </div>
    </div>
  );
};