"use client";

import { Check, ChevronDown, Plus, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MAX_CONFLUENCE_CHARS, MAX_TAGS } from "@/lib/trades/constants";
import { useFieldIds } from "@/lib/use-field-ids";
import { cn } from "@/lib/utils";

/** The form keeps confluences as one comma-separated string (validated on the server). */
const split = (v: string) => [
  ...new Set(
    v
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
  ),
];
const join = (list: string[]) => list.join(", ");
// Commas separate confluences, so a name can't contain one.
const clean = (s: string) =>
  s.replace(/,/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_CONFLUENCE_CHARS);
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * Dropdown of confluences with search, ticks, and "Add" for custom ones.
 * Chosen confluences show as removable chips under the button.
 */
export function ConfluencePicker({
  id,
  value,
  onChange,
  options,
  invalid,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  /** Starter confluences + ones the trader has used before. */
  options: string[];
  invalid?: boolean;
  describedBy?: string;
}) {
  const f = useFieldIds();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [added, setAdded] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = split(value);
  const all = useMemo(() => {
    const out: string[] = [];
    for (const o of [...options, ...added, ...split(value)]) {
      if (!out.some((x) => same(x, o))) out.push(o);
    }
    return out;
  }, [options, added, value]);

  const q = clean(query);
  const shown = q ? all.filter((o) => o.toLowerCase().includes(q.toLowerCase())) : all;
  const exact = all.find((o) => same(o, q));
  const full = selected.length >= MAX_TAGS;

  const isOn = (o: string) => selected.some((s) => same(s, o));
  const toggle = (o: string) => {
    if (isOn(o)) onChange(join(selected.filter((s) => !same(s, o))));
    else if (!full) onChange(join([...selected, o]));
  };
  const addCustom = () => {
    if (!q) return;
    if (exact) {
      if (!isOn(exact)) toggle(exact);
    } else if (!full) {
      setAdded((a) => [...a, q]);
      onChange(join([...selected, q]));
    }
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-2">
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setQuery("");
        }}
      >
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            aria-describedby={describedBy}
            data-invalid={invalid || undefined}
            className="flex h-10 w-full items-center gap-2 rounded-lg border border-input bg-transparent px-3 text-left text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-invalid:border-destructive md:h-9 md:text-sm dark:bg-input/30"
          >
            <span
              className={cn("min-w-0 flex-1 truncate", !selected.length && "text-muted-foreground")}
            >
              {selected.length
                ? `${selected.length} confluence${selected.length === 1 ? "" : "s"} selected`
                : "Choose confluences"}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          // Keep clear of the top bar and the form's sticky bottom bar on phones
          // (it opens upwards when there isn't room below).
          collisionPadding={{ top: 64, bottom: 96 }}
          className="flex max-h-(--radix-popover-content-available-height) w-(--radix-popover-trigger-width) min-w-64 flex-col p-0"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <div className="shrink-0 border-b p-2">
            <label htmlFor={f("search")} className="sr-only">
              Search or add a confluence
            </label>
            <input
              ref={inputRef}
              id={f("search")}
              value={query}
              maxLength={MAX_CONFLUENCE_CHARS + 5}
              autoComplete="off"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault(); // never submit the trade form from here
                  addCustom();
                }
              }}
              placeholder="Search or add your own…"
              className="h-9 w-full rounded-md bg-transparent px-2 text-base outline-none placeholder:text-muted-foreground md:text-sm"
            />
          </div>
          <div
            role="group"
            aria-label="Confluences"
            tabIndex={-1}
            className="max-h-64 min-h-0 flex-1 overflow-y-auto p-1"
          >
            {q && !exact && (
              <button
                type="button"
                onClick={addCustom}
                disabled={full}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium outline-none hover:bg-muted focus-visible:bg-muted disabled:opacity-50"
              >
                <Plus className="size-4 text-muted-foreground" aria-hidden="true" />
                Add &ldquo;{q}&rdquo;
              </button>
            )}
            {shown.map((o) => {
              const on = isOn(o);
              return (
                <button
                  key={o}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(o)}
                  disabled={!on && full}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted disabled:opacity-50"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded border",
                      on && "border-foreground bg-foreground text-background",
                    )}
                  >
                    {on && <Check className="size-3" />}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{o}</span>
                </button>
              );
            })}
            {!shown.length && !q && (
              <p className="px-2 py-3 text-sm text-muted-foreground">Type to add a confluence.</p>
            )}
          </div>
          <p className="shrink-0 border-t px-3 py-2 text-[11px] text-muted-foreground tabular-nums">
            {selected.length} of {MAX_TAGS} · Custom ones are remembered once you save the trade
          </p>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <ul aria-label="Selected confluences" className="flex flex-wrap gap-1.5">
          {selected.map((t) => (
            <li
              key={t}
              className="inline-flex items-center gap-1 rounded-full border bg-background py-0.5 pr-1 pl-2.5 text-xs font-medium"
            >
              {t}
              <button
                type="button"
                onClick={() => toggle(t)}
                aria-label={`Remove ${t}`}
                className="rounded-full p-0.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
