"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FieldError, FormMessage } from "@/components/common/form-message";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createRule, updateRule } from "@/lib/playbook/actions";
import { useFieldIds } from "@/lib/use-field-ids";
import {
  RULE_CATEGORIES,
  RULE_CATEGORY_LABELS,
  ruleSchema,
  type RuleInput,
  type RuleOutput,
} from "@/lib/validation/rules";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-background px-2 text-base md:text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function RuleDialog({
  trigger,
  ruleId,
  defaultValues,
  open,
  onOpenChange,
}: {
  trigger?: ReactNode;
  ruleId?: string;
  defaultValues?: RuleInput;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}) {
  const f = useFieldIds();
  const [innerOpen, setInnerOpen] = useState(false);
  const isOpen = open ?? innerOpen;
  const setOpen = onOpenChange ?? setInnerOpen;
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RuleInput, unknown, RuleOutput>({
    resolver: zodResolver(ruleSchema),
    defaultValues: defaultValues ?? { title: "", description: "", category: "discipline" },
  });

  const onSubmit = async () => {
    setServerError(null);
    const values = getValues();
    const r = ruleId ? await updateRule(ruleId, values) : await createRule(values);
    if (!r.ok) return setServerError(r.error);
    toast.success(ruleId ? "Rule updated" : "Rule added");
    if (!ruleId) reset();
    setOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{ruleId ? "Edit rule" : "Add a rule"}</DialogTitle>
          <DialogDescription>Short, specific and checkable rules work best.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {serverError && <FormMessage type="error">{serverError}</FormMessage>}
          <div className="space-y-2">
            <Label htmlFor={f("title")}>Rule</Label>
            <Input
              id={f("title")}
              placeholder="e.g. Stop trading after 2 losses in a day"
              aria-invalid={!!errors.title}
              {...register("title")}
            />
            <FieldError id={f("title-error")} message={errors.title?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={f("category")}>Category</Label>
            <select id={f("category")} className={selectClass} {...register("category")}>
              {RULE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {RULE_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={f("description")}>
              Why / details <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id={f("description")}
              rows={3}
              maxLength={1000}
              {...register("description")}
            />
            <FieldError id={f("description-error")} message={errors.description?.message} />
          </div>
          <Button type="submit" variant="contrast" className="h-10 w-full" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : ruleId ? "Save changes" : "Add rule"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
