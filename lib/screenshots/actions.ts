"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { MAX_SCREENSHOTS } from "@/lib/trades/constants";

import { sniffImageType } from "./sniff";
import { countTradeScreenshots, SCREENSHOT_BUCKET } from "./storage";

type Result = { ok: true } | { ok: false; error: string };

const GENERIC = "Couldn't save the screenshot. Please try again.";
/** Images are shrunk in the browser first; this is the hard server-side cap. */
const MAX_BYTES = 3.5 * 1024 * 1024;
const fileNameSchema = z.string().regex(/^[0-9a-f-]{36}\.(webp|png|jpg)$/);

export async function uploadTradeScreenshot(tradeId: string, formData: FormData): Promise<Result> {
  const user = await requireUser();
  if (!z.uuid().safeParse(tradeId).success) return { ok: false, error: "Trade not found." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose an image." };
  if (file.size > MAX_BYTES) return { ok: false, error: "That image is too large (max 3.5 MB)." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) return { ok: false, error: "Use a PNG, JPEG or WebP image." };

  const supabase = await createClient();
  // RLS: only finds the trade if it's this user's.
  const { data: trade } = await supabase
    .from("trades")
    .select("id")
    .eq("id", tradeId)
    .maybeSingle();
  if (!trade) return { ok: false, error: "Trade not found." };

  if ((await countTradeScreenshots(supabase, user.id, tradeId)) >= MAX_SCREENSHOTS) {
    return { ok: false, error: `A trade can have up to ${MAX_SCREENSHOTS} screenshots.` };
  }

  // The path starts with the user's id: Storage RLS rejects any other folder.
  const path = `${user.id}/${tradeId}/${crypto.randomUUID()}.${type.ext}`;
  const { error } = await supabase.storage
    .from(SCREENSHOT_BUCKET)
    .upload(path, bytes, { contentType: type.mime, upsert: false, cacheControl: "3600" });
  if (error) return { ok: false, error: GENERIC };

  refresh();
  return { ok: true };
}

export async function deleteTradeScreenshot(tradeId: string, name: string): Promise<Result> {
  const user = await requireUser();
  if (!z.uuid().safeParse(tradeId).success || !fileNameSchema.safeParse(name).success) {
    return { ok: false, error: "Screenshot not found." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(SCREENSHOT_BUCKET)
    .remove([`${user.id}/${tradeId}/${name}`]);
  if (error) return { ok: false, error: "Couldn't delete the screenshot. Please try again." };
  if (!data?.length) return { ok: false, error: "Screenshot not found." };

  refresh();
  return { ok: true };
}
