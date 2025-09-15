import { useQuery } from "@tanstack/react-query";

import { client } from "@/lib/rpc";

interface InitiativeRACIData {
  responsible: string[];
  accountable: string;
  consulted: string[];
  informed: string[];
  confidence?: number;
  method?: string;
  suiteNames?: {
    [suiteId: string]: string;
  };
}

export const useGetInitiativeRACI = ({ initiativeId }: { initiativeId: string }) => {
  const query = useQuery({
    queryKey: ["initiative-raci", initiativeId],
    queryFn: async (): Promise<InitiativeRACIData | null> => {
      try {
        // Try to get real RACI data from the API
        const response = await (client.api.initiatives[":initiativeId"] as any).raci.$get({
          param: { initiativeId }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch RACI data');
        }
        
        return await response.json();
      } catch (error) {
        console.warn('RACI API not available, using initiative node data:', error);
        
        // Fallback to initiative node properties if RACI API doesn't exist yet
        const initiative = await client.api.initiatives[":initiativeId"].$get({
          param: { initiativeId }
        });
        
        if (!initiative.ok) {
          return null;
        }
        
        const data = await initiative.json();
        
        // Extract RACI data from the initiative node properties
        const dataAny = data as any;
        const responsible = dataAny.raciResponsible ? [dataAny.raciResponsible] : [];
        const accountable = dataAny.raciAccountable || "";
        const consulted = dataAny.raciConsulted ? [dataAny.raciConsulted] : [];
        const informed = dataAny.raciInformed ? dataAny.raciInformed.split(',') : [];
        
        // Map known suite IDs to names
        const suiteNames: { [key: string]: string } = {
          "305f4dd9-988a-4a5a-95f2-15c57012f5ee": "Development",
          "8f01a921-635d-4bf4-bbd6-72ad8d68e32c": "Strategy", 
          "3d6d5558-1c08-43fd-ad18-839d47a1bef6": "Product",
          "8df77647-ee4b-4d9a-b4e2-6a57d040dbd5": "Marketing",
          "ec597cd3-04cb-4302-ac1c-9a0ae59c911d": "Operations",
          "aac010bd-5831-4232-b373-ce2285d31783": "Operations" // backup ID
        };
        
        return {
          responsible,
          accountable,
          consulted,
          informed,
          confidence: 85,
          method: "Node Properties",
          suiteNames
        };
      }
    },
    enabled: !!initiativeId,
  });

  return query;
};