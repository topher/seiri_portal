import { useParams } from "next/navigation";

export const useSuiteId = () => {
  const params = useParams();
  return params?.suiteId as string;
};