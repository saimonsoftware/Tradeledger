import { describe, expect, it } from "vitest";

import {
  bucketOf,
  maxDrawdownR,
  monthly,
  R_BUCKETS,
  rDistribution,
  rolling,
  stopSizes,
} from "@/lib/analytics/stats";
import type { StatTrade } from "@/lib/insights/stats";

let n = 0;
function trade(r: number | null, opts: Partial<StatTrade> = {}): StatTrade {
  n += 1;
  const day = String((n % 28) + 1).padStart(2, "0");
  const net = r === null ? (opts.netPnl ?? 0) : r * 100;
  return {
    symbol: "NQ",
    direction: "long",
    assetClass: "future",
    strategy: "FBOs",
    tags: [],
    rating: null,
    entryTime: `2026-11-${day}T14:00:00Z`,
    exitTime: `2026-11-${day}T14:00:00Z`,
    netPnl: net,
    rMultiple: r,
    currency: "USD",
    ...opts,
  };
}

describe("maxDrawdownR", () => {
  it("is the biggest fall from a peak in cumulative R, in close order", () => {
    const ts = [
      trade(2, { exitTime: "2026-11-01T10:00:00Z" }),
      trade(-1, { exitTime: "2026-11-02T10:00:00Z" }),
      trade(-1, { exitTime: "2026-11-03T10:00:00Z" }),
      trade(3, { exitTime: "2026-11-04T10:00:00Z" }),
      trade(-1, { exitTime: "2026-11-05T10:00:00Z" }),
    ];
    // +2 → +1 → 0 (drop of 2) → +3 → +2 (drop of 1)
    expect(maxDrawdownR(ts)).toBe(2);
  });
  it("is 0 when results only rise or there are no RRs", () => {
    expect(maxDrawdownR([trade(1), trade(2)])).toBe(0);
    expect(maxDrawdownR([trade(null, { netPnl: -50 })])).toBe(0);
  });
});

describe("rDistribution", () => {
  it("puts SL losses at −1R and wins in the right bucket", () => {
    expect(R_BUCKETS[bucketOf(-1)].key).toBe("−1R");
    expect(R_BUCKETS[bucketOf(-2)].key).toBe("≤ −1.5R");
    expect(R_BUCKETS[bucketOf(-0.3)].key).toBe("−0.5–0R");
    expect(R_BUCKETS[bucketOf(0)].key).toBe("0R");
    expect(R_BUCKETS[bucketOf(0.5)].key).toBe("0–1R");
    expect(R_BUCKETS[bucketOf(1)].key).toBe("1–2R");
    expect(R_BUCKETS[bucketOf(2)].key).toBe("2–3R");
    expect(R_BUCKETS[bucketOf(3.5)].key).toBe("3–4R");
    expect(R_BUCKETS[bucketOf(7)].key).toBe("4R+");
  });
  it("counts every trade with an RR exactly once", () => {
    const d = rDistribution([trade(-1), trade(-1), trade(2), trade(3), trade(null)]);
    expect(d.reduce((s, b) => s + b.trades, 0)).toBe(4);
    expect(d.find((b) => b.key === "−1R")?.trades).toBe(2);
    expect(d.map((b) => b.sign)).toEqual([-1, -1, -1, 0, 1, 1, 1, 1, 1]);
  });
});

describe("monthly", () => {
  it("groups by close month in the user's timezone, money per currency", () => {
    const ts = [
      // 23:30 UTC on 31 Oct is already 1 Nov in Tokyo.
      trade(2, { exitTime: "2026-10-31T23:30:00Z", netPnl: 200 }),
      trade(-1, { exitTime: "2026-11-10T10:00:00Z", netPnl: -100, currency: "EUR" }),
      trade(1, { exitTime: "2026-10-05T10:00:00Z", netPnl: 100.1 }),
    ];
    const utc = monthly(ts, "UTC");
    expect(utc.map((m) => m.month)).toEqual(["2026-10", "2026-11"]);
    expect(utc[0]).toMatchObject({
      trades: 2,
      totalR: 3,
      winRate: 1,
      netByCurrency: { USD: 300.1 },
    });
    const tokyo = monthly(ts, "Asia/Tokyo");
    expect(tokyo.map((m) => [m.month, m.trades])).toEqual([
      ["2026-10", 1],
      ["2026-11", 2],
    ]);
    expect(tokyo[1].netByCurrency).toEqual({ USD: 200, EUR: -100 });
  });
});

describe("rolling", () => {
  it("averages the last N trades after each trade", () => {
    const ts = Array.from({ length: 22 }, (_, i) =>
      trade(i < 20 ? -1 : 3, { exitTime: `2026-11-01T10:${String(i).padStart(2, "0")}:00Z` }),
    );
    const pts = rolling(ts, 20);
    expect(pts).toHaveLength(3);
    expect(pts[0]).toEqual({ n: 20, winRate: 0, expectancy: -1 });
    // Last 20 = 18 losses + 2 wins of 3R: (−18 + 6) / 20 = −0.6
    expect(pts[2]).toEqual({ n: 22, winRate: 0.1, expectancy: -0.6 });
  });
  it("is empty before the window is full", () => {
    expect(rolling([trade(1)], 20)).toEqual([]);
  });
});

describe("stopSizes", () => {
  it("averages SL size on wins vs losses per symbol", () => {
    const s = stopSizes([
      trade(2, { slPips: 20 }),
      trade(-1, { slPips: 30 }),
      trade(-1, { slPips: 40 }),
      trade(1, { symbol: "EURUSD", slPips: 10 }),
      trade(1, { symbol: "EURUSD", slPips: null }),
    ]);
    expect(s).toEqual([
      { symbol: "EURUSD", avgSlWins: 10, avgSlLosses: null, wins: 1, losses: 0 },
      { symbol: "NQ", avgSlWins: 20, avgSlLosses: 35, wins: 1, losses: 2 },
    ]);
  });
});
