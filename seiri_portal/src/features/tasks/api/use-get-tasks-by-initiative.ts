import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

interface UseGetTasksByInitiativeProps {
  initiativeId: string;
}

export const useGetTasksByInitiative = ({ initiativeId }: UseGetTasksByInitiativeProps) => {
  const query = useQuery({
    queryKey: ["tasks", "initiative", initiativeId],
    queryFn: async () => {
      const response = await client.api.tasks.$get({
        query: { initiativeId }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch tasks");
      }

      const { data } = await response.json();
      return data;
    },
  });

  return query;
};