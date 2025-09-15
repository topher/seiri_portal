// Export all rental workflow components for easy importing
export { RentalRequest } from './RentalRequest';
export { ApprovalFlow } from './ApprovalFlow';
export { BookingConfirmation } from './BookingConfirmation';
export { PickupReturn } from './PickupReturn';

// Export types and utilities if needed
export type RentalWorkflowStep = 'request' | 'approval' | 'confirmation' | 'fulfillment';

export interface RentalWorkflowConfig {
  workspaceId: string;
  currentUserId: string;
  initialStep?: RentalWorkflowStep;
}

// Workflow step progression helper
export const getNextStep = (currentStep: RentalWorkflowStep): RentalWorkflowStep | null => {
  const stepOrder: RentalWorkflowStep[] = ['request', 'approval', 'confirmation', 'fulfillment'];
  const currentIndex = stepOrder.indexOf(currentStep);
  return currentIndex >= 0 && currentIndex < stepOrder.length - 1 
    ? stepOrder[currentIndex + 1] 
    : null;
};

export const getPreviousStep = (currentStep: RentalWorkflowStep): RentalWorkflowStep | null => {
  const stepOrder: RentalWorkflowStep[] = ['request', 'approval', 'confirmation', 'fulfillment'];
  const currentIndex = stepOrder.indexOf(currentStep);
  return currentIndex > 0 ? stepOrder[currentIndex - 1] : null;
};

// Component display names for navigation
export const stepDisplayNames: Record<RentalWorkflowStep, string> = {
  request: 'Create Request',
  approval: 'Review Offers',
  confirmation: 'Finalize Agreement',
  fulfillment: 'Pickup & Return'
};

// Status helpers for workflow states
export const intentStatusLabels = {
  PENDING: 'Awaiting Offers',
  MATCHED: 'Offer Accepted',
  DECLINED: 'Request Declined',
  CANCELLED: 'Request Cancelled',
  FULFILLED: 'Request Completed'
};

export const offerStatusLabels = {
  PROPOSED: 'Awaiting Response',
  ACCEPTED: 'Offer Accepted',
  DECLINED: 'Offer Declined',
  WITHDRAWN: 'Offer Withdrawn',
  EXPIRED: 'Offer Expired'
};

export const agreementStatusLabels = {
  PENDING: 'Awaiting Signature',
  SIGNED: 'Agreement Signed',
  ACTIVE: 'Agreement Active',
  FULFILLED: 'Agreement Completed',
  CANCELLED: 'Agreement Cancelled',
  DISPUTED: 'Under Dispute'
};

export const fulfillmentStatusLabels = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  FAILED: 'Failed'
};