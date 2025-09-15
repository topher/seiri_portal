import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

import { client } from "@/lib/rpc";

type ResponseType = InferResponseType<typeof client.api.initiatives["$post"], 200>;
type RequestType = InferRequestType<typeof client.api.initiatives["$post"]>;

export const useCreateInitiative = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }) => {
      const response = await client.api.initiatives["$post"]({ 
        json
      });

      if (!response.ok) {
        throw new Error("Failed to create initiative");
      }

      return await response.json();
    },
    onSuccess: () => {
      toast.success("Initiative created");
      queryClient.invalidateQueries({ queryKey: ["initiatives"] });
    },
    onError: () => {
      toast.error("Failed to create initiative");
    },
  });

  return mutation;
};