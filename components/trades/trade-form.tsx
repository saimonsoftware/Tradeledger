"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch, type Control } from "react-hook-form";
import { toast } from "sonner";

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
import { createTrade, updateTrade } from "@/lib/trades/actions";
import { checkLevel, PIP_LABEL, pipsBetween, plannedRr, suggestedRr } from "@/lib/calculations/rr";
import { formatR } from "@/lib/format/number";
import type { Screenshot } from "@/lib/screenshots/storage";
import { SYMBOLS } from "@/lib/trades/constants";
import { useFieldIds } from "@/lib/use-field-ids";
import { cn } from "@/lib/utils";
import { tradeSchema, type TradeInput, type TradeOutput } from "@/lib/validation/trades";

import {
  PendingScreenshots,
  TradeScreenshots,
  uploadScreenshot,
  type PendingScreenshot,
} from "./trade-screenshots";

export type TradeFormAccount = { id: string; name: string; currency: string; is_archived: boolean };

type Props = {
  accounts: TradeFormAccount[];
  strategies: string[];
  timezone: string;
  defaultValues: TradeInput;
  tradeId?: string;
  /** Existing screenshots (edit mode). */
  screenshots?: Screenshot[];
  onSaved: (id: string) => void;
  onCancel?: () => void;
};

/** The P&L as typed (amount + Profit/Loss), or null while the trade is open. */
function usePnl(control: Control<TradeInput, unknown, TradeOutput>) {
  const [amount, side] = useWatch({ control, name: ["pnlAmount", "pnlSide"] });
  const n = Number((amount ?? "").replace(/,/g, "").trim());
  if (!amount?.trim() || !Number.isFinite(n)) return null;
  return side === "loss" ? -Math.abs(n) : Math.abs(n);
}

/** SL/TP distances, planned RR and the suggested Trade RR (same maths as the server). */
function useLevels(control: Control<TradeInput, unknown, TradeOutput>) {
  const [symbol, direction, entry, stopLoss, takeProfit, pnlSide, pnlAmount] = useWatch({
    control,
    name: ["symbol", "direction", "entryPrice", "stopLoss", "takeProfit", "pnlSide", "pnlAmount"],
  });
  return levelsFor({ symbol, direction, entry, stopLoss, takeProfit, pnlSide, pnlAmount });
}

function levelsFor(v: {
  symbol: string;
  direction: "long" | "short";
  entry: string;
  stopLoss?: string;
  takeProfit?: string;
  pnlSide: "profit" | "loss";
  pnlAmount?: string;
}) {
  const level = (kind: "sl" | "tp", price?: string) => {
    const check = checkLevel(kind, v.direction, v.entry, price ?? null);
    return {
      check,
      pips: check === "ok" ? pipsBetween(v.symbol, v.entry, price ?? null) : null,
    };
  };
  return {
    sl: level("sl", v.stopLoss),
    tp: level("tp", v.takeProfit),
    planned: plannedRr(v.direction, v.entry, v.stopLoss ?? null, v.takeProfit ?? null),
    suggested: suggestedRr({
      direction: v.direction,
      entryPrice: v.entry,
      stopLoss: v.stopLoss ?? null,
      takeProfit: v.takeProfit ?? null,
      pnlSide: v.pnlSide,
      pnlAmount: v.pnlAmount ?? null,
    }),
  };
}

/** The Trade RR as it will be saved: signed like the P&L. */
function useRr(control: Control<TradeInput, unknown, TradeOutput>, pnl: number | null) {
  const rr = useWatch({ control, name: "rr" });
  const n = Number((rr ?? "").replace(/r$/i, "").trim());
  if (pnl === null || !rr?.trim() || !Number.isFinite(n)) return null;
  return pnl < 0 ? -Math.abs(n) : Math.abs(n);
}

const resultLabel = (pnl: number | null) =>
  pnl === null ? "Open" : pnl > 0 ? "Win" : pnl < 0 ? "Loss" : "Breakeven";

/** Summary beside the form on wide layouts. */
function TradeSummary({
  control,
  currency,
}: {
  control: Control<TradeInput, unknown, TradeOutput>;
  currency: string;
}) {
  const pnl = usePnl(control);
  const rr = useRr(control, pnl);
  return (
    <aside aria-label="Trade summary" className="rounded-xl surface p-4 text-sm" aria-live="polite">
      <div className="flex items-center justify-between">
        <p className="font-medium">Summary</p>
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-xs font-medium",
            pnl === null ? "bg-primary/10 text-primary" : "bg-muted text-foreground",
          )}
        >
          {resultLabel(pnl)}
        </span>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Profit / loss</p>
      <p className="mt-0.5 text-2xl font-semibold">
        {pnl === null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <SignedAmount value={pnl} currency={currency} />
        )}
      </p>
      {rr !== null && (
        <p
          className={cn(
            "mt-1 text-sm font-medium tabular-nums",
            rr > 0 ? "text-profit" : rr < 0 ? "text-loss" : "text-muted-foreground",
          )}
        >
          {formatR(rr)}
        </p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        {pnl === null
          ? "Leave the P&L empty while the trade is still open."
          : "Counts towards your P&L on the entry date."}
      </p>
    </aside>
  );
}

/** One-line summary pinned to the bottom on narrow layouts (slide-over, phones). */
function CompactSummary({
  control,
  currency,
}: {
  control: Control<TradeInput, unknown, TradeOutput>;
  currency: string;
}) {
  const pnl = usePnl(control);
  const rr = useRr(control, pnl);
  return (
    <div className="min-w-0 flex-1 text-sm" aria-live="polite">
      <p className="text-xs text-muted-foreground">Profit / loss</p>
      <p className="truncate">
        {pnl === null ? (
          <span className="text-muted-foreground">Open trade</span>
        ) : (
          <SignedAmount value={pnl} currency={currency} className="text-base" />
        )}
        {rr !== null && (
          <span
            className={cn(
              "ml-2 text-xs tabular-nums",
              rr > 0 ? "text-profit" : rr < 0 ? "text-loss" : "",
            )}
          >
            {formatR(rr)}
          </span>
        )}
      </p>
    </div>
  );
}

/** Two-option toggle (radio group), used for Direction and Profit/Loss. */
function Toggle<T extends string>({
  value,
  onChange,
  options,
  labelledBy,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; activeClass?: string }[];
  labelledBy: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-8 rounded-md text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            value === o.value
              ? cn("bg-background text-foreground shadow-sm", o.activeClass)
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function TradeForm({
  accounts,
  strategies,
  timezone,
  defaultValues,
  tradeId,
  screenshots,
  onSaved,
  onCancel,
}: Props) {
  const f = useFieldIds();
  const [serverError, setServerError] = useState<string | null>(null);
  // New trades: screenshots wait in the browser until the trade is saved.
  const [pending, setPending] = useState<PendingScreenshot[]>([]);
  const {
    register,
    handleSubmit,
    control,
    getValues,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TradeInput, unknown, TradeOutput>({
    resolver: zodResolver(tradeSchema),
    defaultValues,
  });

  const accountId = useWatch({ control, name: "accountId" });
  const symbol = useWatch({ control, name: "symbol" });
  const direction = useWatch({ control, name: "direction" });
  const unit = symbol === "NQ" ? PIP_LABEL.NQ : PIP_LABEL.EURUSD;
  const levels = useLevels(control);

  // Trade RR fills itself in from SL/TP and Profit/Loss, until the trader types
  // their own value (e.g. they closed early). Clearing the box goes back to automatic.
  const [rrManual, setRrManual] = useState(() => {
    if (!defaultValues.rr) return false;
    const start = levelsFor({ ...defaultValues, entry: defaultValues.entryPrice }).suggested;
    return start === null || Number(start) !== Number(defaultValues.rr);
  });
  useEffect(() => {
    if (!rrManual) setValue("rr", levels.suggested ?? "");
  }, [rrManual, levels.suggested, setValue]);
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
    if (!tradeId && pending.length) {
      for (const p of pending) {
        const error = await uploadScreenshot(result.id, p.blob);
        if (error) {
          toast.error(`Trade saved, but a screenshot failed: ${error}`);
          break;
        }
      }
      pending.forEach((p) => URL.revokeObjectURL(p.url));
      setPending([]);
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

              <div className="space-y-2 @lg:col-span-2">
                <span id={f("symbol-label")} className="text-sm font-medium">
                  Symbol
                </span>
                <Controller
                  control={control}
                  name="symbol"
                  render={({ field: fld }) => (
                    <Toggle
                      value={fld.value}
                      onChange={fld.onChange}
                      labelledBy={f("symbol-label")}
                      options={SYMBOLS.map((s) => ({
                        value: s,
                        label: <span className="font-mono">{s}</span>,
                      }))}
                    />
                  )}
                />
                <FieldError id={f("symbol-error")} message={errors.symbol?.message} />
              </div>

              <div className="space-y-2 @lg:col-span-2">
                <span id={f("direction-label")} className="text-sm font-medium">
                  Direction
                </span>
                <Controller
                  control={control}
                  name="direction"
                  render={({ field: fld }) => (
                    <Toggle
                      value={fld.value}
                      onChange={fld.onChange}
                      labelledBy={f("direction-label")}
                      options={[
                        { value: "long", label: "↗ Long" },
                        { value: "short", label: "↘ Short" },
                      ]}
                    />
                  )}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className={section}>
            <legend className={legend}>Entry</legend>
            <div className="grid gap-4 @lg:grid-cols-2">
              <div className="@lg:col-span-2">
                {field(
                  "entryTime",
                  "Entry date & time",
                  { type: "datetime-local" },
                  `Your timezone: ${timezone}`,
                )}
              </div>
              <div className="@lg:col-span-2">
                {field("entryPrice", "Entry price", {
                  inputMode: "decimal",
                  className: "tabular-nums",
                })}
              </div>
              {field(
                "stopLoss",
                <>SL price {optional}</>,
                { inputMode: "decimal", className: "tabular-nums" },
                levels.sl.pips
                  ? `SL: ${levels.sl.pips} ${unit}`
                  : `${direction === "short" ? "Above" : "Below"} the entry price`,
              )}
              {field(
                "takeProfit",
                <>TP price {optional}</>,
                { inputMode: "decimal", className: "tabular-nums" },
                levels.tp.pips
                  ? `TP: ${levels.tp.pips} ${unit}${levels.planned ? ` · planned 1 : ${levels.planned}` : ""}`
                  : `${direction === "short" ? "Below" : "Above"} the entry price`,
              )}
              <div className="space-y-2 @lg:col-span-2">
                <span id={f("pnl-label")} className="text-sm font-medium">
                  Profit or loss
                </span>
                <div className="grid gap-2 @lg:grid-cols-2">
                  <Controller
                    control={control}
                    name="pnlSide"
                    render={({ field: fld }) => (
                      <Toggle
                        value={fld.value}
                        onChange={fld.onChange}
                        labelledBy={f("pnl-label")}
                        options={[
                          { value: "profit", label: "+ Profit", activeClass: "text-profit" },
                          { value: "loss", label: "− Loss", activeClass: "text-loss" },
                        ]}
                      />
                    )}
                  />
                  <div className="relative">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground"
                    >
                      {currency}
                    </span>
                    <label htmlFor={f("pnlAmount")} className="sr-only">
                      Amount ({currency})
                    </label>
                    <Input
                      id={f("pnlAmount")}
                      aria-invalid={!!errors.pnlAmount}
                      aria-describedby={
                        errors.pnlAmount ? f("pnlAmount-error") : f("pnlAmount-hint")
                      }
                      inputMode="decimal"
                      placeholder="0.00"
                      className="pl-12 tabular-nums"
                      {...register("pnlAmount")}
                    />
                  </div>
                </div>
                {!errors.pnlAmount && (
                  <p id={f("pnlAmount-hint")} className="text-xs text-muted-foreground">
                    The amount you made or lost, after fees. Leave empty if the trade is still open.
                  </p>
                )}
                <FieldError id={f("pnlAmount-error")} message={errors.pnlAmount?.message} />
                <FieldError id={f("pnlSide-error")} message={errors.pnlSide?.message} />
              </div>
              <div className="space-y-2 @lg:col-span-2">
                <Label htmlFor={f("rr")}>Trade RR {optional}</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-40">
                    <Input
                      id={f("rr")}
                      aria-invalid={!!errors.rr}
                      aria-describedby={errors.rr ? f("rr-error") : f("rr-hint")}
                      inputMode="decimal"
                      placeholder="e.g. 2.5"
                      className="pr-8 tabular-nums"
                      {...register("rr", {
                        onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                          setRrManual(e.target.value.trim() !== ""),
                      })}
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
                    >
                      R
                    </span>
                  </div>
                  {rrManual &&
                    levels.suggested !== null &&
                    Number(levels.suggested) !== Number(getValues("rr")) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => setRrManual(false)}
                      >
                        Use calculated ({levels.suggested}R)
                      </Button>
                    )}
                </div>
                {!errors.rr && (
                  <p id={f("rr-hint")} className="text-xs text-muted-foreground">
                    {!rrManual && levels.suggested !== null
                      ? "Calculated: a profit hit your TP, a loss hit your SL (−1R). Type over it if you closed early."
                      : "Fills in from your SL and TP prices, or type it in. A loss is counted as −R automatically."}
                  </p>
                )}
                <FieldError id={f("rr-error")} message={errors.rr?.message} />
              </div>
            </div>
          </fieldset>

          <fieldset className={section}>
            <legend className={legend}>Screenshots</legend>
            {tradeId ? (
              <TradeScreenshots tradeId={tradeId} screenshots={screenshots ?? []} />
            ) : (
              <PendingScreenshots value={pending} onChange={setPending} />
            )}
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

        {/* Wide layouts: summary panel beside the form. */}
        <div className="hidden space-y-3 @3xl:sticky @3xl:top-20 @3xl:block @3xl:self-start">
          <TradeSummary control={control} currency={currency} />
          <Button type="submit" variant="contrast" className="h-10 w-full" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : tradeId ? "Save changes" : "Log trade"}
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" className="h-10 w-full" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>

        {/* Narrow layouts: compact summary + submit, pinned to the bottom. */}
        <div className="sticky bottom-0 z-10 -mx-4 flex items-center gap-3 border-t bg-popover/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur @3xl:hidden">
          <CompactSummary control={control} currency={currency} />
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
