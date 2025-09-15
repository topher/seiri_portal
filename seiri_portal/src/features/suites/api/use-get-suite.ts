import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

interface UseGetSuiteProps {
  suiteId: string;
}

export const useGetSuite = ({ suiteId }: UseGetSuiteProps) => {
  const query = useQuery({
    queryKey: ["suite", suiteId],
    queryFn: async () => {
      const response = await client.api.suites[":suiteId"].$get({
        param: { suiteId }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch suite");
      }

      const { data } = await response.json();
      return data;
    },
  });

  return query;
};