"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Star } from "lucide-react";
import { useState } from "react";
import { Controller, useForm, useWatch, type Control } from "react-hook-form";

import { FieldError, FormMessage } from "@/components/common/form-message";
import { SignedAmount } from "@/components/common/signed-amount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { calcTrade, type Direction } from "@/lib/calculations/trade";
import { formatCurrency } from "@/lib/format/currency";
import { createTrade, updateTrade } from "@/lib/trades/actions";
import { ASSET_CLASS_LABELS, ASSET_CLASSES } from "@/lib/trades/constants";
import { useFieldIds } from "@/lib/use-field-ids";
import { cn } from "@/lib/utils";
import { tradeSchema, type TradeInput, type TradeOutput } from "@/lib/validation/trades";

export type TradeFormAccount = { id: string; name: string; currency: string; is_archived: boolean };

type Props = {
  accounts: TradeFormAccount[];
  strategies: string[];
  timezone: string;
  defaultValues: TradeInput;
  tradeId?: string;
  onSaved: (id: string) => void;
  onCancel?: () => void;
};

const num = (s: string | undefined) => {
  const n = Number((s ?? "").replace(/,/g, "").trim());
  return s && Number.isFinite(n) ? n : null;
};

/** Live P&L preview, mirroring the database formulas (lib/calculations/trade.ts). */
function TradePreview({
  control,
  currency,
}: {
  control: Control<TradeInput, unknown, TradeOutput>;
  currency: string;
}) {
  const v = useWatch({ control });
  const entry = num(v.entryPrice);
  const qty = num(v.quantity);
  const calc =
    entry && qty
      ? calcTrade({
          direction: (v.direction as Direction) ?? "long",
          entryPrice: entry,
          quantity: qty,
          multiplier: num(v.multiplier) ?? 1,
          exitPrice: num(v.exitPrice),
          fees: num(v.fees) ?? 0,
          stopLoss: num(v.stopLoss),
        })
      : null;

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium tabular-nums">{value}</dd>
    </div>
  );
  const dash = <span className="text-muted-foreground">—</span>;

  const resultLabel =
    calc?.result === "win"
      ? "Win"
      : calc?.result === "loss"
        ? "Loss"
        : calc?.result === "breakeven"
          ? "Breakeven"
          : null;

  return (
    <aside
      aria-label="Live P&L preview"
      className="rounded-xl surface p-4 text-sm"
      aria-live="polite"
    >
      <div className="flex items-center justify-between">
        <p className="font-medium">Preview</p>
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-xs font-medium",
            calc?.status === "closed" ? "bg-muted text-foreground" : "bg-primary/10 text-primary",
          )}
        >
          {calc?.status === "closed" ? (resultLabel ?? "Closed") : "Open"}
        </span>
      </div>
      <dl className="mt-2 divide-y">
        {row(
          "Gross P&L",
          calc?.grossPnl != null ? (
            <SignedAmount value={calc.grossPnl} currency={currency} showIcon={false} />
          ) : (
            dash
          ),
        )}
        {row("Fees", formatCurrency(num(v.fees) ?? 0, currency))}
        {row(
          "Net P&L",
          calc?.netPnl != null ? <SignedAmount value={calc.netPnl} currency={currency} /> : dash,
        )}
        {row("Risk (to stop)", calc?.risk != null ? formatCurrency(calc.risk, currency) : dash)}
        {row(
          "R-multiple",
          calc?.rMultiple != null ? (
            <span
              className={calc.rMultiple > 0 ? "text-profit" : calc.rMultiple < 0 ? "text-loss" : ""}
            >
              {calc.rMultiple > 0 ? "+" : calc.rMultiple < 0 ? "−" : ""}
              {Math.abs(calc.rMultiple).toFixed(2)}R
            </span>
          ) : (
            dash
          ),
        )}
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">
        {calc?.status === "closed"
          ? "Saved values are calculated by the database."
          : "Add an exit price and time to close the trade."}
      </p>
    </aside>
  );
}

/** One-line preview pinned to the bottom on narrow layouts (slide-over, phones). */
function CompactPreview({
  control,
  currency,
}: {
  control: Control<TradeInput, unknown, TradeOutput>;
  currency: string;
}) {
  const v = useWatch({ control });
  const entry = num(v.entryPrice);
  const qty = num(v.quantity);
  const calc =
    entry && qty
      ? calcTrade({
          direction: (v.direction as Direction) ?? "long",
          entryPrice: entry,
          quantity: qty,
          multiplier: num(v.multiplier) ?? 1,
          exitPrice: num(v.exitPrice),
          fees: num(v.fees) ?? 0,
          stopLoss: num(v.stopLoss),
        })
      : null;
  return (
    <div className="min-w-0 flex-1 text-sm" aria-live="polite">
      <p className="text-xs text-muted-foreground">Net P&amp;L</p>
      <p className="flex items-baseline gap-2 truncate">
        {calc?.netPnl != null ? (
          <SignedAmount value={calc.netPnl} currency={currency} className="text-base" />
        ) : (
          <span className="text-muted-foreground">{calc ? "Open trade" : "—"}</span>
        )}
        {calc?.rMultiple != null && (
          <span
            className={cn(
              "text-xs tabular-nums",
              calc.rMultiple > 0 ? "text-profit" : calc.rMultiple < 0 ? "text-loss" : "",
            )}
          >
            {calc.rMultiple > 0 ? "+" : calc.rMultiple < 0 ? "\u2212" : ""}
            {Math.abs(calc.rMultiple).toFixed(2)}R
          </span>
        )}
      </p>
    </div>
  );
}

export function TradeForm({
  accounts,
  strategies,
  timezone,
  defaultValues,
  tradeId,
  onSaved,
  onCancel,
}: Props) {
  const f = useFieldIds();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TradeInput, unknown, TradeOutput>({
    resolver: zodResolver(tradeSchema),
    defaultValues,
  });

  const accountId = useWatch({ control, name: "accountId" });
  const tags = useWatch({ control, name: "tags" }) ?? "";
  const currency = accounts.find((a) => a.id === accountId)?.currency ?? "EUR";

  const onSubmit = async () => {
    setServerError(null);
    const values = getValues(); // the server re-validates the raw values
    const result = tradeId ? await updateTrade(tradeId, values) : await createTrade(values);
    if (!result.ok) {
      if (result.field && result.field in values) {
        setError(result.field as keyof TradeInput, { message: result.error });
      }
      return setServerError(result.error);
    }
    onSaved(result.id);
  };

  const field = (
    name: keyof TradeInput,
    label: React.ReactNode,
    props: React.ComponentProps<typeof Input> = {},
    hint?: string,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={f(name)}>{label}</Label>
      <Input
        id={f(name)}
        aria-invalid={!!errors[name]}
        aria-describedby={errors[name] ? f(`${name}-error`) : hint ? f(`${name}-hint`) : undefined}
        {...props}
        {...register(name)}
      />
      {hint && !errors[name] && (
        <p id={f(`${name}-hint`)} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      <FieldError id={f(`${name}-error`)} message={errors[name]?.message} />
    </div>
  );

  const optional = <span className="font-normal text-muted-foreground">(optional)</span>;
  const section = "space-y-4 rounded-xl border p-4";
  const legend = "px-1 text-xs font-medium tracking-wider text-muted-foreground uppercase";

  return (
    // @container: layout responds to the space the form actually has (page vs slide-over vs phone).
    <div className="@container">
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="grid gap-6 @3xl:grid-cols-[1fr_17rem]"
      >
        <div className="min-w-0 space-y-5">
          {serverError && <FormMessage type="error">{serverError}</FormMessage>}

          <fieldset className={section}>
            <legend className={legend}>Trade</legend>
            <div className="grid gap-4 @lg:grid-cols-2">
              <div className="space-y-2 @lg:col-span-2">
                <Label htmlFor={f("accountId")}>Account</Label>
                <Controller
                  control={control}
                  name="accountId"
                  render={({ field: fld }) => (
                    <Select value={fld.value} onValueChange={fld.onChange}>
                      <SelectTrigger
                        id={f("accountId")}
                        className="w-full"
                        aria-invalid={!!errors.accountId}
                      >
                        <SelectValue placeholder="Choose an account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name} <span className="text-muted-foreground">· {a.currency}</span>
                            {a.is_archived && (
                              <span className="text-muted-foreground"> (archived)</span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError id={f("accountId-error")} message={errors.accountId?.message} />
              </div>

              {field("symbol", "Symbol", {
                placeholder: "e.g. AAPL, EURUSD, NQ",
                autoCapitalize: "characters",
                autoComplete: "off",
                spellCheck: false,
                className: "uppercase placeholder:normal-case",
              })}

              <div className="space-y-2">
                <Label htmlFor={f("assetClass")}>Asset class</Label>
                <Controller
                  control={control}
                  name="assetClass"
                  render={({ field: fld }) => (
                    <Select value={fld.value} onValueChange={fld.onChange}>
                      <SelectTrigger id={f("assetClass")} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSET_CLASSES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {ASSET_CLASS_LABELS[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2 @lg:col-span-2">
                <span id={f("direction-label")} className="text-sm font-medium">
                  Direction
                </span>
                <Controller
                  control={control}
                  name="direction"
                  render={({ field: fld }) => (
                    <div
                      role="radiogroup"
                      aria-labelledby={f("direction-label")}
                      className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
                    >
                      {(["long", "short"] as const).map((d) => (
                        <button
                          key={d}
                          type="button"
                          role="radio"
                          aria-checked={fld.value === d}
                          onClick={() => fld.onChange(d)}
                          className={cn(
                            "h-8 rounded-md text-sm font-medium capitalize transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                            fld.value === d
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {d === "long" ? "↗ Long" : "↘ Short"}
                        </button>
                      ))}
                    </div>
                  )}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className={section}>
            <legend className={legend}>Entry</legend>
            <div className="grid gap-4 @lg:grid-cols-2">
              {field(
                "entryTime",
                "Entry date & time",
                { type: "datetime-local" },
                `Your timezone: ${timezone}`,
              )}
              {field("entryPrice", "Entry price", {
                inputMode: "decimal",
                className: "tabular-nums",
              })}
              {field(
                "quantity",
                "Quantity / size",
                { inputMode: "decimal", className: "tabular-nums" },
                "Shares, contracts, lots or units",
              )}
              {field(
                "multiplier",
                "Contract multiplier",
                { inputMode: "decimal", className: "tabular-nums" },
                "1 for stocks. Futures: point value (e.g. NQ = 20)",
              )}
            </div>
          </fieldset>

          <fieldset className={section}>
            <legend className={legend}>Exit</legend>
            <p className="-mt-1 text-xs text-muted-foreground">
              Leave empty if the trade is still open.
            </p>
            <div className="grid gap-4 @2xl:grid-cols-3">
              {field("exitTime", <>Exit date &amp; time</>, { type: "datetime-local" })}
              {field("exitPrice", "Exit price", {
                inputMode: "decimal",
                className: "tabular-nums",
              })}
              {field("fees", <>Fees / commissions {optional}</>, {
                inputMode: "decimal",
                placeholder: "0.00",
                className: "tabular-nums",
              })}
            </div>
          </fieldset>

          <fieldset className={section}>
            <legend className={legend}>Risk</legend>
            <div className="grid gap-4 @lg:grid-cols-2">
              {field(
                "stopLoss",
                <>Stop loss {optional}</>,
                { inputMode: "decimal", className: "tabular-nums" },
                "Used to calculate your R-multiple",
              )}
              {field("takeProfit", <>Take profit {optional}</>, {
                inputMode: "decimal",
                className: "tabular-nums",
              })}
            </div>
          </fieldset>

          <fieldset className={section}>
            <legend className={legend}>Review</legend>
            <div className="grid gap-4 @lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={f("strategy")}>Strategy / setup {optional}</Label>
                <Input
                  id={f("strategy")}
                  list={f("strategy-list")}
                  placeholder="e.g. ORB, VWAP reclaim"
                  autoComplete="off"
                  {...register("strategy")}
                />
                <datalist id={f("strategy-list")}>
                  {strategies.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                <FieldError id={f("strategy-error")} message={errors.strategy?.message} />
              </div>

              <div className="space-y-2">
                <span id={f("rating-label")} className="text-sm font-medium">
                  Execution rating {optional}
                </span>
                <Controller
                  control={control}
                  name="rating"
                  render={({ field: fld }) => (
                    <div
                      role="radiogroup"
                      aria-labelledby={f("rating-label")}
                      className="flex h-8 items-center gap-1"
                    >
                      {[1, 2, 3, 4, 5].map((n) => {
                        const active = Number(fld.value || 0) >= n;
                        return (
                          <button
                            key={n}
                            type="button"
                            role="radio"
                            aria-checked={fld.value === String(n)}
                            aria-label={`${n} star${n === 1 ? "" : "s"}`}
                            onClick={() => fld.onChange(fld.value === String(n) ? "" : String(n))}
                            className="rounded-md p-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                          >
                            <Star
                              className={cn(
                                "size-5",
                                active ? "fill-primary text-primary" : "text-muted-foreground",
                              )}
                            />
                          </button>
                        );
                      })}
                    </div>
                  )}
                />
              </div>

              <div className="space-y-2 @lg:col-span-2">
                <Label htmlFor={f("tags")}>Tags {optional}</Label>
                <Input
                  id={f("tags")}
                  placeholder="A+ setup, patient, news"
                  autoComplete="off"
                  aria-describedby={f("tags-hint")}
                  aria-invalid={!!errors.tags}
                  {...register("tags")}
                />
                <p id={f("tags-hint")} className="text-xs text-muted-foreground">
                  Separate tags with commas.
                </p>
                {tags.trim() && (
                  <ul aria-label="Tags preview" className="flex flex-wrap gap-1.5">
                    {[
                      ...new Set(
                        tags
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean),
                      ),
                    ].map((t) => (
                      <li key={t} className="rounded-md border bg-background px-2 py-0.5 text-xs">
                        {t}
                      </li>
                    ))}
                  </ul>
                )}
                <FieldError id={f("tags-error")} message={errors.tags?.message} />
              </div>

              <div className="space-y-2 @lg:col-span-2">
                <Label htmlFor={f("notes")}>Notes {optional}</Label>
                <Textarea
                  id={f("notes")}
                  rows={4}
                  maxLength={5000}
                  placeholder="Why did you take it? What did you do well or badly?"
                  {...register("notes")}
                />
                <FieldError id={f("notes-error")} message={errors.notes?.message} />
              </div>
            </div>
          </fieldset>
        </div>

        {/* Wide layouts: full preview panel beside the form. */}
        <div className="hidden space-y-3 @3xl:sticky @3xl:top-20 @3xl:block @3xl:self-start">
          <TradePreview control={control} currency={currency} />
          <Button type="submit" variant="contrast" className="h-10 w-full" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : tradeId ? "Save changes" : "Log trade"}
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" className="h-10 w-full" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>

        {/* Narrow layouts: compact live preview + submit, pinned to the bottom. */}
        <div className="sticky bottom-0 z-10 -mx-4 flex items-center gap-3 border-t bg-popover/95 px-4 py-3 backdrop-blur @3xl:hidden">
          <CompactPreview control={control} currency={currency} />
          {onCancel && (
            <Button type="button" variant="ghost" className="h-10" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" variant="contrast" className="h-10 px-4" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : tradeId ? "Save" : "Log trade"}
          </Button>
        </div>
      </form>
    </div>
  );
}
