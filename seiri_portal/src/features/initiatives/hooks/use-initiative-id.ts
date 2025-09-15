import { useParams } from "next/navigation";

export const useInitiativeId = () => {
  const params = useParams();
  return params?.initiativeId as string;
};