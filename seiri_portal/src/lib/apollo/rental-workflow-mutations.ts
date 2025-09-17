import { gql } from '@apollo/client';
import { 
  INTENT_FRAGMENT, 
  OFFER_FRAGMENT, 
  AGREEMENT_FRAGMENT, 
  FULFILLMENT_FRAGMENT 
} from './rental-workflow-queries';

// Intent Mutations
export const CREATE_INTENT = gql`
  mutation CreateIntent($input: CreateIntentInput!) {
    createIntent(input: $input) {
      ...IntentInfo
      offers {
        id
        status
        provider {
          id
          name
        }
      }
    }
  }
  ${INTENT_FRAGMENT}
`;

export const UPDATE_INTENT = gql`
  mutation UpdateIntent($id: ID!, $input: UpdateIntentInput!) {
    updateIntent(id: $id, input: $input) {
      ...IntentInfo
      offers {
        id
        status
        provider {
          id
          name
        }
      }
    }
  }
  ${INTENT_FRAGMENT}
`;

export const DELETE_INTENT = gql`
  mutation DeleteIntent($id: ID!) {
    deleteIntent(id: $id)
  }
`;

// Offer Mutations
export const CREATE_OFFER = gql`
  mutation CreateOffer($input: CreateOfferInput!) {
    createOffer(input: $input) {
      ...OfferInfo
      intent {
        ...IntentInfo
      }
    }
  }
  ${OFFER_FRAGMENT}
  ${INTENT_FRAGMENT}
`;

export const UPDATE_OFFER = gql`
  mutation UpdateOffer($id: ID!, $input: UpdateOfferInput!) {
    updateOffer(id: $id, input: $input) {
      ...OfferInfo
      intent {
        ...IntentInfo
      }
    }
  }
  ${OFFER_FRAGMENT}
  ${INTENT_FRAGMENT}
`;

export const ACCEPT_OFFER = gql`
  mutation AcceptOffer($id: ID!) {
    acceptOffer(id: $id) {
      ...OfferInfo
      intent {
        ...IntentInfo
      }
    }
  }
  ${OFFER_FRAGMENT}
  ${INTENT_FRAGMENT}
`;

export const DECLINE_OFFER = gql`
  mutation DeclineOffer($id: ID!) {
    declineOffer(id: $id) {
      ...OfferInfo
      intent {
        ...IntentInfo
      }
    }
  }
  ${OFFER_FRAGMENT}
  ${INTENT_FRAGMENT}
`;

export const WITHDRAW_OFFER = gql`
  mutation WithdrawOffer($id: ID!) {
    withdrawOffer(id: $id) {
      ...OfferInfo
      intent {
        ...IntentInfo
      }
    }
  }
  ${OFFER_FRAGMENT}
  ${INTENT_FRAGMENT}
`;

export const DELETE_OFFER = gql`
  mutation DeleteOffer($id: ID!) {
    deleteOffer(id: $id)
  }
`;

// Agreement Mutations
export const CREATE_AGREEMENT = gql`
  mutation CreateAgreement($input: CreateAgreementInput!) {
    createAgreement(input: $input) {
      ...AgreementInfo
      intent {
        ...IntentInfo
      }
      offer {
        ...OfferInfo
      }
      fulfillments {
        ...FulfillmentInfo
      }
    }
  }
  ${AGREEMENT_FRAGMENT}
  ${INTENT_FRAGMENT}
  ${OFFER_FRAGMENT}
  ${FULFILLMENT_FRAGMENT}
`;

export const UPDATE_AGREEMENT = gql`
  mutation UpdateAgreement($id: ID!, $input: UpdateAgreementInput!) {
    updateAgreement(id: $id, input: $input) {
      ...AgreementInfo
      intent {
        ...IntentInfo
      }
      offer {
        ...OfferInfo
      }
      fulfillments {
        ...FulfillmentInfo
      }
    }
  }
  ${AGREEMENT_FRAGMENT}
  ${INTENT_FRAGMENT}
  ${OFFER_FRAGMENT}
  ${FULFILLMENT_FRAGMENT}
`;

export const SIGN_AGREEMENT = gql`
  mutation SignAgreement($id: ID!) {
    signAgreement(id: $id) {
      ...AgreementInfo
      intent {
        ...IntentInfo
      }
      offer {
        ...OfferInfo
      }
      fulfillments {
        ...FulfillmentInfo
      }
    }
  }
  ${AGREEMENT_FRAGMENT}
  ${INTENT_FRAGMENT}
  ${OFFER_FRAGMENT}
  ${FULFILLMENT_FRAGMENT}
`;

export const CANCEL_AGREEMENT = gql`
  mutation CancelAgreement($id: ID!) {
    cancelAgreement(id: $id) {
      ...AgreementInfo
      intent {
        ...IntentInfo
      }
      offer {
        ...OfferInfo  
      }
      fulfillments {
        ...FulfillmentInfo
      }
    }
  }
  ${AGREEMENT_FRAGMENT}
  ${INTENT_FRAGMENT}
  ${OFFER_FRAGMENT}
  ${FULFILLMENT_FRAGMENT}
`;

export const DELETE_AGREEMENT = gql`
  mutation DeleteAgreement($id: ID!) {
    deleteAgreement(id: $id)
  }
`;

// Fulfillment Mutations
export const CREATE_FULFILLMENT = gql`
  mutation CreateFulfillment($input: CreateFulfillmentInput!) {
    createFulfillment(input: $input) {
      ...FulfillmentInfo
      agreement {
        ...AgreementInfo
      }
    }
  }
  ${FULFILLMENT_FRAGMENT}
  ${AGREEMENT_FRAGMENT}
`;

export const UPDATE_FULFILLMENT = gql`
  mutation UpdateFulfillment($id: ID!, $input: UpdateFulfillmentInput!) {
    updateFulfillment(id: $id, input: $input) {
      ...FulfillmentInfo
      agreement {
        ...AgreementInfo
      }
    }
  }
  ${FULFILLMENT_FRAGMENT}
  ${AGREEMENT_FRAGMENT}
`;

export const START_FULFILLMENT = gql`
  mutation StartFulfillment($id: ID!) {
    startFulfillment(id: $id) {
      ...FulfillmentInfo
      agreement {
        ...AgreementInfo
        fulfillments {
          ...FulfillmentInfo
        }
      }
    }
  }
  ${FULFILLMENT_FRAGMENT}
  ${AGREEMENT_FRAGMENT}
`;

export const COMPLETE_FULFILLMENT = gql`
  mutation CompleteFulfillment($id: ID!) {
    completeFulfillment(id: $id) {
      ...FulfillmentInfo
      agreement {
        ...AgreementInfo
        fulfillments {
          ...FulfillmentInfo
        }
      }
    }
  }
  ${FULFILLMENT_FRAGMENT}
  ${AGREEMENT_FRAGMENT}
`;

export const CANCEL_FULFILLMENT = gql`
  mutation CancelFulfillment($id: ID!) {
    cancelFulfillment(id: $id) {
      ...FulfillmentInfo
      agreement {
        ...AgreementInfo
        fulfillments {
          ...FulfillmentInfo
        }
      }
    }
  }
  ${FULFILLMENT_FRAGMENT}
  ${AGREEMENT_FRAGMENT}
`;

export const DELETE_FULFILLMENT = gql`
  mutation DeleteFulfillment($id: ID!) {
    deleteFulfillment(id: $id)
  }
`;

// Batch mutations for workflow optimization
export const BATCH_CREATE_RENTAL_WORKFLOW = gql`
  mutation BatchCreateRentalWorkflow($intentInput: CreateIntentInput!, $offerInput: CreateOfferInput!, $agreementInput: CreateAgreementInput!) {
    # Step 1: Create intent
    intent: createIntent(input: $intentInput) {
      ...IntentInfo
    }
    
    # Step 2: Create offer (depends on intent)
    offer: createOffer(input: $offerInput) {
      ...OfferInfo
      intent {
        ...IntentInfo
      }
    }
    
    # Step 3: Accept offer automatically
    acceptedOffer: acceptOffer(id: $offerInput.intentId) {
      ...OfferInfo
    }
    
    # Step 4: Create agreement
    agreement: createAgreement(input: $agreementInput) {
      ...AgreementInfo
      intent {
        ...IntentInfo
      }
      offer {
        ...OfferInfo
      }
    }
  }
  ${INTENT_FRAGMENT}
  ${OFFER_FRAGMENT}
  ${AGREEMENT_FRAGMENT}
`;

export const BATCH_COMPLETE_RENTAL = gql`
  mutation BatchCompleteRental($agreementId: ID!, $pickupFulfillmentInput: CreateFulfillmentInput!, $returnFulfillmentInput: CreateFulfillmentInput!) {
    # Sign the agreement
    signedAgreement: signAgreement(id: $agreementId) {
      ...AgreementInfo
    }
    
    # Create pickup fulfillment
    pickupFulfillment: createFulfillment(input: $pickupFulfillmentInput) {
      ...FulfillmentInfo
    }
    
    # Create return fulfillment
    returnFulfillment: createFulfillment(input: $returnFulfillmentInput) {
      ...FulfillmentInfo
    }
  }
  ${AGREEMENT_FRAGMENT}
  ${FULFILLMENT_FRAGMENT}
`;

// Optimistic update helpers for real-time UI
export const OPTIMISTIC_UPDATE_INTENT_STATUS = gql`
  mutation OptimisticUpdateIntentStatus($id: ID!, $status: IntentStatus!) {
    updateIntent(id: $id, input: { status: $status }) {
      id
      status
    }
  }
`;

export const OPTIMISTIC_UPDATE_OFFER_STATUS = gql`
  mutation OptimisticUpdateOfferStatus($id: ID!, $status: OfferStatus!) {
    updateOffer(id: $id, input: { status: $status }) {
      id
      status
    }
  }
`;

export const OPTIMISTIC_UPDATE_AGREEMENT_STATUS = gql`
  mutation OptimisticUpdateAgreementStatus($id: ID!, $status: AgreementStatus!) {
    updateAgreement(id: $id, input: { status: $status }) {
      id
      status
    }
  }
`;

export const OPTIMISTIC_UPDATE_FULFILLMENT_STATUS = gql`
  mutation OptimisticUpdateFulfillmentStatus($id: ID!, $status: FulfillmentStatus!) {
    updateFulfillment(id: $id, input: { status: $status }) {
      id
      status
    }
  }
`;

// Complex workflow mutations
export const TRANSITION_INTENT_TO_AGREEMENT = gql`
  mutation TransitionIntentToAgreement($intentId: ID!, $offerId: ID!, $agreementInput: CreateAgreementInput!) {
    # Accept the offer
    acceptedOffer: acceptOffer(id: $offerId) {
      ...OfferInfo
      intent {
        ...IntentInfo
      }
    }
    
    # Create agreement from accepted offer
    agreement: createAgreement(input: $agreementInput) {
      ...AgreementInfo
      intent {
        ...IntentInfo
      }
      offer {
        ...OfferInfo
      }
    }
    
    # Update intent status to matched
    updatedIntent: updateIntent(id: $intentId, input: { status: MATCHED }) {
      ...IntentInfo
    }
  }
  ${OFFER_FRAGMENT}
  ${AGREEMENT_FRAGMENT}
  ${INTENT_FRAGMENT}
`;

export const COMPLETE_RENTAL_CYCLE = gql`
  mutation CompleteRentalCycle($agreementId: ID!, $pickupFulfillmentId: ID!, $returnFulfillmentId: ID!) {
    # Complete pickup
    completedPickup: completeFulfillment(id: $pickupFulfillmentId) {
      ...FulfillmentInfo
    }
    
    # Complete return  
    completedReturn: completeFulfillment(id: $returnFulfillmentId) {
      ...FulfillmentInfo
    }
    
    # Mark agreement as fulfilled
    fulfilledAgreement: updateAgreement(id: $agreementId, input: { 
      status: FULFILLED 
      fulfilledAt: "${new Date().toISOString()}"
    }) {
      ...AgreementInfo
      fulfillments {
        ...FulfillmentInfo
      }
    }
  }
  ${FULFILLMENT_FRAGMENT}
  ${AGREEMENT_FRAGMENT}
`;