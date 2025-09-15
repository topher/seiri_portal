import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { client } from "@/lib/rpc";
import { InferRequestType, InferResponseType } from "hono";

type ResponseType = InferResponseType<typeof client.api.initiatives[":initiativeId"]["$patch"]>;
type RequestType = InferRequestType<typeof client.api.initiatives[":initiativeId"]["$patch"]>;

export const useUpdateInitiative = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    ResponseType,
    Error,
    RequestType
  >({
    mutationFn: async ({ param, json }) => {
      const response = await client.api.initiatives[":initiativeId"]["$patch"]({
        param,
        json,
      });

      if (!response.ok) {
        throw new Error("Failed to update initiative");
      }

      return await response.json();
    },
    onSuccess: (data: any) => {
      toast.success("Initiative updated successfully");
      
      queryClient.invalidateQueries({ queryKey: ["initiatives"] });
      queryClient.invalidateQueries({ 
        queryKey: ["initiative", data?.$id] 
      });
    },
    onError: () => {
      toast.error("Failed to update initiative");
    },
  });

  return mutation;
};