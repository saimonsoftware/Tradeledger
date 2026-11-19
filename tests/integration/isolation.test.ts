/**
 * TWO-USER DATA ISOLATION TEST (CLAUDE.md rule 3.1.12)
 *
 * Logs in as two real users through Supabase's public API, exactly as the app
 * (or an attacker with their own account) would, and proves that User B can't
 * read, change, delete, or attach anything to User A's data.
 *
 * Needs .env.local (Supabase URL + publishable key) and .env.test.local
 * (two test users). No service_role key is used anywhere.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const creds = {
  a: { email: process.env.ISOLATION_USER_A_EMAIL, password: process.env.ISOLATION_USER_A_PASSWORD },
  b: { email: process.env.ISOLATION_USER_B_EMAIL, password: process.env.ISOLATION_USER_B_PASSWORD },
};
const configured = Boolean(
  url && key && creds.a.email && creds.a.password && creds.b.email && creds.b.password,
);

if (!configured) {
  console.warn(
    "\n⚠️  Data isolation test SKIPPED: set up .env.local and .env.test.local (see .env.example).\n",
  );
}

type Client = SupabaseClient<Database>;

const newClient = (): Client =>
  createClient<Database>(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

async function signIn(email: string, password: string) {
  const client = newClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`Could not sign in ${email}: ${error?.message}`);
  return { client, userId: data.user.id };
}

describe.skipIf(!configured)("data isolation between users (RLS)", () => {
  let A: Client;
  let B: Client;
  let anon: Client;
  let aId: string;
  let bId: string;
  let aAccountId: string;
  let aTradeId: string;
  let aTxId: string;
  let bAccountId: string;

  beforeAll(async () => {
    ({ client: A, userId: aId } = await signIn(creds.a.email!, creds.a.password!));
    ({ client: B, userId: bId } = await signIn(creds.b.email!, creds.b.password!));
    anon = newClient();

    // Start clean (deleting accounts cascades to their trades and transactions).
    await A.from("trading_accounts").delete().eq("user_id", aId);
    await B.from("trading_accounts").delete().eq("user_id", bId);

    // --- User A creates an account, a deposit and a closed trade ---
    const acc = await A.from("trading_accounts")
      .insert({
        name: "A's Prop Account",
        account_type: "prop_challenge",
        currency: "USD",
        starting_balance: 10000,
        start_date: "2026-01-01",
      })
      .select()
      .single();
    expect(acc.error).toBeNull();
    aAccountId = acc.data!.id;

    const tx = await A.from("account_transactions")
      .insert({ account_id: aAccountId, type: "deposit", amount: 500 })
      .select()
      .single();
    expect(tx.error).toBeNull();
    aTxId = tx.data!.id;

    const trade = await A.from("trades")
      .insert({
        account_id: aAccountId,
        symbol: "NQ",
        direction: "long",
        entry_time: "2026-11-16T14:30:00Z",
        entry_price: 21480,
        exit_price: 21500,
        net_pnl: 791.6,
        stop_loss: 21470,
        notes: "A's private note",
      })
      .select()
      .single();
    expect(trade.error).toBeNull();
    aTradeId = trade.data!.id;

    // B gets an account of their own (used for the "move it to A" attack).
    const bAcc = await B.from("trading_accounts")
      .insert({
        name: "B's Account",
        account_type: "demo",
        starting_balance: 1000,
        start_date: "2026-01-01",
      })
      .select()
      .single();
    expect(bAcc.error).toBeNull();
    bAccountId = bAcc.data!.id;
  }, 30_000);

  afterAll(async () => {
    if (!A || !B) return;
    // Storage files aren't removed by the database cascade.
    const shots = A.storage.from("trade-screenshots");
    const { data: files } = await shots.list(`${aId}/${aTradeId}`);
    if (files?.length) await shots.remove(files.map((f) => `${aId}/${aTradeId}/${f.name}`));
    await A.from("ai_reports").delete().eq("user_id", aId); // also removes their chat messages
    await A.from("coach_conversations").delete().eq("user_id", aId);
    await A.from("trading_rules").delete().eq("user_id", aId);
    await A.from("trading_accounts").delete().eq("user_id", aId);
    await B.from("trading_accounts").delete().eq("user_id", bId);
    await A.auth.signOut();
    await B.auth.signOut();
  });

  // ---------------------------------------------------------------- sanity
  describe("User A (the owner)", () => {
    it("can read their own data; status and close time are derived by the database", async () => {
      const { data, error } = await A.from("trades").select("*").eq("id", aTradeId).single();
      expect(error).toBeNull();
      expect(Number(data!.net_pnl)).toBe(791.6);
      expect(data!.status).toBe("closed");
      // A closed trade counts on its entry date.
      expect(new Date(data!.exit_time!).toISOString()).toBe("2026-11-16T14:30:00.000Z");
      expect(data!.user_id).toBe(aId);
    });

    it("cannot set the derived columns or log an unsupported symbol", async () => {
      const derived = await A.from("trades").update({ status: "open" }).eq("id", aTradeId).select();
      expect(derived.error).not.toBeNull();
      const symbol = await A.from("trades").insert({
        account_id: aAccountId,
        symbol: "AAPL",
        direction: "long",
        entry_time: new Date().toISOString(),
        entry_price: 100,
      });
      expect(symbol.error).not.toBeNull();
    });

    it("sees the correct balance (10000 + 500 + 791.60)", async () => {
      const { data } = await A.from("account_balances")
        .select("current_balance")
        .eq("account_id", aAccountId)
        .single();
      expect(Number(data!.current_balance)).toBe(11291.6);
    });
  });

  // ---------------------------------------------------------------- READ
  describe("User B cannot READ User A's data", () => {
    it("trading account", async () => {
      const { data } = await B.from("trading_accounts").select("*").eq("id", aAccountId);
      expect(data).toEqual([]);
    });

    it("trade (including notes)", async () => {
      const { data } = await B.from("trades").select("*").eq("id", aTradeId);
      expect(data).toEqual([]);
    });

    it("deposit / withdrawal", async () => {
      const { data } = await B.from("account_transactions").select("*").eq("id", aTxId);
      expect(data).toEqual([]);
    });

    it("balance (view respects RLS)", async () => {
      const { data } = await B.from("account_balances").select("*").eq("account_id", aAccountId);
      expect(data).toEqual([]);
    });

    it("profile", async () => {
      const { data } = await B.from("profiles").select("*").eq("id", aId);
      expect(data).toEqual([]);
    });

    it("anything at all when listing without filters", async () => {
      const [acc, trades, txs] = await Promise.all([
        B.from("trading_accounts").select("user_id"),
        B.from("trades").select("user_id"),
        B.from("account_transactions").select("user_id"),
      ]);
      for (const rows of [acc.data, trades.data, txs.data]) {
        expect(rows?.every((r) => r.user_id === bId)).toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------- UPDATE
  describe("User B cannot UPDATE User A's data", () => {
    it("trade", async () => {
      const { data } = await B.from("trades")
        .update({ net_pnl: -9999, notes: "hacked" })
        .eq("id", aTradeId)
        .select();
      expect(data).toEqual([]);
      const { data: still } = await A.from("trades")
        .select("net_pnl, notes")
        .eq("id", aTradeId)
        .single();
      expect(Number(still!.net_pnl)).toBe(791.6);
      expect(still!.notes).toBe("A's private note");
    });

    it("trading account", async () => {
      const { data } = await B.from("trading_accounts")
        .update({ name: "pwned" })
        .eq("id", aAccountId)
        .select();
      expect(data).toEqual([]);
    });

    it("profile", async () => {
      const { data } = await B.from("profiles")
        .update({ display_name: "pwned" })
        .eq("id", aId)
        .select();
      expect(data).toEqual([]);
    });
  });

  // ---------------------------------------------------------------- DELETE
  describe("User B cannot DELETE User A's data", () => {
    it("trade, deposit, or account", async () => {
      const t = await B.from("trades").delete().eq("id", aTradeId).select();
      const x = await B.from("account_transactions").delete().eq("id", aTxId).select();
      const a = await B.from("trading_accounts").delete().eq("id", aAccountId).select();
      expect(t.data).toEqual([]);
      expect(x.data).toEqual([]);
      expect(a.data).toEqual([]);

      // Everything is still there for A.
      const { count } = await A.from("trades")
        .select("*", { count: "exact", head: true })
        .eq("id", aTradeId);
      expect(count).toBe(1);
    });
  });

  // ---------------------------------------------------------------- INSERT / tampering
  describe("User B cannot attach data to User A", () => {
    it("cannot add a trade to A's account", async () => {
      const { error } = await B.from("trades").insert({
        account_id: aAccountId,
        symbol: "NQ", // an allowed symbol, so only ownership can make this fail
        direction: "short",
        entry_time: new Date().toISOString(),
        entry_price: 5000,
      });
      expect(error).not.toBeNull();
    });

    it("cannot add a withdrawal to A's account", async () => {
      const { error } = await B.from("account_transactions").insert({
        account_id: aAccountId,
        type: "withdrawal",
        amount: 10000,
      });
      expect(error).not.toBeNull();
      const { data } = await A.from("account_balances")
        .select("current_balance")
        .eq("account_id", aAccountId)
        .single();
      expect(Number(data!.current_balance)).toBe(11291.6);
    });

    it("cannot create rows that claim to belong to A (spoofed user_id)", async () => {
      const { error } = await B.from("trading_accounts").insert({
        user_id: aId,
        name: "Planted",
        account_type: "live",
        starting_balance: 1,
        start_date: "2026-01-01",
      });
      expect(error).not.toBeNull();
    });

    it("cannot hand their own account over to A", async () => {
      const { error } = await B.from("trading_accounts")
        .update({ user_id: aId })
        .eq("id", bAccountId);
      expect(error).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------- AI Coach data
  describe("AI Coach reports and chats are private too", () => {
    let reportId: string;

    beforeAll(async () => {
      const r = await A.from("ai_reports")
        .insert({
          trade_count: 1,
          stats: { note: "A's stats" },
          report: { summary: "A's private report" },
          model: "test",
        })
        .select("id")
        .single();
      expect(r.error).toBeNull();
      reportId = r.data!.id;
      expect(
        (
          await A.from("ai_messages").insert({
            report_id: reportId,
            role: "user",
            content: "A's question",
          })
        ).error,
      ).toBeNull();
    });

    it("B cannot read A's report or chat", async () => {
      expect((await B.from("ai_reports").select("*").eq("id", reportId)).data).toEqual([]);
      expect((await B.from("ai_messages").select("*").eq("report_id", reportId)).data).toEqual([]);
    });

    it("B cannot change or delete A's report", async () => {
      expect(
        (
          await B.from("ai_reports")
            .update({ report: { summary: "pwned" } })
            .eq("id", reportId)
            .select()
        ).data,
      ).toEqual([]);
      expect((await B.from("ai_reports").delete().eq("id", reportId).select()).data).toEqual([]);
      const still = await A.from("ai_reports").select("report").eq("id", reportId).single();
      expect(still.data?.report).toEqual({ summary: "A's private report" });
    });

    it("B cannot add a message to A's report", async () => {
      const { error } = await B.from("ai_messages").insert({
        report_id: reportId,
        role: "user",
        content: "sneaky",
      });
      expect(error).not.toBeNull();
    });

    it("nobody can write to the usage log directly (limits can't be reset)", async () => {
      expect(
        (await A.from("ai_usage").insert({ user_id: aId, kind: "report" })).error,
      ).not.toBeNull();
      expect((await B.from("ai_usage").select("*").eq("user_id", aId)).data).toEqual([]);
    });
  });

  // ---------------------------------------------------------------- Playbook & Coach chat
  describe("Playbook rules and coach conversations are private", () => {
    let ruleId: string;
    let convId: string;

    beforeAll(async () => {
      const r = await A.from("trading_rules")
        .insert({ title: "A's secret rule", category: "risk" })
        .select("id")
        .single();
      expect(r.error).toBeNull();
      ruleId = r.data!.id;
      const c = await A.from("coach_conversations")
        .insert({ title: "A's chat" })
        .select("id")
        .single();
      expect(c.error).toBeNull();
      convId = c.data!.id;
      expect(
        (
          await A.from("coach_messages").insert({
            conversation_id: convId,
            role: "user",
            content: "hi",
            display_text: "hi",
          })
        ).error,
      ).toBeNull();
    });

    it("B cannot read, edit or delete A's rules", async () => {
      expect((await B.from("trading_rules").select("*").eq("id", ruleId)).data).toEqual([]);
      expect(
        (await B.from("trading_rules").update({ title: "pwned" }).eq("id", ruleId).select()).data,
      ).toEqual([]);
      expect((await B.from("trading_rules").delete().eq("id", ruleId).select()).data).toEqual([]);
    });

    it("B cannot read A's conversations or add to them", async () => {
      expect((await B.from("coach_conversations").select("*").eq("id", convId)).data).toEqual([]);
      expect(
        (await B.from("coach_messages").select("*").eq("conversation_id", convId)).data,
      ).toEqual([]);
      const { error } = await B.from("coach_messages").insert({
        conversation_id: convId,
        role: "assistant",
        content: "fake",
      });
      expect(error).not.toBeNull();
    });

    it("messages are append-only, even for their owner", async () => {
      expect(
        (
          await A.from("coach_messages")
            .update({ display_text: "edited" })
            .eq("conversation_id", convId)
            .select()
        ).error,
      ).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------- screenshots (Storage)
  describe("Trade screenshots are private", () => {
    // A 1x1 PNG.
    const png = Uint8Array.from(
      atob(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      ),
      (c) => c.charCodeAt(0),
    );
    const bucket = "trade-screenshots";
    let aPath = "";

    beforeAll(async () => {
      aPath = `${aId}/${aTradeId}/${crypto.randomUUID()}.png`;
      const { error } = await A.storage
        .from(bucket)
        .upload(aPath, png, { contentType: "image/png" });
      expect(error).toBeNull();
    });

    it("the owner can view their screenshot", async () => {
      const { data, error } = await A.storage.from(bucket).download(aPath);
      expect(error).toBeNull();
      expect(data!.size).toBe(png.length);
    });

    it("B cannot list, download or get a link to A's screenshot", async () => {
      const list = await B.storage.from(bucket).list(`${aId}/${aTradeId}`);
      expect(list.data ?? []).toEqual([]);
      expect((await B.storage.from(bucket).download(aPath)).error).not.toBeNull();
      expect((await B.storage.from(bucket).createSignedUrl(aPath, 60)).error).not.toBeNull();
    });

    it("B cannot delete A's screenshot", async () => {
      const { data } = await B.storage.from(bucket).remove([aPath]);
      expect(data ?? []).toEqual([]);
      expect((await A.storage.from(bucket).download(aPath)).error).toBeNull();
    });

    it("B cannot upload into A's folder, or attach to A's trade from their own folder", async () => {
      const intoA = await B.storage
        .from(bucket)
        .upload(`${aId}/${aTradeId}/${crypto.randomUUID()}.png`, png, { contentType: "image/png" });
      expect(intoA.error).not.toBeNull();
      const ownFolder = await B.storage
        .from(bucket)
        .upload(`${bId}/${aTradeId}/${crypto.randomUUID()}.png`, png, { contentType: "image/png" });
      expect(ownFolder.error).not.toBeNull();
    });

    it("rejects files that aren't images", async () => {
      const { error } = await A.storage
        .from(bucket)
        .upload(`${aId}/${aTradeId}/${crypto.randomUUID()}.html`, "<script>", {
          contentType: "text/html",
        });
      expect(error).not.toBeNull();
    });

    it("allows at most 6 screenshots per trade (enforced by the database)", async () => {
      const up = () =>
        A.storage.from(bucket).upload(`${aId}/${aTradeId}/${crypto.randomUUID()}.png`, png, {
          contentType: "image/png",
        });
      for (let i = 0; i < 5; i++) expect((await up()).error).toBeNull(); // 6 in total now
      expect((await up()).error).not.toBeNull();
    });

    it("a logged-out visitor cannot read it", async () => {
      expect((await anon.storage.from(bucket).download(aPath)).error).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------- logged out
  describe("A logged-out visitor", () => {
    it.each([
      "trading_accounts",
      "trades",
      "account_transactions",
      "profiles",
      "account_balances",
    ] as const)("cannot read %s", async (table) => {
      // Untyped here: the list mixes tables and a view, which the typed client keeps separate.
      const untyped = anon as unknown as SupabaseClient;
      const { data, error } = await untyped.from(table).select("*").limit(1);
      expect(data ?? []).toEqual([]);
      expect(error).not.toBeNull();
    });
  });
});
