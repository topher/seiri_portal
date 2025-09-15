import { parseAsBoolean, useQueryState } from "nuqs";

export const useCreateInitiativeModal = () => {
  const [isOpen, setIsOpen] = useQueryState(
    "create-initiative",
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