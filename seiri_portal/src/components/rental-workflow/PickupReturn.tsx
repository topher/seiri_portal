"use client";

import React, { useState, useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Truck,
  Package,
  MapPin,
  User,
  Calendar,
  AlertTriangle,
  Camera,
  FileText,
  ArrowRight,
  Timer
} from 'lucide-react';
import { format } from 'date-fns/format';
import { toast } from 'sonner';

// GraphQL Queries and Mutations
const GET_ACTIVE_AGREEMENTS = gql`
  query GetActiveAgreements($workspaceId: String!, $userId: ID!) {
    agreements(workspaceId: $workspaceId, status: SIGNED) {
      id
      name
      status
      startTime
      endTime
      provider {
        id
        name
        email
      }
      receiver {
        id
        name
        email
      }
      resource {
        id
        identifier
        condition
        location
      }
      intent {
        resourceSpecification {
          name
          category
        }
      }
      fulfillments {
        id
        action
        status
        startedAt
        completedAt
        location
        notes
      }
      createdAt
    }
  }
`;

const GET_FULFILLMENT_DETAILS = gql`
  query GetFulfillmentDetails($id: ID!) {
    fulfillment(id: $id) {
      id
      action
      status
      startedAt
      completedAt
      location
      notes
      agreement {
        id
        name
        provider {
          id
          name
        }
        receiver {
          id
          name
        }
        resource {
          id
          identifier
          condition
          location
        }
      }
      createdAt
    }
  }
`;

const CREATE_FULFILLMENT = gql`
  mutation CreateFulfillment($input: CreateFulfillmentInput!) {
    createFulfillment(input: $input) {
      id
      action
      status
      location
      notes
      agreement {
        id
        name
      }
      createdAt
    }
  }
`;

const START_FULFILLMENT = gql`
  mutation StartFulfillment($id: ID!) {
    startFulfillment(id: $id) {
      id
      status
      startedAt
      agreement {
        id
        status
      }
    }
  }
`;

const COMPLETE_FULFILLMENT = gql`
  mutation CompleteFulfillment($id: ID!) {
    completeFulfillment(id: $id) {
      id
      status
      completedAt
      agreement {
        id
        status
      }
    }
  }
`;

const UPDATE_FULFILLMENT = gql`
  mutation UpdateFulfillment($id: ID!, $input: UpdateFulfillmentInput!) {
    updateFulfillment(id: $id, input: $input) {
      id
      status
      location
      notes
    }
  }
`;

// Form Schema for Fulfillment Actions
const fulfillmentSchema = z.object({
  location: z.string().min(1, "Location is required"),
  notes: z.string().optional(),
});

type FulfillmentForm = z.infer<typeof fulfillmentSchema>;

interface PickupReturnProps {
  workspaceId: string;
  currentUserId: string;
  agreementId?: string;
}

export function PickupReturn({ 
  workspaceId, 
  currentUserId, 
  agreementId 
}: PickupReturnProps) {
  const [selectedAgreement, setSelectedAgreement] = useState<any>(null);
  const [actionType, setActionType] = useState<'pickup' | 'return' | null>(null);
  const [showFulfillmentForm, setShowFulfillmentForm] = useState(false);

  // Queries
  const { data: agreementsData, loading: agreementsLoading, refetch: refetchAgreements } = useQuery<{
    agreements: any[];
  }>(GET_ACTIVE_AGREEMENTS, {
    variables: { workspaceId, userId: currentUserId },
  });

  // Mutations
  const [createFulfillment, { loading: creatingFulfillment }] = useMutation(CREATE_FULFILLMENT, {
    onCompleted: (data) => {
      toast.success("Fulfillment process started!");
      refetchAgreements();
      setShowFulfillmentForm(false);
      setSelectedAgreement(null);
      setActionType(null);
    },
    onError: (error) => {
      toast.error(`Failed to create fulfillment: ${error.message}`);
    },
  });

  const [startFulfillment, { loading: startingFulfillment }] = useMutation(START_FULFILLMENT, {
    onCompleted: () => {
      toast.success("Process started!");
      refetchAgreements();
    },
    onError: (error) => {
      toast.error(`Failed to start process: ${error.message}`);
    },
  });

  const [completeFulfillment, { loading: completingFulfillment }] = useMutation(COMPLETE_FULFILLMENT, {
    onCompleted: () => {
      toast.success("Process completed!");
      refetchAgreements();
    },
    onError: (error) => {
      toast.error(`Failed to complete process: ${error.message}`);
    },
  });

  const [updateFulfillment] = useMutation(UPDATE_FULFILLMENT, {
    onCompleted: () => {
      toast.success("Process updated!");
      refetchAgreements();
    },
    onError: (error) => {
      toast.error(`Failed to update process: ${error.message}`);
    },
  });

  const form = useForm<FulfillmentForm>({
    resolver: zodResolver(fulfillmentSchema),
    defaultValues: {
      location: "",
      notes: "",
    },
  });

  // Memoized data
  const activeAgreements = useMemo(() => 
    agreementsData?.agreements?.filter((agreement: any) => 
      agreement.status === 'SIGNED' || agreement.status === 'ACTIVE'
    ) || [],
    [agreementsData]
  );

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      SCHEDULED: { color: "default", icon: Timer },
      IN_PROGRESS: { color: "default", icon: Clock },
      COMPLETED: { color: "default", icon: CheckCircle },
      CANCELLED: { color: "destructive", icon: XCircle },
      FAILED: { color: "destructive", icon: AlertTriangle },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.SCHEDULED;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.color as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const getAgreementProgress = (agreement: any) => {
    const fulfillments = agreement.fulfillments || [];
    const totalSteps = 2; // pickup + return
    const completedSteps = fulfillments.filter((f: any) => f.status === 'COMPLETED').length;
    return (completedSteps / totalSteps) * 100;
  };

  const getFulfillmentByAction = (agreement: any, action: string) => {
    return agreement.fulfillments?.find((f: any) => 
      f.action === action || 
      (action === 'pickup' && f.action === 'TRANSFER_CUSTODY') ||
      (action === 'return' && f.action === 'DELIVER_SERVICE')
    );
  };

  const canStartPickup = (agreement: any) => {
    const now = new Date();
    const startTime = new Date(agreement.startTime);
    return now >= startTime && !getFulfillmentByAction(agreement, 'pickup');
  };

  const canStartReturn = (agreement: any) => {
    const pickupFulfillment = getFulfillmentByAction(agreement, 'pickup');
    const returnFulfillment = getFulfillmentByAction(agreement, 'return');
    return pickupFulfillment?.status === 'COMPLETED' && !returnFulfillment;
  };

  const onSubmitFulfillment = async (values: FulfillmentForm) => {
    if (!selectedAgreement || !actionType) return;

    const action = actionType === 'pickup' ? 'TRANSFER_CUSTODY' : 'DELIVER_SERVICE';
    
    try {
      await createFulfillment({
        variables: {
          input: {
            agreementId: selectedAgreement.id,
            action,
            resourceQuantity: 1,
            location: values.location,
            notes: values.notes,
            workspaceId,
          },
        },
      });
    } catch (error) {
      console.error("Failed to create fulfillment:", error);
    }
  };

  const handleStartFulfillment = async (fulfillmentId: string) => {
    try {
      await startFulfillment({ variables: { id: fulfillmentId } });
    } catch (error) {
      console.error("Failed to start fulfillment:", error);
    }
  };

  const handleCompleteFulfillment = async (fulfillmentId: string) => {
    try {
      await completeFulfillment({ variables: { id: fulfillmentId } });
    } catch (error) {
      console.error("Failed to complete fulfillment:", error);
    }
  };

  const isCurrentDay = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  if (agreementsLoading) {
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
            <Truck className="h-5 w-5" />
            Pickup & Return Process
          </CardTitle>
          <CardDescription>
            Manage the physical fulfillment of rental agreements with pickup and return tracking.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeAgreements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              No active rental agreements requiring fulfillment
            </div>
          ) : (
            <div className="space-y-6">
              {activeAgreements.map((agreement: any) => {
                const progress = getAgreementProgress(agreement);
                const pickupFulfillment = getFulfillmentByAction(agreement, 'pickup');
                const returnFulfillment = getFulfillmentByAction(agreement, 'return');
                const isProvider = agreement.provider.id === currentUserId;
                const isReceiver = agreement.receiver.id === currentUserId;

                return (
                  <Card key={agreement.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      {/* Agreement Header */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg">{agreement.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {agreement.intent.resourceSpecification.name}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="mb-2">
                            {agreement.status}
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            {Math.round(progress)}% Complete
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-6">
                        <Progress value={progress} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>Pickup</span>
                          <span>Return</span>
                        </div>
                      </div>

                      {/* Agreement Details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{agreement.resource.identifier}</div>
                            <div className="text-sm text-muted-foreground">
                              {agreement.resource.condition}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{agreement.resource.location}</div>
                            <div className="text-sm text-muted-foreground">Location</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {format(new Date(agreement.startTime), "MMM dd")} - {format(new Date(agreement.endTime), "MMM dd")}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Rental period
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Fulfillment Tracking */}
                      <div className="space-y-4">
                        {/* Pickup Section */}
                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                              <Truck className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-medium">Pickup</div>
                              <div className="text-sm text-muted-foreground">
                                {pickupFulfillment 
                                  ? `${pickupFulfillment.status.toLowerCase()} ${pickupFulfillment.location ? `at ${pickupFulfillment.location}` : ''}`
                                  : isCurrentDay(agreement.startTime) 
                                    ? "Available today" 
                                    : `Available ${format(new Date(agreement.startTime), "MMM dd")}`
                                }
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {pickupFulfillment ? (
                              <>
                                {getStatusBadge(pickupFulfillment.status)}
                                {pickupFulfillment.status === 'SCHEDULED' && isProvider && (
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleStartFulfillment(pickupFulfillment.id)}
                                    disabled={startingFulfillment}
                                  >
                                    Start Pickup
                                  </Button>
                                )}
                                {pickupFulfillment.status === 'IN_PROGRESS' && isProvider && (
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleCompleteFulfillment(pickupFulfillment.id)}
                                    disabled={completingFulfillment}
                                  >
                                    Complete Pickup
                                  </Button>
                                )}
                              </>
                            ) : (
                              canStartPickup(agreement) && isProvider && (
                                <Button 
                                  size="sm" 
                                  onClick={() => {
                                    setSelectedAgreement(agreement);
                                    setActionType('pickup');
                                    setShowFulfillmentForm(true);
                                    form.setValue('location', agreement.resource.location);
                                  }}
                                >
                                  Schedule Pickup
                                </Button>
                              )
                            )}
                          </div>
                        </div>

                        {/* Return Section */}
                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                              <ArrowRight className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-medium">Return</div>
                              <div className="text-sm text-muted-foreground">
                                {returnFulfillment 
                                  ? `${returnFulfillment.status.toLowerCase()} ${returnFulfillment.location ? `at ${returnFulfillment.location}` : ''}`
                                  : pickupFulfillment?.status === 'COMPLETED'
                                    ? `Due ${format(new Date(agreement.endTime), "MMM dd")}`
                                    : "Pending pickup completion"
                                }
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {returnFulfillment ? (
                              <>
                                {getStatusBadge(returnFulfillment.status)}
                                {returnFulfillment.status === 'SCHEDULED' && isReceiver && (
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleStartFulfillment(returnFulfillment.id)}
                                    disabled={startingFulfillment}
                                  >
                                    Start Return
                                  </Button>
                                )}
                                {returnFulfillment.status === 'IN_PROGRESS' && isReceiver && (
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleCompleteFulfillment(returnFulfillment.id)}
                                    disabled={completingFulfillment}
                                  >
                                    Complete Return
                                  </Button>
                                )}
                              </>
                            ) : (
                              canStartReturn(agreement) && isReceiver && (
                                <Button 
                                  size="sm" 
                                  onClick={() => {
                                    setSelectedAgreement(agreement);
                                    setActionType('return');
                                    setShowFulfillmentForm(true);
                                    form.setValue('location', agreement.resource.location);
                                  }}
                                >
                                  Schedule Return
                                </Button>
                              )
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Parties Information */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t text-sm">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {agreement.provider.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-muted-foreground">Provider:</span>
                          <span className="font-medium">{agreement.provider.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {agreement.receiver.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-muted-foreground">Receiver:</span>
                          <span className="font-medium">{agreement.receiver.name}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fulfillment Form Modal */}
      {showFulfillmentForm && selectedAgreement && actionType && (
        <Card className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {actionType === 'pickup' ? <Truck className="h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}
                Schedule {actionType === 'pickup' ? 'Pickup' : 'Return'}
              </CardTitle>
              <CardDescription>
                {selectedAgreement.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitFulfillment)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {actionType === 'pickup' ? 'Pickup' : 'Return'} Location
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter specific location details..."
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Special instructions, contact info, etc..."
                            className="min-h-[80px]"
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
                      onClick={() => {
                        setShowFulfillmentForm(false);
                        setSelectedAgreement(null);
                        setActionType(null);
                      }}
                      disabled={creatingFulfillment}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={creatingFulfillment}>
                      {creatingFulfillment ? "Scheduling..." : `Schedule ${actionType === 'pickup' ? 'Pickup' : 'Return'}`}
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