// Create Initiative Modal Component
// Modal wrapper for the comprehensive initiative creation form

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CreateInitiativeForm } from './CreateInitiativeForm';

interface CreateInitiativeModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onSuccess: (initiative: any) => void;
}

export const CreateInitiativeModal: React.FC<CreateInitiativeModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  onSuccess
}) => {
  const handleSuccess = (initiative: any) => {
    onSuccess(initiative);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Initiative</DialogTitle>
          <DialogDescription>
            Set up a new initiative with automatic RACI assignment, value tracking, and suite coordination.
          </DialogDescription>
        </DialogHeader>
        <CreateInitiativeForm
          workspaceId={workspaceId}
          onSuccess={handleSuccess}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
};