"use client";

import React, { useState, useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { gql } from 'graphql-tag';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign, 
  Calendar,
  Package,
  User,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

// GraphQL Queries and Mutations
const GET_PENDING_INTENTS = gql`
  query GetPendingIntents($workspaceId: String!, $providerId: ID) {
    intents(workspaceId: $workspaceId, status: PENDING) {
      id
      name
      description
      action
      status
      startTime
      endTime
      dueDate
      resourceQuantity
      resourceSpecification {
        id
        name
        description
        category
        unitOfMeasure
      }
      receiver {
        id
        name
        email
      }
      offers {
        id
        status
        provider {
          id
          name
        }
      }
      createdAt
    }
  }
`;

const GET_MY_OFFERS = gql`
  query GetMyOffers($workspaceId: String!, $providerId: ID!) {
    offersByProvider(providerId: $providerId, workspaceId: $workspaceId) {
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
      intent {
        id
        name
        receiver {
          id
          name
        }
        resourceSpecification {
          name
          category
        }
      }
      resource {
        id
        identifier
        condition
        location
      }
      createdAt
    }
  }
`;

const GET_AVAILABLE_RESOURCES = gql`
  query GetAvailableResourcesForOffer($workspaceId: String!, $ownerId: ID!, $specificationId: ID) {
    resourcesByOwner(ownerId: $ownerId, workspaceId: $workspaceId) {
      id
      identifier
      condition
      location
      availableFrom
      availableUntil
      specification {
        id
        name
        category
      }
    }
  }
`;

const CREATE_OFFER = gql`
  mutation CreateOffer($input: CreateOfferInput!) {
    createOffer(input: $input) {
      id
      name
      status
      price
      currency
      terms
      intent {
        id
        name
      }
      resource {
        id
        identifier
      }
      createdAt
    }
  }
`;

const UPDATE_OFFER = gql`
  mutation UpdateOffer($id: ID!, $input: UpdateOfferInput!) {
    updateOffer(id: $id, input: $input) {
      id
      status
      name
      description
      terms
      price
      currency
    }
  }
`;

const ACCEPT_OFFER = gql`
  mutation AcceptOffer($id: ID!) {
    acceptOffer(id: $id) {
      id
      status
      intent {
        id
        status
      }
    }
  }
`;

const DECLINE_OFFER = gql`
  mutation DeclineOffer($id: ID!) {
    declineOffer(id: $id) {
      id
      status
    }
  }
`;

// Form Schema for Creating Offers
const offerSchema = z.object({
  name: z.string().min(1, "Offer name is required"),
  description: z.string().optional(),
  resourceId: z.string().min(1, "Please select a resource"),
  resourceQuantity: z.number().min(1, "Quantity must be at least 1"),
  terms: z.string().optional(),
  price: z.number().min(0, "Price must be non-negative").optional(),
  currency: z.string().optional(),
});

type OfferForm = z.infer<typeof offerSchema>;

interface ApprovalFlowProps {
  workspaceId: string;
  currentUserId: string;
  view?: 'provider' | 'receiver';
}

export function ApprovalFlow({ 
  workspaceId, 
  currentUserId, 
  view = 'provider' 
}: ApprovalFlowProps) {
  const [selectedIntent, setSelectedIntent] = useState<any>(null);
  const [activeTab, setActiveTab] = useState(view === 'provider' ? 'intents' : 'my-offers');

  // Queries
  const { data: intentsData, loading: intentsLoading, refetch: refetchIntents } = useQuery(GET_PENDING_INTENTS, {
    variables: { workspaceId },
  });

  const { data: offersData, loading: offersLoading, refetch: refetchOffers } = useQuery(GET_MY_OFFERS, {
    variables: { workspaceId, providerId: currentUserId },
  });

  const { data: resourcesData, loading: resourcesLoading } = useQuery(GET_AVAILABLE_RESOURCES, {
    variables: { 
      workspaceId, 
      ownerId: currentUserId,
      specificationId: selectedIntent?.resourceSpecification?.id 
    },
    skip: !selectedIntent,
  });

  // Mutations
  const [createOffer, { loading: creatingOffer }] = useMutation(CREATE_OFFER, {
    onCompleted: () => {
      toast.success("Offer created successfully!");
      refetchIntents();
      refetchOffers();
      setSelectedIntent(null);
    },
    onError: (error) => {
      toast.error(`Failed to create offer: ${error.message}`);
    },
  });

  const [updateOffer] = useMutation(UPDATE_OFFER, {
    onCompleted: () => {
      toast.success("Offer updated successfully!");
      refetchOffers();
    },
    onError: (error) => {
      toast.error(`Failed to update offer: ${error.message}`);
    },
  });

  const [acceptOffer] = useMutation(ACCEPT_OFFER, {
    onCompleted: () => {
      toast.success("Offer accepted! Agreement created.");
      refetchOffers();
    },
    onError: (error) => {
      toast.error(`Failed to accept offer: ${error.message}`);
    },
  });

  const [declineOffer] = useMutation(DECLINE_OFFER, {
    onCompleted: () => {
      toast.success("Offer declined.");
      refetchOffers();
    },
    onError: (error) => {
      toast.error(`Failed to decline offer: ${error.message}`);
    },
  });

  const form = useForm<OfferForm>({
    resolver: zodResolver(offerSchema),
    defaultValues: {
      name: "",
      description: "",
      resourceQuantity: 1,
      price: 0,
      currency: "USD",
    },
  });

  // Memoized data
  const pendingIntents = useMemo(() => 
    intentsData?.intents?.filter((intent: any) => intent.status === 'PENDING') || [],
    [intentsData]
  );

  const myOffers = useMemo(() => 
    offersData?.offersByProvider || [],
    [offersData]
  );

  const availableResources = useMemo(() => 
    resourcesData?.resourcesByOwner?.filter((resource: any) => 
      !selectedIntent || resource.specification.id === selectedIntent.resourceSpecification.id
    ) || [],
    [resourcesData, selectedIntent]
  );

  const onSubmitOffer = async (values: OfferForm) => {
    if (!selectedIntent) return;

    try {
      await createOffer({
        variables: {
          input: {
            ...values,
            intentId: selectedIntent.id,
            startTime: selectedIntent.startTime,
            endTime: selectedIntent.endTime,
            workspaceId,
          },
        },
      });
    } catch (error) {
      console.error("Failed to create offer:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { color: "default", icon: Clock },
      PROPOSED: { color: "default", icon: Clock },
      ACCEPTED: { color: "default", icon: CheckCircle },
      DECLINED: { color: "destructive", icon: XCircle },
      WITHDRAWN: { color: "secondary", icon: AlertCircle },
      EXPIRED: { color: "secondary", icon: AlertCircle },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.color as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  if (intentsLoading || offersLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Approval Flow
          </CardTitle>
          <CardDescription>
            Manage rental requests and offers using the ValueFlows intent-offer-agreement pattern.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="intents">Pending Requests</TabsTrigger>
              <TabsTrigger value="my-offers">My Offers</TabsTrigger>
            </TabsList>

            {/* Pending Intents/Requests Tab */}
            <TabsContent value="intents" className="mt-6">
              <div className="space-y-4">
                {pendingIntents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    No pending rental requests
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {pendingIntents.map((intent: any) => (
                      <Card key={intent.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h4 className="font-semibold">{intent.name}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {intent.description}
                              </p>
                            </div>
                            {getStatusBadge(intent.status)}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">
                                  {intent.resourceSpecification.name}
                                </div>
                                <div className="text-muted-foreground">
                                  Qty: {intent.resourceQuantity}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">
                                  {format(new Date(intent.startTime), "MMM dd")} - {format(new Date(intent.endTime), "MMM dd")}
                                </div>
                                <div className="text-muted-foreground">
                                  {intent.dueDate && `Due: ${format(new Date(intent.dueDate), "MMM dd")}`}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{intent.receiver.name}</div>
                                <div className="text-muted-foreground text-xs">
                                  {intent.receiver.email}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-between items-center mt-4 pt-3 border-t">
                            <div className="text-xs text-muted-foreground">
                              {intent.offers.length} offer(s)
                            </div>
                            <Button
                              size="sm"
                              onClick={() => setSelectedIntent(intent)}
                              disabled={intent.offers.some((offer: any) => offer.provider.id === currentUserId)}
                            >
                              {intent.offers.some((offer: any) => offer.provider.id === currentUserId) 
                                ? "Already Offered" 
                                : "Make Offer"
                              }
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* My Offers Tab */}
            <TabsContent value="my-offers" className="mt-6">
              <div className="space-y-4">
                {myOffers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    No offers created yet
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {myOffers.map((offer: any) => (
                      <Card key={offer.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h4 className="font-semibold">{offer.name}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                For: {offer.intent.name}
                              </p>
                            </div>
                            {getStatusBadge(offer.status)}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">
                                  {offer.resource?.identifier || offer.intent.resourceSpecification.name}
                                </div>
                                <div className="text-muted-foreground">
                                  Qty: {offer.resourceQuantity}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">
                                  {offer.price ? `${offer.currency} ${offer.price}` : "No price set"}
                                </div>
                                <div className="text-muted-foreground text-xs">
                                  {offer.terms || "No terms specified"}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{offer.intent.receiver.name}</div>
                                <div className="text-muted-foreground text-xs">
                                  Requester
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
                            {offer.status === 'PROPOSED' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => declineOffer({ variables: { id: offer.id } })}
                                >
                                  Withdraw
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => acceptOffer({ variables: { id: offer.id } })}
                                >
                                  Accept
                                </Button>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create Offer Modal */}
      {selectedIntent && (
        <Card className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Create Offer</CardTitle>
              <CardDescription>
                Respond to: {selectedIntent.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitOffer)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Offer Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Premium camera rental offer" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="resourceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Resource</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose your resource" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableResources.map((resource: any) => (
                              <SelectItem key={resource.id} value={resource.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{resource.identifier}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {resource.condition} • {resource.location}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="EUR">EUR</SelectItem>
                              <SelectItem value="GBP">GBP</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="terms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Terms & Conditions</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Rental terms, conditions, pickup/return instructions..."
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSelectedIntent(null)}
                      disabled={creatingOffer}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={creatingOffer || resourcesLoading}>
                      {creatingOffer ? "Creating..." : "Create Offer"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </Card>
      )}
    </div>
  );
}