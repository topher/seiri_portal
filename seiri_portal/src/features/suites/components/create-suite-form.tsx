"use client";

import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { useActivateSuite } from "../api/use-activate-suite";
import { useGetSuites } from "../api/use-get-suites";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { PREDEFINED_SUITES } from "@/lib/neo4j-schema";

interface CreateSuiteFormProps {
  onCancel?: () => void;
}

export const CreateSuiteForm = ({ onCancel }: CreateSuiteFormProps) => {
  const workspaceId = useWorkspaceId();
  const { mutate, isPending } = useActivateSuite();
  const { data: existingSuites } = useGetSuites({ workspaceId });
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Filter out already activated suites
  const activatedSlugs = existingSuites?.documents?.filter(suite => suite.isActive).map(suite => suite.slug) || [];
  const availableSuites = PREDEFINED_SUITES.filter(suite => !activatedSlugs.includes(suite.slug));

  const handleActivate = (suite: typeof PREDEFINED_SUITES[0]) => {
    setSelectedTemplate(suite.name);
    mutate({
      suiteSlug: suite.slug,
      workspaceId,
    }, {
      onSuccess: () => {
        setSelectedTemplate(null);
        onCancel?.();
      },
      onError: (error) => {
        console.error("Failed to activate suite:", error);
        setSelectedTemplate(null);
        // Could add toast notification here
      }
    });
  };

  return (
    <Card className="w-full h-full border-none shadow-none">
      <CardHeader className="flex p-7">
        <CardTitle className="text-xl font-bold">
          Activate Suite
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Choose which business suites to activate for your workspace
        </p>
      </CardHeader>
      <div className="px-7">
        <div className="h-px bg-neutral-200" />
      </div>
      <CardContent className="p-7">
        <div className="flex flex-col gap-y-4">
          {/* Suite Activation Grid */}
          <div>
            <label className="text-sm font-medium">
              Available Business Suites
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              {availableSuites.length === 0 ? (
                <div className="col-span-2 text-center py-8 text-muted-foreground">
                  <p className="text-lg font-medium">All suites are already activated!</p>
                  <p className="text-sm mt-1">You have activated all available business suites for this workspace.</p>
                </div>
              ) : (
                availableSuites.map((suite) => (
                <Button
                  key={suite.name}
                  type="button"
                  variant="outline"
                  className="justify-start h-auto p-4 border-2 hover:border-seiri-turquoise-500 hover:bg-seiri-turquoise-50 transition-all duration-200 focus:ring-2 focus:ring-seiri-turquoise-300 focus:border-seiri-turquoise-500"
                  disabled={isPending}
                  onClick={() => handleActivate(suite)}
                >
                  <div className="text-left w-full">
                    <div className="font-semibold text-base">{suite.name}</div>
                    <div className="text-sm text-muted-foreground mt-1 break-words whitespace-normal">
                      {suite.description}
                    </div>
                    <div className="text-xs text-seiri-turquoise-600 mt-2 font-medium">
                      {selectedTemplate === suite.name ? "Activating..." : "Click to activate →"}
                    </div>
                  </div>
                </Button>
                ))
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-center pt-4">
            <Button
              type="button"
              size="lg"
              variant="secondary"
              onClick={onCancel}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};