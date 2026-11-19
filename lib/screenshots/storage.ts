import "server-only";

import type { createClient } from "@/lib/supabase/server";

// Trade screenshots live in a PRIVATE Supabase Storage bucket:
//   trade-screenshots/<user id>/<trade id>/<random id>.<webp|png|jpg>
// Storage RLS only lets a user read/add/delete inside their own folder, so every
// call here runs with the user's session (never a service key).

type Client = Awaited<ReturnType<typeof createClient>>;

export const SCREENSHOT_BUCKET = "trade-screenshots";
/** Signed links expire after this long; pages create fresh ones on every visit. */
const SIGNED_URL_SECONDS = 60 * 60;

export type Screenshot = { name: string; url: string };

const folder = (userId: string, tradeId: string) => `${userId}/${tradeId}`;

/** A trade's screenshots, oldest first, with short-lived links for viewing. */
export async function listTradeScreenshots(
  supabase: Client,
  userId: string,
  tradeId: string,
): Promise<Screenshot[]> {
  const bucket = supabase.storage.from(SCREENSHOT_BUCKET);
  const { data: files } = await bucket.list(folder(userId, tradeId), {
    limit: 100,
    sortBy: { column: "created_at", order: "asc" },
  });
  const names = (files ?? []).filter((f) => f.id !== null).map((f) => f.name);
  if (!names.length) return [];

  const { data: signed } = await bucket.createSignedUrls(
    names.map((n) => `${folder(userId, tradeId)}/${n}`),
    SIGNED_URL_SECONDS,
  );
  return names.flatMap((name, i) => {
    const url = signed?.[i]?.signedUrl;
    return url ? [{ name, url }] : [];
  });
}

export async function countTradeScreenshots(supabase: Client, userId: string, tradeId: string) {
  const { data } = await supabase.storage
    .from(SCREENSHOT_BUCKET)
    .list(folder(userId, tradeId), { limit: 100 });
  return (data ?? []).filter((f) => f.id !== null).length;
}

/** Deletes all of a trade's screenshots (used when the trade is deleted). */
export async function removeTradeScreenshots(supabase: Client, userId: string, tradeId: string) {
  const bucket = supabase.storage.from(SCREENSHOT_BUCKET);
  const { data } = await bucket.list(folder(userId, tradeId), { limit: 100 });
  const paths = (data ?? [])
    .filter((f) => f.id !== null)
    .map((f) => `${folder(userId, tradeId)}/${f.name}`);
  if (paths.length) await bucket.remove(paths);
}

/** Deletes every screenshot the user has (used before deleting their account). */
export async function removeAllScreenshots(supabase: Client, userId: string) {
  const { data: tradeFolders } = await supabase.storage
    .from(SCREENSHOT_BUCKET)
    .list(userId, { limit: 1000 });
  for (const f of tradeFolders ?? []) {
    // Folders have no id; each one is a trade.
    if (f.id === null) await removeTradeScreenshots(supabase, userId, f.name);
  }
}
