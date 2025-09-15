import { parseAsBoolean, useQueryState } from "nuqs";

export const useCreateSuiteModal = () => {
  const [isOpen, setIsOpen] = useQueryState(
    "create-suite",
    parseAsBoolean.withDefault(false).withOptions({ clearOnDefault: true }),
  );

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return {
    isOpen,
    open,
    close,
    setIsOpen,
  };
};