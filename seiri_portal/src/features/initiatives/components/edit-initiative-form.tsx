"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useUpdateInitiative } from "../api/use-update-initiative";
import { useGetInitiativeRACI } from "../api/use-get-initiative-raci";
import { Initiative, Moscow, TaskStatus } from "../types";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DottedSeparator } from "@/components/dotted-separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const editInitiativeFormSchema = z.object({
  name: z.string().trim().min(1, "Initiative name is required"),
  description: z.string().optional(),
  moscow: z.nativeEnum(Moscow),
  status: z.nativeEnum(TaskStatus),
  assigneeId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

interface EditInitiativeFormProps {
  onCancel?: () => void;
  initiative: Initiative;
}

export const EditInitiativeForm = ({ onCancel, initiative }: EditInitiativeFormProps) => {
  const { mutate, isPending } = useUpdateInitiative();
  const { data: raciData, isLoading: raciLoading } = useGetInitiativeRACI({ initiativeId: initiative.$id });
  
  const form = useForm<z.infer<typeof editInitiativeFormSchema>>({
    resolver: zodResolver(editInitiativeFormSchema),
    defaultValues: {
      name: initiative.name || "",
      description: initiative.description || "",
      moscow: initiative.moscow,
      status: initiative.status as any,
      assigneeId: initiative.assigneeId || "",
      startDate: initiative.startDate || "",
      endDate: initiative.endDate || "",
    },
  });

  const onSubmit = (values: z.infer<typeof editInitiativeFormSchema>) => {
    // Filter out unchanged values
    const changes: Partial<typeof values> = {};
    
    if (values.name !== initiative.name) changes.name = values.name;
    if (values.description !== initiative.description) changes.description = values.description;
    if (values.moscow !== initiative.moscow) changes.moscow = values.moscow;
    if (values.status !== initiative.status) changes.status = values.status;
    if (values.assigneeId !== initiative.assigneeId) changes.assigneeId = values.assigneeId;
    if (values.startDate !== initiative.startDate) changes.startDate = values.startDate;
    if (values.endDate !== initiative.endDate) changes.endDate = values.endDate;

    if (Object.keys(changes).length === 0) {
      if (onCancel) onCancel();
      return;
    }

    mutate({ 
      param: { initiativeId: initiative.$id },
      json: changes 
    }, {
      onSuccess: () => {
        form.reset();
        if (onCancel) onCancel();
      }
    });
  };

  // Use real RACI data from the hook, with fallback
  const displayRaciData = raciData || {
    responsible: [],
    accountable: "",
    consulted: [],
    informed: [],
    confidence: 0,
    method: "Loading...",
    suiteNames: {}
  };

  // Helper function to get suite names for display
  const getSuiteName = (suiteId: string) => {
    return displayRaciData.suiteNames?.[suiteId] || `Suite ${suiteId.slice(0, 8)}...`;
  };

  return (
    <Card className="w-full h-full border-none shadow-none">
      <CardHeader className="flex p-7">
        <CardTitle className="text-xl font-bold">
          Edit Initiative
        </CardTitle>
      </CardHeader>
      <div className="px-7">
        <DottedSeparator />
      </div>
      <CardContent className="p-7">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initiative Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter initiative name"
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
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Enter initiative description"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="moscow"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={Moscow.MUST}>Must Have</SelectItem>
                          <SelectItem value={Moscow.SHOULD}>Should Have</SelectItem>
                          <SelectItem value={Moscow.COULD}>Could Have</SelectItem>
                          <SelectItem value={Moscow.WONT}>Won't Have</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={TaskStatus.BACKLOG}>Backlog</SelectItem>
                          <SelectItem value={TaskStatus.TODO}>To Do</SelectItem>
                          <SelectItem value={TaskStatus.IN_PROGRESS}>In Progress</SelectItem>
                          <SelectItem value={TaskStatus.IN_REVIEW}>In Review</SelectItem>
                          <SelectItem value={TaskStatus.DONE}>Done</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <DottedSeparator className="py-7" />
            
            {/* RACI Assignment Display */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">RACI Matrix</h3>
              {raciLoading ? (
                <div className="text-sm text-muted-foreground">Loading RACI assignments...</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Responsible</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {displayRaciData.responsible.length > 0 ? (
                            displayRaciData.responsible.map((suiteId, index) => (
                              <Badge key={index} variant="default" className="bg-blue-100 text-blue-800">
                                {getSuiteName(suiteId)}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">None assigned</span>
                          )}
                        </div>
                      </div>
                      <div className="mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Accountable</span>
                        <div className="mt-1">
                          {displayRaciData.accountable ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              {getSuiteName(displayRaciData.accountable)}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">None assigned</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Consulted</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {displayRaciData.consulted.length > 0 ? (
                            displayRaciData.consulted.map((suiteId, index) => (
                              <Badge key={index} variant="default" className="bg-yellow-100 text-yellow-800">
                                {getSuiteName(suiteId)}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">None assigned</span>
                          )}
                        </div>
                      </div>
                      <div className="mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Informed</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {displayRaciData.informed.length > 0 ? (
                            displayRaciData.informed.map((suiteId, index) => (
                              <Badge key={index} variant="default" className="bg-gray-100 text-gray-800">
                                {getSuiteName(suiteId)}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">None assigned</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {displayRaciData.confidence}% confidence
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {displayRaciData.method} generated
                    </Badge>
                  </div>
                </>
              )}
            </div>
            
            <DottedSeparator className="py-4" />
            
            <div className="flex items-center justify-between">
              <Button
                type="button"
                size="lg"
                variant="secondary"
                onClick={onCancel}
                disabled={isPending}
                className={cn(!onCancel && "invisible")}
              >
                Cancel
              </Button>
              <Button
                disabled={isPending}
                type="submit"
                size="lg"
                variant="primary"
              >
                Update Initiative
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};