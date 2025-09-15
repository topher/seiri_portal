import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

import { client } from "@/lib/rpc";

type ResponseType = InferResponseType<typeof client.api["acceptance-criteria"][":criterionId"]["$patch"], 200>;
type RequestType = InferRequestType<typeof client.api["acceptance-criteria"][":criterionId"]["$patch"]>;

export const useToggleAcceptanceCriterion = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ param, json }) => {
      const response = await client.api["acceptance-criteria"][":criterionId"]["$patch"]({
        param,
        json,
      });

      if (!response.ok) {
        throw new Error("Failed to update acceptance criterion");
      }

      return await response.json();
    },
    onSuccess: ({ data }) => {
      toast.success("Acceptance criterion updated");
      
      queryClient.invalidateQueries({ 
        queryKey: ["acceptance-criteria", data.taskId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["task", data.taskId] 
      });
    },
    onError: () => {
      toast.error("Failed to update acceptance criterion");
    },
  });

  return mutation;
};