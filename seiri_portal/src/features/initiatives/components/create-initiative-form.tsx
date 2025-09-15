"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";

import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useCreateInitiative } from "../api/use-create-initiative";
import { Moscow } from "../types";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DottedSeparator } from "@/components/dotted-separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const createInitiativeFormSchema = z.object({
  name: z.string().trim().min(1, "Initiative name is required"),
  description: z.string().optional(),
});

interface CreateInitiativeFormProps {
  onCancel?: () => void;
}

export const CreateInitiativeForm = ({ onCancel }: CreateInitiativeFormProps) => {
  const workspaceId = useWorkspaceId();
  const router = useRouter();
  const { mutate, isPending } = useCreateInitiative();
  
  const form = useForm<z.infer<typeof createInitiativeFormSchema>>({
    resolver: zodResolver(createInitiativeFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const onSubmit = (values: z.infer<typeof createInitiativeFormSchema>) => {
    const finalValues = {
      ...values,
      moscow: Moscow.MUST, // Default priority
      workspaceId, // Add current workspace ID
    };

    mutate({ json: finalValues }, {
      onSuccess: ({ data }) => {
        form.reset();
        if (onCancel) onCancel();
        router.push(`/workspaces/${workspaceId}/initiatives/${data.$id}`);
      }
    });
  };

  return (
    <Card className="w-full h-full border-none shadow-none">
      <CardHeader className="flex p-7">
        <CardTitle className="text-xl font-bold">
          Create a new initiative
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
            </div>
            
            <DottedSeparator className="py-7" />
            
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
                variant="create"
              >
                Create Initiative
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};