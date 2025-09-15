"use client";

import { useGetInitiative } from "@/features/initiatives/api/use-get-initiative";
import { useInitiativeId } from "@/features/initiatives/hooks/use-initiative-id";
import { EditInitiativeForm } from "@/features/initiatives/components/edit-initiative-form";

import { PageLoader } from "@/components/page-loader";
import { PageError } from "@/components/page-error";

export const InitiativeIdSettingsClient = () => {
  const initiativeId = useInitiativeId();
  const { data: initialValues, isLoading } = useGetInitiative({ initiativeId });

  if (isLoading) {
    return <PageLoader />
  }

  if (!initialValues) {
    return <PageError message="Initiative not found" />
  }

  return (
    <div className="w-full lg:max-w-xl">
      <EditInitiativeForm initiative={initialValues} />
    </div>
  )
};