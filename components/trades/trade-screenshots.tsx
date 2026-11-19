"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { deleteTradeScreenshot, uploadTradeScreenshot } from "@/lib/screenshots/actions";
import { prepareScreenshot, ScreenshotError } from "@/lib/screenshots/prepare";
import type { Screenshot } from "@/lib/screenshots/storage";
import { MAX_SCREENSHOTS } from "@/lib/trades/constants";
import { cn } from "@/lib/utils";

type Thumb = { key: string; url: string };

/** Shrinks and uploads one image to a saved trade. Returns an error message, or null. */
export async function uploadScreenshot(tradeId: string, file: File | Blob): Promise<string | null> {
  try {
    const blob = file instanceof File ? await prepareScreenshot(file) : file;
    const form = new FormData();
    form.append("file", new File([blob], "screenshot", { type: blob.type }));
    const result = await uploadTradeScreenshot(tradeId, form);
    return result.ok ? null : result.error;
  } catch (e) {
    return e instanceof ScreenshotError ? e.message : "Couldn't upload the screenshot.";
  }
}

/** Images pasted with Cmd/Ctrl+V anywhere on the page (except into a text field). */
function usePastedImages(onFiles: (files: File[]) => void, enabled: boolean) {
  const handler = useRef(onFiles);
  useEffect(() => {
    handler.current = onFiles;
  });
  useEffect(() => {
    if (!enabled) return;
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith("image/"));
      if (!files.length) return;
      e.preventDefault();
      handler.current(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [enabled]);
}

function Grid({
  thumbs,
  onOpen,
  onRemove,
  busy,
  canAdd,
  onPick,
}: {
  thumbs: Thumb[];
  onOpen?: (t: Thumb) => void;
  onRemove?: (t: Thumb) => void;
  busy: boolean;
  canAdd: boolean;
  onPick: (files: File[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <ul className="grid grid-cols-2 gap-2 @lg:grid-cols-3" aria-label="Screenshots">
        {thumbs.map((t, i) => (
          <li
            key={t.key}
            className="group relative aspect-video overflow-hidden rounded-lg border bg-muted"
          >
            <button
              type="button"
              onClick={() => onOpen?.(t)}
              disabled={!onOpen}
              className="block size-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              aria-label={`View screenshot ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- private signed / local blob URLs, not optimisable */}
              <img src={t.url} alt="" className="size-full object-cover" />
            </button>
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(t)}
                className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-black/70 text-white outline-none hover:bg-black focus-visible:ring-3 focus-visible:ring-ring/50"
                aria-label={`Remove screenshot ${i + 1}`}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
        {canAdd && (
          <li className="aspect-video">
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={busy}
              className={cn(
                "flex size-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-sm text-muted-foreground transition-colors outline-none hover:border-foreground/40 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                busy && "cursor-wait",
              )}
            >
              {busy ? (
                <Loader2 className="size-5 animate-spin" aria-hidden="true" />
              ) : (
                <ImagePlus className="size-5" aria-hidden="true" />
              )}
              {busy ? "Uploading…" : "Add screenshot"}
            </button>
          </li>
        )}
      </ul>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/heic,image/*"
        multiple
        hidden
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          if (files.length) onPick(files);
        }}
      />
      <p className="text-xs text-muted-foreground">
        Up to {MAX_SCREENSHOTS} images. You can also paste one with{" "}
        <kbd className="font-sans">Ctrl/⌘ V</kbd>. Only you can see them.
      </p>
    </div>
  );
}

function Viewer({ url, onClose }: { url: string | null; onClose: () => void }) {
  return (
    <Dialog open={url !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[calc(100%-1rem)] p-2 sm:max-w-6xl">
        <DialogTitle className="sr-only">Screenshot</DialogTitle>
        {url && (
          <a href={url} target="_blank" rel="noreferrer" title="Open full size in a new tab">
            {/* eslint-disable-next-line @next/next/no-img-element -- private signed URL */}
            <img
              src={url}
              alt="Trade screenshot"
              className="max-h-[85svh] w-full rounded-md object-contain"
            />
          </a>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Screenshots of a saved trade: changes are saved straight away. */
export function TradeScreenshots({
  tradeId,
  screenshots,
}: {
  tradeId: string;
  screenshots: Screenshot[];
}) {
  const [busy, startUpload] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [viewing, setViewing] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const add = (files: File[]) =>
    startUpload(async () => {
      const room = MAX_SCREENSHOTS - screenshots.length;
      if (files.length > room)
        toast.error(`A trade can have up to ${MAX_SCREENSHOTS} screenshots.`);
      for (const file of files.slice(0, Math.max(0, room))) {
        const error = await uploadScreenshot(tradeId, file);
        if (error) {
          toast.error(error);
          return;
        }
      }
      toast.success("Screenshot added");
    });

  usePastedImages(add, !busy);

  return (
    <>
      <Grid
        thumbs={screenshots.map((s) => ({ key: s.name, url: s.url }))}
        onOpen={(t) => setViewing(t.url)}
        onRemove={(t) => setConfirm(t.key)}
        busy={busy}
        canAdd={screenshots.length < MAX_SCREENSHOTS}
        onPick={add}
      />
      <Viewer url={viewing} onClose={() => setViewing(null)} />
      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this screenshot?</AlertDialogTitle>
            <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                const name = confirm!;
                startDelete(async () => {
                  const result = await deleteTradeScreenshot(tradeId, name);
                  if (!result.ok) toast.error(result.error);
                  else toast.success("Screenshot deleted");
                  setConfirm(null);
                });
              }}
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export type PendingScreenshot = { key: string; blob: Blob; url: string };

/** Screenshots for a trade that isn't saved yet: kept in the browser, uploaded after saving. */
export function PendingScreenshots({
  value,
  onChange,
}: {
  value: PendingScreenshot[];
  onChange: (next: PendingScreenshot[]) => void;
}) {
  const [busy, startPrepare] = useTransition();
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  });
  // Free the preview images' memory when the form goes away.
  useEffect(() => () => latest.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  const add = (files: File[]) =>
    startPrepare(async () => {
      const next = [...latest.current];
      for (const file of files) {
        if (next.length >= MAX_SCREENSHOTS) {
          toast.error(`A trade can have up to ${MAX_SCREENSHOTS} screenshots.`);
          break;
        }
        try {
          const blob = await prepareScreenshot(file);
          next.push({ key: crypto.randomUUID(), blob, url: URL.createObjectURL(blob) });
        } catch (e) {
          toast.error(e instanceof ScreenshotError ? e.message : "Couldn't add that image.");
        }
      }
      onChange(next);
    });

  usePastedImages(add, !busy);

  return (
    <Grid
      thumbs={value}
      onRemove={(t) => {
        URL.revokeObjectURL(t.url);
        onChange(value.filter((p) => p.key !== t.key));
      }}
      busy={busy}
      canAdd={value.length < MAX_SCREENSHOTS}
      onPick={add}
    />
  );
}
