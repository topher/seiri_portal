"use client";

import React, { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Package, Clock, User } from 'lucide-react';
import { format } from 'date-fns/format';
import { toast } from 'sonner';

// GraphQL Queries and Mutations
const GET_RESOURCES = gql`
  query GetResourcesForRental($workspaceId: String!, $available: Boolean) {
    resources(workspaceId: $workspaceId, available: $available) {
      id
      identifier
      condition
      location
      availableFrom
      availableUntil
      specification {
        id
        name
        description
        category
        unitOfMeasure
      }
      currentOwner {
        id
        name
      }
    }
    resourceSpecifications(workspaceId: $workspaceId) {
      id
      name
      description
      category
      unitOfMeasure
    }
    agents(workspaceId: $workspaceId, type: PERSON) {
      id
      name
      email
    }
  }
`;

const CREATE_INTENT = gql`
  mutation CreateRentalIntent($input: CreateIntentInput!) {
    createIntent(input: $input) {
      id
      name
      description
      action
      status
      startTime
      endTime
      resourceSpecification {
        id
        name
        category
      }
      receiver {
        id
        name
      }
      createdAt
    }
  }
`;

// Form Schema
const rentalRequestSchema = z.object({
  name: z.string().min(1, "Request name is required"),
  description: z.string().optional(),
  resourceSpecificationId: z.string().min(1, "Please select a resource type"),
  resourceQuantity: z.number().min(1, "Quantity must be at least 1"),
  startTime: z.date({
    message: "Start date is required",
  }),
  endTime: z.date({
    message: "End date is required",
  }),
  dueDate: z.date().optional(),
}).refine((data) => data.endTime > data.startTime, {
  message: "End date must be after start date",
  path: ["endTime"],
});

type RentalRequestForm = z.infer<typeof rentalRequestSchema>;

interface RentalRequestProps {
  workspaceId: string;
  receiverId?: string;
  onSuccess?: (intent: any) => void;
  onCancel?: () => void;
}

export function RentalRequest({ 
  workspaceId, 
  receiverId, 
  onSuccess, 
  onCancel 
}: RentalRequestProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  
  const { data, loading: resourcesLoading } = useQuery<{
    resources: any[];
    resourceSpecifications: any[];
    agents: any[];
  }>(GET_RESOURCES, {
    variables: { workspaceId, available: true },
  });

  const [createIntent, { loading: creatingIntent }] = useMutation<{
    createIntent: any;
  }>(CREATE_INTENT, {
    onCompleted: (data) => {
      toast.success("Rental request created successfully!");
      onSuccess?.(data.createIntent);
    },
    onError: (error) => {
      toast.error(`Failed to create rental request: ${error.message}`);
    },
  });

  const form = useForm<RentalRequestForm>({
    resolver: zodResolver(rentalRequestSchema),
    defaultValues: {
      name: "",
      description: "",
      resourceQuantity: 1,
    },
  });

  const onSubmit = async (values: RentalRequestForm) => {
    try {
      await createIntent({
        variables: {
          input: {
            ...values,
            action: "USE",
            receiverId: receiverId || data?.agents[0]?.id,
            workspaceId,
            startTime: values.startTime.toISOString(),
            endTime: values.endTime.toISOString(),
            dueDate: values.dueDate?.toISOString(),
          },
        },
      });
    } catch (error) {
      console.error("Failed to create rental request:", error);
    }
  };

  const resourceSpecifications = data?.resourceSpecifications || [];
  const filteredSpecs = selectedCategory 
    ? resourceSpecifications.filter((spec: any) => spec.category === selectedCategory)
    : resourceSpecifications;
  
  const categories = Array.from(new Set(resourceSpecifications.map((spec: any) => spec.category))) as string[];
  const availableResources = data?.resources || [];

  if (resourcesLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Request Rental
        </CardTitle>
        <CardDescription>
          Create a rental request using the ValueFlows pattern. Your intent will be matched with available offers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Request Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Camera rental for event" 
                        {...field} 
                      />
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
                        placeholder="Additional details about your rental needs..."
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Resource Selection */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Package className="h-4 w-4" />
                Resource Selection
              </div>

              {/* Category Filter */}
              <div>
                <FormLabel>Category</FormLabel>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <FormField
                control={form.control}
                name="resourceSpecificationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resource Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select resource type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredSpecs.map((spec: any) => (
                          <SelectItem key={spec.id} value={spec.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{spec.name}</span>
                              {spec.description && (
                                <span className="text-xs text-muted-foreground">
                                  {spec.description}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="resourceQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Time Selection */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clock className="h-4 w-4" />
                Rental Period
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal ${
                                !field.value && "text-muted-foreground"
                              }`}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick start date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal ${
                                !field.value && "text-muted-foreground"
                              }`}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick end date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Available Resources Info */}
            {form.watch("resourceSpecificationId") && (
              <div className="p-4 border rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">Available Resources</h4>
                <div className="space-y-2">
                  {availableResources
                    .filter((resource: any) => 
                      resource.specification.id === form.watch("resourceSpecificationId")
                    )
                    .map((resource: any) => (
                      <div key={resource.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium">{resource.identifier}</span>
                          {resource.condition && (
                            <span className="text-muted-foreground ml-2">
                              ({resource.condition})
                            </span>
                          )}
                        </div>
                        <div className="text-muted-foreground">
                          {resource.location}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={creatingIntent}
                >
                  Cancel
                </Button>
              )}
              <Button 
                type="submit" 
                disabled={creatingIntent}
                className="min-w-[120px]"
              >
                {creatingIntent ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating...
                  </div>
                ) : (
                  "Create Request"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}