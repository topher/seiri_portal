import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

interface UseGetAcceptanceCriteriaProps {
  taskId: string;
}

export const useGetAcceptanceCriteria = ({ taskId }: UseGetAcceptanceCriteriaProps) => {
  const query = useQuery({
    queryKey: ["acceptance-criteria", taskId],
    queryFn: async () => {
      const response = await client.api.tasks[":taskId"]["acceptance-criteria"].$get({
        param: { taskId }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch acceptance criteria");
      }

      const { data } = await response.json();
      return data;
    },
  });

  return query;
};