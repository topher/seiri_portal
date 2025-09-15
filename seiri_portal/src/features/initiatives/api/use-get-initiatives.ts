import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

interface UseGetInitiativesProps {
  suiteId?: string;
  workspaceId?: string; // Temporary during transition
}

export const useGetInitiatives = ({ suiteId, workspaceId }: UseGetInitiativesProps) => {
  const query = useQuery({
    queryKey: ["initiatives", suiteId || workspaceId],
    queryFn: async () => {
      try {
        const queryParams = suiteId ? { suiteId } : { workspaceId };
        const response = await client.api.initiatives.$get({
          query: queryParams
        });

        if (!response.ok) {
          // During transition, return empty data instead of throwing
          console.warn("Initiatives API not available yet, returning empty data");
          return { documents: [], total: 0 };
        }

        const { data } = await response.json();
        return data;
      } catch (error) {
        // During transition, return empty data instead of throwing
        console.warn("Initiatives API error, returning empty data:", error);
        return { documents: [], total: 0 };
      }
    },
  });

  return query;
};