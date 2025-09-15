import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface ActivateSuiteRequest {
  suiteSlug: string;
  workspaceId: string;
}

export const useActivateSuite = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<any, Error, ActivateSuiteRequest>({
    mutationFn: async ({ suiteSlug, workspaceId }) => {
      const response = await fetch(`/api/suites/${suiteSlug}/activate`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ workspaceId }),
      });

      if (!response.ok) {
        throw new Error("Failed to activate suite");
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suites"] });
    },
  });

  return mutation;
};