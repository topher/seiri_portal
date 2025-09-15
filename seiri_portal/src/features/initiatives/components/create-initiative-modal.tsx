"use client";

import { ResponsiveModal } from "@/components/responsive-modal";

import { CreateInitiativeForm } from "./create-initiative-form";
import { useCreateInitiativeModal } from "../hooks/use-create-initiative-modal";

export const CreateInitiativeModal = () => {
  const { isOpen, setIsOpen, close } = useCreateInitiativeModal();

  return (
    <ResponsiveModal open={isOpen} onOpenChange={setIsOpen}>
      <CreateInitiativeForm onCancel={close} />
    </ResponsiveModal>
  );
};