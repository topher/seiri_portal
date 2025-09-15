import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

interface UseGetSuitesProps {
  workspaceId: string;
}

export const useGetSuites = ({ workspaceId }: UseGetSuitesProps) => {
  const query = useQuery({
    queryKey: ["suites", workspaceId],
    queryFn: async () => {
      try {
        const response = await client.api.suites.$get({
          query: { workspaceId }
        });

        if (!response.ok) {
          // During transition, return empty data instead of throwing
          console.warn("Suites API not available yet, returning empty data");
          return { documents: [], total: 0 };
        }

        const { data } = await response.json();
        return data;
      } catch (error) {
        // During transition, return empty data instead of throwing
        console.warn("Suites API error, returning empty data:", error);
        return { documents: [], total: 0 };
      }
    },
  });

  return query;
};