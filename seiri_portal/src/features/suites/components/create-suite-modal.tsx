"use client";

import { ResponsiveModal } from "@/components/responsive-modal";

import { CreateSuiteForm } from "./create-suite-form";
import { useCreateSuiteModal } from "../hooks/use-create-suite-modal";

export const CreateSuiteModal = () => {
  const { isOpen, setIsOpen, close } = useCreateSuiteModal();

  return (
    <ResponsiveModal open={isOpen} onOpenChange={setIsOpen}>
      <CreateSuiteForm onCancel={close} />
    </ResponsiveModal>
  );
};