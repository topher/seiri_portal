import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// Login is now handled by Clerk UI components
// This hook is kept for backward compatibility but will return an error
export const useLogin = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: async () => {
      throw new Error("Login is now handled by Clerk");
    },
    onSuccess: () => {
      router.refresh();
      queryClient.invalidateQueries({ queryKey: ["current"] });
    },
    onError: () => {
      // Silent error since login is handled by Clerk
    },
  });

  return mutation;
};
