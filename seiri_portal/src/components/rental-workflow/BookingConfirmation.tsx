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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  CheckCircle, 
  FileText, 
  Calendar,
  Package,
  User,
  DollarSign,
  MapPin,
  Clock,
  AlertTriangle,
  Signature
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

// GraphQL Queries and Mutations
const GET_ACCEPTED_OFFERS = gql`
  query GetAcceptedOffers($workspaceId: String!, $receiverId: ID) {
    offers(workspaceId: $workspaceId, status: ACCEPTED) {
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
      intent {
        id
        name
        description
        resourceSpecification {
          id
          name
          category
          unitOfMeasure
        }
      }
      resource {
        id
        identifier
        condition
        location
      }
      agreement {
        id
        status
        signedAt
      }
      createdAt
    }
  }
`;

const GET_AGREEMENT_DETAILS = gql`
  query GetAgreementDetails($id: ID!) {
    agreement(id: $id) {
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
      intent {
        id
        name
        resourceSpecification {
          name
          category
        }
      }
      offer {
        id
        name
      }
      resource {
        id
        identifier
        condition
        location
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

const CREATE_AGREEMENT = gql`
  mutation CreateAgreement($input: CreateAgreementInput!) {
    createAgreement(input: $input) {
      id
      name
      status
      terms
      price
      currency
      provider {
        id
        name
      }
      receiver {
        id
        name
      }
      createdAt
    }
  }
`;

const SIGN_AGREEMENT = gql`
  mutation SignAgreement($id: ID!) {
    signAgreement(id: $id) {
      id
      status
      signedAt
      provider {
        id
        name
      }
      receiver {
        id
        name
      }
    }
  }
`;

const UPDATE_AGREEMENT = gql`
  mutation UpdateAgreement($id: ID!, $input: UpdateAgreementInput!) {
    updateAgreement(id: $id, input: $input) {
      id
      name
      description
      terms
      status
    }
  }
`;

// Form Schema for Agreement Creation
const agreementSchema = z.object({
  name: z.string().min(1, "Agreement name is required"),
  description: z.string().optional(),
  terms: z.string().min(10, "Terms must be at least 10 characters"),
});

type AgreementForm = z.infer<typeof agreementSchema>;

interface BookingConfirmationProps {
  workspaceId: string;
  currentUserId: string;
  offerId?: string;
  agreementId?: string;
}

export function BookingConfirmation({ 
  workspaceId, 
  currentUserId, 
  offerId,
  agreementId 
}: BookingConfirmationProps) {
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [showSignatureConfirm, setShowSignatureConfirm] = useState(false);

  // Queries
  const { data: offersData, loading: offersLoading, refetch: refetchOffers } = useQuery(GET_ACCEPTED_OFFERS, {
    variables: { workspaceId, receiverId: currentUserId },
    skip: !!agreementId,
  });

  const { data: agreementData, loading: agreementLoading, refetch: refetchAgreement } = useQuery(GET_AGREEMENT_DETAILS, {
    variables: { id: agreementId! },
    skip: !agreementId,
  });

  // Mutations
  const [createAgreement, { loading: creatingAgreement }] = useMutation(CREATE_AGREEMENT, {
    onCompleted: (data) => {
      toast.success("Agreement created successfully!");
      refetchOffers();
      setSelectedOffer(null);
    },
    onError: (error) => {
      toast.error(`Failed to create agreement: ${error.message}`);
    },
  });

  const [signAgreement, { loading: signingAgreement }] = useMutation(SIGN_AGREEMENT, {
    onCompleted: (data) => {
      toast.success("Agreement signed successfully!");
      refetchAgreement();
      setShowSignatureConfirm(false);
    },
    onError: (error) => {
      toast.error(`Failed to sign agreement: ${error.message}`);
    },
  });

  const form = useForm<AgreementForm>({
    resolver: zodResolver(agreementSchema),
    defaultValues: {
      name: "",
      description: "",
      terms: "",
    },
  });

  // Memoized data
  const acceptedOffers = useMemo(() => 
    offersData?.offers?.filter((offer: any) => 
      offer.status === 'ACCEPTED' && !offer.agreement
    ) || [],
    [offersData]
  );

  const agreement = useMemo(() => 
    agreementData?.agreement,
    [agreementData]
  );

  const onSubmitAgreement = async (values: AgreementForm) => {
    if (!selectedOffer) return;

    try {
      await createAgreement({
        variables: {
          input: {
            ...values,
            intentId: selectedOffer.intent.id,
            offerId: selectedOffer.id,
            workspaceId,
          },
        },
      });
    } catch (error) {
      console.error("Failed to create agreement:", error);
    }
  };

  const handleSignAgreement = async () => {
    if (!agreement) return;

    try {
      await signAgreement({
        variables: { id: agreement.id },
      });
    } catch (error) {
      console.error("Failed to sign agreement:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { color: "default", icon: Clock },
      SIGNED: { color: "default", icon: CheckCircle },
      ACTIVE: { color: "default", icon: CheckCircle },
      FULFILLED: { color: "default", icon: CheckCircle },
      CANCELLED: { color: "destructive", icon: AlertTriangle },
      DISPUTED: { color: "destructive", icon: AlertTriangle },
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

  const calculateDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (offersLoading || agreementLoading) {
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

  // Show specific agreement if agreementId is provided
  if (agreementId && agreement) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {agreement.name}
              </CardTitle>
              <CardDescription>
                Agreement ID: {agreement.id}
              </CardDescription>
            </div>
            {getStatusBadge(agreement.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Agreement Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Parties
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{agreement.provider.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{agreement.provider.name}</div>
                      <div className="text-xs text-muted-foreground">Provider</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{agreement.receiver.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{agreement.receiver.name}</div>
                      <div className="text-xs text-muted-foreground">Receiver</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Timeline
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span>{calculateDuration(agreement.startTime, agreement.endTime)} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Start:</span>
                    <span>{format(new Date(agreement.startTime), "PPp")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">End:</span>
                    <span>{format(new Date(agreement.endTime), "PPp")}</span>
                  </div>
                  {agreement.signedAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Signed:</span>
                      <span>{format(new Date(agreement.signedAt), "PPp")}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Resource Details
                </h4>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="font-medium">{agreement.resource.identifier}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {agreement.intent.resourceSpecification.name} • {agreement.resource.condition}
                  </div>
                  {agreement.resource.location && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                      <MapPin className="h-3 w-3" />
                      {agreement.resource.location}
                    </div>
                  )}
                </div>
              </div>

              {agreement.price && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Financial Terms
                  </h4>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="font-medium text-lg">
                      {agreement.currency} {agreement.price}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total rental cost
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Terms and Conditions */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Terms & Conditions
            </h4>
            <div className="p-4 bg-muted/30 rounded-lg border">
              <pre className="whitespace-pre-wrap text-sm font-mono">
                {agreement.terms}
              </pre>
            </div>
          </div>

          {/* Fulfillment Status */}
          {agreement.fulfillments && agreement.fulfillments.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Fulfillment Progress
                </h4>
                <div className="space-y-2">
                  {agreement.fulfillments.map((fulfillment: any, index: number) => (
                    <div key={fulfillment.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <div className="font-medium">{fulfillment.action}</div>
                        {fulfillment.notes && (
                          <div className="text-sm text-muted-foreground">{fulfillment.notes}</div>
                        )}
                      </div>
                      {getStatusBadge(fulfillment.status)}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <Separator />
          <div className="flex justify-end gap-2">
            {agreement.status === 'PENDING' && agreement.receiver.id === currentUserId && (
              <Button
                onClick={() => setShowSignatureConfirm(true)}
                disabled={signingAgreement}
                className="flex items-center gap-2"
              >
                <Signature className="h-4 w-4" />
                {signingAgreement ? "Signing..." : "Sign Agreement"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show accepted offers that need agreements
  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Booking Confirmation
          </CardTitle>
          <CardDescription>
            Finalize accepted offers into binding agreements using the ValueFlows pattern.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {acceptedOffers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              No accepted offers waiting for agreement
            </div>
          ) : (
            <div className="space-y-4">
              {acceptedOffers.map((offer: any) => (
                <Card key={offer.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold">{offer.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {offer.description || offer.intent.name}
                        </p>
                      </div>
                      {getStatusBadge(offer.status)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
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
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {format(new Date(offer.startTime), "MMM dd")} - {format(new Date(offer.endTime), "MMM dd")}
                          </div>
                          <div className="text-muted-foreground">
                            {calculateDuration(offer.startTime, offer.endTime)} days
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {offer.price ? `${offer.currency} ${offer.price}` : "Free"}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            Total cost
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t">
                      <div className="text-xs text-muted-foreground">
                        From: {offer.provider.name}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedOffer(offer);
                          form.setValue('name', `Agreement for ${offer.name}`);
                          form.setValue('terms', offer.terms || '');
                        }}
                      >
                        Create Agreement
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Agreement Modal */}
      {selectedOffer && (
        <Card className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Create Agreement</CardTitle>
              <CardDescription>
                Formalize the rental arrangement for: {selectedOffer.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitAgreement)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agreement Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Additional agreement details..."
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="terms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Terms & Conditions</FormLabel>
                        <FormControl>
                          <Textarea 
                            className="min-h-[150px] font-mono"
                            placeholder="Enter the complete terms and conditions for this rental agreement..."
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
                      onClick={() => setSelectedOffer(null)}
                      disabled={creatingAgreement}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={creatingAgreement}>
                      {creatingAgreement ? "Creating..." : "Create Agreement"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </Card>
      )}

      {/* Signature Confirmation Modal */}
      {showSignatureConfirm && agreement && (
        <Card className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Signature className="h-5 w-5" />
                Confirm Signature
              </CardTitle>
              <CardDescription>
                By signing, you agree to all terms and conditions of this rental agreement.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="font-medium">{agreement.name}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {agreement.price ? `${agreement.currency} ${agreement.price}` : "No cost"}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  This action cannot be undone
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowSignatureConfirm(false)}
                    disabled={signingAgreement}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSignAgreement}
                    disabled={signingAgreement}
                  >
                    {signingAgreement ? "Signing..." : "Sign Agreement"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </Card>
      )}
    </div>
  );
}