"use client";

import React, { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Package, 
  MessageSquare, 
  FileText, 
  Truck,
  ArrowRight,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

import { 
  RentalRequest, 
  ApprovalFlow, 
  BookingConfirmation, 
  PickupReturn,
  type RentalWorkflowStep,
  stepDisplayNames,
  getNextStep,
  getPreviousStep
} from './index';

import { GET_RENTAL_WORKFLOW_DATA } from '@/lib/apollo/rental-workflow-queries';

// Rental workflow data interfaces
interface Intent {
  id: string;
  status: string;
  [key: string]: any;
}

interface Offer {
  id: string;
  status: string;
  [key: string]: any;
}

interface Agreement {
  id: string;
  status: string;
  [key: string]: any;
}

interface RentalWorkflowData {
  myIntents?: Intent[];
  myOffers?: Offer[];
  agreementsAsProvider?: Agreement[];
  agreementsAsReceiver?: Agreement[];
}

interface RentalWorkflowProps {
  workspaceId: string;
  currentUserId: string;
  initialStep?: RentalWorkflowStep;
  onStepChange?: (step: RentalWorkflowStep) => void;
}

export function RentalWorkflow({ 
  workspaceId, 
  currentUserId, 
  initialStep = 'request',
  onStepChange 
}: RentalWorkflowProps) {
  const [currentStep, setCurrentStep] = useState<RentalWorkflowStep>(initialStep);
  const [showFullWorkflow, setShowFullWorkflow] = useState(false);

  // Get comprehensive workflow data
  const { data, loading, refetch } = useQuery<RentalWorkflowData>(GET_RENTAL_WORKFLOW_DATA, {
    variables: { workspaceId, userId: currentUserId },
    errorPolicy: 'all'
  });

  // Calculate workflow statistics
  const workflowStats = useMemo(() => {
    if (!data) return {
      pendingIntents: 0,
      activeOffers: 0,
      signedAgreements: 0,
      activeRentals: 0,
      completedRentals: 0
    };

    const myIntents = data.myIntents || [];
    const myOffers = data.myOffers || [];
    const agreementsAsProvider = data.agreementsAsProvider || [];
    const agreementsAsReceiver = data.agreementsAsReceiver || [];
    
    const allAgreements = [...agreementsAsProvider, ...agreementsAsReceiver];

    return {
      pendingIntents: myIntents.filter((intent: any) => intent.status === 'PENDING').length,
      activeOffers: myOffers.filter((offer: any) => offer.status === 'PROPOSED').length,
      signedAgreements: allAgreements.filter((agreement: any) => agreement.status === 'SIGNED').length,
      activeRentals: allAgreements.filter((agreement: any) => 
        agreement.status === 'ACTIVE' || agreement.status === 'SIGNED'
      ).length,
      completedRentals: allAgreements.filter((agreement: any) => agreement.status === 'FULFILLED').length
    };
  }, [data]);

  const handleStepChange = (step: RentalWorkflowStep) => {
    setCurrentStep(step);
    onStepChange?.(step);
  };

  const getStepIcon = (step: RentalWorkflowStep) => {
    const icons = {
      request: Package,
      approval: MessageSquare,
      confirmation: FileText,
      fulfillment: Truck
    };
    return icons[step];
  };

  const getStepStatus = (step: RentalWorkflowStep) => {
    if (step === currentStep) return 'active';
    
    // Determine if step has pending items
    switch (step) {
      case 'request':
        return workflowStats.pendingIntents > 0 ? 'pending' : 'completed';
      case 'approval':
        return workflowStats.activeOffers > 0 ? 'pending' : 'completed';
      case 'confirmation':
        return workflowStats.signedAgreements > 0 ? 'pending' : 'completed';
      case 'fulfillment':
        return workflowStats.activeRentals > 0 ? 'pending' : 'completed';
      default:
        return 'pending';
    }
  };

  const getStepProgress = () => {
    const stepOrder: RentalWorkflowStep[] = ['request', 'approval', 'confirmation', 'fulfillment'];
    const currentIndex = stepOrder.indexOf(currentStep);
    return ((currentIndex + 1) / stepOrder.length) * 100;
  };

  if (loading) {
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

  if (showFullWorkflow) {
    return (
      <div className="w-full space-y-6">
        {/* Workflow Header */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Rental Workflow
                </CardTitle>
                <CardDescription>
                  Complete ValueFlows rental process from intent to fulfillment
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFullWorkflow(false)}
              >
                Compact View
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Progress Indicator */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Workflow Progress</span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(getStepProgress())}% Complete
                </span>
              </div>
              <Progress value={getStepProgress()} className="h-2" />
            </div>

            {/* Step Navigation */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {(['request', 'approval', 'confirmation', 'fulfillment'] as RentalWorkflowStep[]).map((step, index) => {
                const Icon = getStepIcon(step);
                const status = getStepStatus(step);
                const isActive = step === currentStep;

                return (
                  <Button
                    key={step}
                    variant={isActive ? undefined : 'outline'}
                    className={`h-auto p-4 flex flex-col gap-2 ${
                      status === 'completed' ? 'border-green-200 bg-green-50' :
                      status === 'pending' ? 'border-orange-200 bg-orange-50' :
                      ''
                    }`}
                    onClick={() => handleStepChange(step)}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{stepDisplayNames[step]}</span>
                    {status === 'completed' && <CheckCircle className="h-3 w-3 text-green-600" />}
                    {status === 'pending' && <AlertCircle className="h-3 w-3 text-orange-600" />}
                    {status === 'active' && <Clock className="h-3 w-3 text-blue-600" />}
                  </Button>
                );
              })}
            </div>

            {/* Workflow Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{workflowStats.pendingIntents}</div>
                <div className="text-xs text-muted-foreground">Pending Requests</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{workflowStats.activeOffers}</div>
                <div className="text-xs text-muted-foreground">Active Offers</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{workflowStats.signedAgreements}</div>
                <div className="text-xs text-muted-foreground">Signed Agreements</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{workflowStats.activeRentals}</div>
                <div className="text-xs text-muted-foreground">Active Rentals</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">{workflowStats.completedRentals}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Step Content */}
        <div>
          {currentStep === 'request' && (
            <RentalRequest
              workspaceId={workspaceId}
              receiverId={currentUserId}
              onSuccess={() => {
                refetch();
                handleStepChange('approval');
              }}
            />
          )}
          {currentStep === 'approval' && (
            <ApprovalFlow
              workspaceId={workspaceId}
              currentUserId={currentUserId}
              view="provider"
            />
          )}
          {currentStep === 'confirmation' && (
            <BookingConfirmation
              workspaceId={workspaceId}
              currentUserId={currentUserId}
            />
          )}
          {currentStep === 'fulfillment' && (
            <PickupReturn
              workspaceId={workspaceId}
              currentUserId={currentUserId}
            />
          )}
        </div>

        {/* Navigation Controls */}
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => {
                  const prevStep = getPreviousStep(currentStep);
                  if (prevStep) handleStepChange(prevStep);
                }}
                disabled={!getPreviousStep(currentStep)}
              >
                Previous Step
              </Button>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {stepDisplayNames[currentStep]}
                </Badge>
              </div>

              <Button
                onClick={() => {
                  const nextStep = getNextStep(currentStep);
                  if (nextStep) handleStepChange(nextStep);
                }}
                disabled={!getNextStep(currentStep)}
              >
                Next Step
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Compact View - Tabbed Interface
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Rental Workflow
            </CardTitle>
            <CardDescription>
              Manage rental requests through the complete ValueFlows process
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFullWorkflow(true)}
          >
            Full Workflow
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={currentStep} onValueChange={(value) => handleStepChange(value as RentalWorkflowStep)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="request" className="flex items-center gap-1">
              <Package className="h-4 w-4" />
              Request
              {workflowStats.pendingIntents > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                  {workflowStats.pendingIntents}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approval" className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              Approval
              {workflowStats.activeOffers > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                  {workflowStats.activeOffers}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="confirmation" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Confirmation
              {workflowStats.signedAgreements > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                  {workflowStats.signedAgreements}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="fulfillment" className="flex items-center gap-1">
              <Truck className="h-4 w-4" />
              Fulfillment
              {workflowStats.activeRentals > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                  {workflowStats.activeRentals}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="request" className="mt-6">
            <RentalRequest
              workspaceId={workspaceId}
              receiverId={currentUserId}
              onSuccess={() => {
                refetch();
                handleStepChange('approval');
              }}
            />
          </TabsContent>

          <TabsContent value="approval" className="mt-6">
            <ApprovalFlow
              workspaceId={workspaceId}
              currentUserId={currentUserId}
            />
          </TabsContent>

          <TabsContent value="confirmation" className="mt-6">
            <BookingConfirmation
              workspaceId={workspaceId}
              currentUserId={currentUserId}
            />
          </TabsContent>

          <TabsContent value="fulfillment" className="mt-6">
            <PickupReturn
              workspaceId={workspaceId}
              currentUserId={currentUserId}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}