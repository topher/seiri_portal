import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

interface UseGetInitiativeProps {
  initiativeId: string;
}

export const useGetInitiative = ({ initiativeId }: UseGetInitiativeProps) => {
  const query = useQuery({
    queryKey: ["initiative", initiativeId],
    queryFn: async () => {
      const response = await client.api.initiatives[":initiativeId"].$get({
        param: { initiativeId }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch initiative");
      }

      const { data } = await response.json();
      return data;
    },
  });

  return query;
};