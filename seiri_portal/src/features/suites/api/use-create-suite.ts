import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

import { client } from "@/lib/rpc";

type ResponseType = InferResponseType<typeof client.api.suites["$post"], 200>;
type RequestType = InferRequestType<typeof client.api.suites["$post"]>;

export const useCreateSuite = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ form, query }: any) => {
      const response = await client.api.suites["$post"]({
        form,
      });

      if (!response.ok) {
        throw new Error("Failed to create suite");
      }

      return await response.json();
    },
    onSuccess: ({ data }) => {
      toast.success("Suite created");
      queryClient.invalidateQueries({ queryKey: ["suites"] });
      queryClient.invalidateQueries({ queryKey: ["suites", data.workspaceId] });
    },
    onError: () => {
      toast.error("Failed to create suite");
    },
  });

  return mutation;
};