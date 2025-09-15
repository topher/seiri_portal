import { gql } from 'graphql-tag';

// Fragment definitions for reusable GraphQL fragments
export const AGENT_FRAGMENT = gql`
  fragment AgentInfo on Agent {
    id
    name
    email
    type
    workspaceId
    createdAt
    updatedAt
  }
`;

export const RESOURCE_SPECIFICATION_FRAGMENT = gql`
  fragment ResourceSpecificationInfo on ResourceSpecification {
    id
    name
    description
    category
    unitOfMeasure
    metadata
    workspaceId
    createdAt
    updatedAt
  }
`;

export const RESOURCE_FRAGMENT = gql`
  fragment ResourceInfo on Resource {
    id
    identifier
    condition
    location
    availableFrom
    availableUntil
    specification {
      ...ResourceSpecificationInfo
    }
    currentOwner {
      ...AgentInfo
    }
    workspaceId
    createdAt
    updatedAt
  }
  ${RESOURCE_SPECIFICATION_FRAGMENT}
  ${AGENT_FRAGMENT}
`;

export const INTENT_FRAGMENT = gql`
  fragment IntentInfo on Intent {
    id
    name
    description
    action
    status
    startTime
    endTime
    dueDate
    resourceQuantity
    metadata
    provider {
      ...AgentInfo
    }
    receiver {
      ...AgentInfo
    }
    resourceSpecification {
      ...ResourceSpecificationInfo
    }
    workspaceId
    createdAt
    updatedAt
  }
  ${AGENT_FRAGMENT}
  ${RESOURCE_SPECIFICATION_FRAGMENT}
`;

export const OFFER_FRAGMENT = gql`
  fragment OfferInfo on Offer {
    id
    name
    description
    status
    startTime
    endTime
    terms
    price
    currency
    resourceQuantity
    metadata
    provider {
      ...AgentInfo
    }
    receiver {
      ...AgentInfo
    }
    resource {
      ...ResourceInfo
    }
    workspaceId
    createdAt
    updatedAt
  }
  ${AGENT_FRAGMENT}
  ${RESOURCE_FRAGMENT}
`;

export const FULFILLMENT_FRAGMENT = gql`
  fragment FulfillmentInfo on Fulfillment {
    id
    action
    status
    startedAt
    completedAt
    location
    notes
    metadata
    provider {
      ...AgentInfo
    }
    receiver {
      ...AgentInfo
    }
    resource {
      ...ResourceInfo
    }
    workspaceId
    createdAt
    updatedAt
  }
  ${AGENT_FRAGMENT}
  ${RESOURCE_FRAGMENT}
`;

export const AGREEMENT_FRAGMENT = gql`
  fragment AgreementInfo on Agreement {
    id
    name
    description
    status
    terms
    price
    currency
    startTime
    endTime
    signedAt
    fulfilledAt
    metadata
    provider {
      ...AgentInfo
    }
    receiver {
      ...AgentInfo
    }
    resource {
      ...ResourceInfo
    }
    workspaceId
    createdAt
    updatedAt
  }
  ${AGENT_FRAGMENT}
  ${RESOURCE_FRAGMENT}
`;

// Intent Queries
export const GET_INTENTS = gql`
  query GetIntents($workspaceId: String!, $status: IntentStatus, $action: IntentAction) {
    intents(workspaceId: $workspaceId, status: $status, action: $action) {
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

export const GET_INTENT_BY_ID = gql`
  query GetIntentById($id: ID!) {
    intent(id: $id) {
      ...IntentInfo
      offers {
        ...OfferInfo
      }
      agreement {
        ...AgreementInfo
      }
    }
  }
  ${INTENT_FRAGMENT}
  ${OFFER_FRAGMENT}
  ${AGREEMENT_FRAGMENT}
`;

export const GET_INTENTS_BY_RECEIVER = gql`
  query GetIntentsByReceiver($receiverId: ID!, $workspaceId: String!) {
    intentsByReceiver(receiverId: $receiverId, workspaceId: $workspaceId) {
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

export const GET_INTENTS_BY_PROVIDER = gql`
  query GetIntentsByProvider($providerId: ID!, $workspaceId: String!) {
    intentsByProvider(providerId: $providerId, workspaceId: $workspaceId) {
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

// Offer Queries
export const GET_OFFERS = gql`
  query GetOffers($workspaceId: String!, $status: OfferStatus) {
    offers(workspaceId: $workspaceId, status: $status) {
      ...OfferInfo
      intent {
        ...IntentInfo
      }
    }
  }
  ${OFFER_FRAGMENT}
  ${INTENT_FRAGMENT}
`;

export const GET_OFFER_BY_ID = gql`
  query GetOfferById($id: ID!) {
    offer(id: $id) {
      ...OfferInfo
      intent {
        ...IntentInfo
      }
      agreement {
        ...AgreementInfo
      }
    }
  }
  ${OFFER_FRAGMENT}
  ${INTENT_FRAGMENT}  
  ${AGREEMENT_FRAGMENT}
`;

export const GET_OFFERS_BY_INTENT = gql`
  query GetOffersByIntent($intentId: ID!) {
    offersByIntent(intentId: $intentId) {
      ...OfferInfo
    }
  }
  ${OFFER_FRAGMENT}
`;

export const GET_OFFERS_BY_PROVIDER = gql`
  query GetOffersByProvider($providerId: ID!, $workspaceId: String!) {
    offersByProvider(providerId: $providerId, workspaceId: $workspaceId) {
      ...OfferInfo
      intent {
        ...IntentInfo
      }
    }
  }
  ${OFFER_FRAGMENT}
  ${INTENT_FRAGMENT}
`;

// Agreement Queries
export const GET_AGREEMENTS = gql`
  query GetAgreements($workspaceId: String!, $status: AgreementStatus) {
    agreements(workspaceId: $workspaceId, status: $status) {
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

export const GET_AGREEMENT_BY_ID = gql`
  query GetAgreementById($id: ID!) {
    agreement(id: $id) {
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

export const GET_AGREEMENTS_BY_PROVIDER = gql`
  query GetAgreementsByProvider($providerId: ID!, $workspaceId: String!) {
    agreementsByProvider(providerId: $providerId, workspaceId: $workspaceId) {
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

export const GET_AGREEMENTS_BY_RECEIVER = gql`
  query GetAgreementsByReceiver($receiverId: ID!, $workspaceId: String!) {
    agreementsByReceiver(receiverId: $receiverId, workspaceId: $workspaceId) {
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

// Fulfillment Queries
export const GET_FULFILLMENTS = gql`
  query GetFulfillments($workspaceId: String!, $status: FulfillmentStatus) {
    fulfillments(workspaceId: $workspaceId, status: $status) {
      ...FulfillmentInfo
      agreement {
        ...AgreementInfo
      }
    }
  }
  ${FULFILLMENT_FRAGMENT}
  ${AGREEMENT_FRAGMENT}
`;

export const GET_FULFILLMENT_BY_ID = gql`
  query GetFulfillmentById($id: ID!) {
    fulfillment(id: $id) {
      ...FulfillmentInfo
      agreement {
        ...AgreementInfo
      }
    }
  }
  ${FULFILLMENT_FRAGMENT}
  ${AGREEMENT_FRAGMENT}
`;

export const GET_FULFILLMENTS_BY_AGREEMENT = gql`
  query GetFulfillmentsByAgreement($agreementId: ID!) {
    fulfillmentsByAgreement(agreementId: $agreementId) {
      ...FulfillmentInfo
    }
  }
  ${FULFILLMENT_FRAGMENT}
`;

// Resource Queries
export const GET_RESOURCES = gql`
  query GetResources($workspaceId: String!, $available: Boolean) {
    resources(workspaceId: $workspaceId, available: $available) {
      ...ResourceInfo
    }
  }
  ${RESOURCE_FRAGMENT}
`;

export const GET_RESOURCE_BY_ID = gql`
  query GetResourceById($id: ID!) {
    resource(id: $id) {
      ...ResourceInfo
    }
  }
  ${RESOURCE_FRAGMENT}
`;

export const GET_RESOURCES_BY_SPECIFICATION = gql`
  query GetResourcesBySpecification($specificationId: ID!) {
    resourcesBySpecification(specificationId: $specificationId) {
      ...ResourceInfo
    }
  }
  ${RESOURCE_FRAGMENT}
`;

export const GET_RESOURCES_BY_OWNER = gql`
  query GetResourcesByOwner($ownerId: ID!, $workspaceId: String!) {
    resourcesByOwner(ownerId: $ownerId, workspaceId: $workspaceId) {
      ...ResourceInfo
    }
  }
  ${RESOURCE_FRAGMENT}
`;

// Agent Queries
export const GET_AGENTS = gql`
  query GetAgents($workspaceId: String!, $type: AgentType) {
    agents(workspaceId: $workspaceId, type: $type) {
      ...AgentInfo
    }
  }
  ${AGENT_FRAGMENT}
`;

export const GET_AGENT_BY_ID = gql`
  query GetAgentById($id: ID!) {
    agent(id: $id) {
      ...AgentInfo
    }
  }
  ${AGENT_FRAGMENT}
`;

// Resource Specification Queries
export const GET_RESOURCE_SPECIFICATIONS = gql`
  query GetResourceSpecifications($workspaceId: String!, $category: String) {
    resourceSpecifications(workspaceId: $workspaceId, category: $category) {
      ...ResourceSpecificationInfo
    }
  }
  ${RESOURCE_SPECIFICATION_FRAGMENT}
`;

export const GET_RESOURCE_SPECIFICATION_BY_ID = gql`
  query GetResourceSpecificationById($id: ID!) {
    resourceSpecification(id: $id) {
      ...ResourceSpecificationInfo
    }
  }
  ${RESOURCE_SPECIFICATION_FRAGMENT}
`;

// Combined queries for complex workflows
export const GET_RENTAL_WORKFLOW_DATA = gql`
  query GetRentalWorkflowData($workspaceId: String!, $userId: ID) {
    # Pending intents for the user
    myIntents: intentsByReceiver(receiverId: $userId, workspaceId: $workspaceId) {
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
    
    # All pending intents to make offers on
    availableIntents: intents(workspaceId: $workspaceId, status: PENDING) {
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
    
    # User's offers
    myOffers: offersByProvider(providerId: $userId, workspaceId: $workspaceId) {
      ...OfferInfo
      intent {
        ...IntentInfo
      }
    }
    
    # User's agreements as provider
    agreementsAsProvider: agreementsByProvider(providerId: $userId, workspaceId: $workspaceId) {
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
    
    # User's agreements as receiver
    agreementsAsReceiver: agreementsByReceiver(receiverId: $userId, workspaceId: $workspaceId) {
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
    
    # Available resources for the user
    myResources: resourcesByOwner(ownerId: $userId, workspaceId: $workspaceId) {
      ...ResourceInfo
    }
    
    # Resource specifications
    resourceSpecifications(workspaceId: $workspaceId) {
      ...ResourceSpecificationInfo
    }
    
    # Other agents
    agents(workspaceId: $workspaceId) {
      ...AgentInfo
    }
  }
  ${INTENT_FRAGMENT}
  ${OFFER_FRAGMENT}
  ${AGREEMENT_FRAGMENT}
  ${FULFILLMENT_FRAGMENT}
  ${RESOURCE_FRAGMENT}
  ${RESOURCE_SPECIFICATION_FRAGMENT}
  ${AGENT_FRAGMENT}
`;

// Subscription queries for real-time updates
export const INTENT_UPDATED_SUBSCRIPTION = gql`
  subscription IntentUpdated($workspaceId: String!) {
    intentUpdated(workspaceId: $workspaceId) {
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

export const OFFER_UPDATED_SUBSCRIPTION = gql`
  subscription OfferUpdated($workspaceId: String!) {
    offerUpdated(workspaceId: $workspaceId) {
      ...OfferInfo
      intent {
        ...IntentInfo
      }
    }
  }
  ${OFFER_FRAGMENT}
  ${INTENT_FRAGMENT}
`;

export const AGREEMENT_UPDATED_SUBSCRIPTION = gql`
  subscription AgreementUpdated($workspaceId: String!) {
    agreementUpdated(workspaceId: $workspaceId) {
      ...AgreementInfo
      intent {
        ...IntentInfo
      }
      offer {
        ...OfferInfo
      }
    }
  }
  ${AGREEMENT_FRAGMENT}
  ${INTENT_FRAGMENT}
  ${OFFER_FRAGMENT}
`;

export const FULFILLMENT_UPDATED_SUBSCRIPTION = gql`
  subscription FulfillmentUpdated($workspaceId: String!) {
    fulfillmentUpdated(workspaceId: $workspaceId) {
      ...FulfillmentInfo
      agreement {
        ...AgreementInfo
      }
    }
  }
  ${FULFILLMENT_FRAGMENT}
  ${AGREEMENT_FRAGMENT}
`;