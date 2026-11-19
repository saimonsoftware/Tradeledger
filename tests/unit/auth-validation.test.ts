import { describe, expect, it } from "vitest";

import { passwordStrength } from "@/lib/auth/password-strength";
import { logInSchema, resetPasswordSchema, signUpSchema } from "@/lib/validation/auth";

const good = "correct horse battery staple";

describe("signUpSchema", () => {
  it("accepts a valid sign-up and normalises the email", () => {
    const r = signUpSchema.safeParse({
      email: "  Trader@Example.COM ",
      password: good,
      confirmPassword: good,
      timezone: "Europe/Dublin",
    });
    expect(r.success).toBe(true);
    expect(r.success && r.data.email).toBe("trader@example.com");
  });

  it("enforces the 12-character minimum", () => {
    const r = signUpSchema.safeParse({
      email: "a@b.co",
      password: "short-pass1",
      confirmPassword: "short-pass1",
    });
    expect(r.success).toBe(false);
  });

  it("rejects passwords over 72 bytes", () => {
    const long = "x".repeat(73);
    const r = signUpSchema.safeParse({ email: "a@b.co", password: long, confirmPassword: long });
    expect(r.success).toBe(false);
  });

  it("requires matching confirmation", () => {
    const r = signUpSchema.safeParse({
      email: "a@b.co",
      password: good,
      confirmPassword: good + "!",
    });
    expect(r.success).toBe(false);
    expect(!r.success && r.error.issues[0].path).toEqual(["confirmPassword"]);
  });

  it("drops an invalid timezone instead of failing sign-up", () => {
    const r = signUpSchema.safeParse({
      email: "a@b.co",
      password: good,
      confirmPassword: good,
      timezone: "Mars/Olympus",
    });
    expect(r.success && r.data.timezone).toBeUndefined();
  });
});

describe("logInSchema / resetPasswordSchema", () => {
  it("login does not apply the length policy (just non-empty)", () => {
    expect(logInSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
    expect(logInSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });

  it("reset applies the full policy", () => {
    expect(
      resetPasswordSchema.safeParse({ password: "short", confirmPassword: "short" }).success,
    ).toBe(false);
    expect(resetPasswordSchema.safeParse({ password: good, confirmPassword: good }).success).toBe(
      true,
    );
  });
});

describe("passwordStrength", () => {
  it("flags short and common passwords", () => {
    expect(passwordStrength("abc").score).toBe(0);
    expect(passwordStrength("mypassword123456").score).toBe(1);
    expect(passwordStrength("aaaaaaaaaaaaaa").score).toBe(1);
  });

  it("rewards length and variety", () => {
    expect(passwordStrength("Blue-Kettle-Rain-42!").score).toBe(4);
    expect(passwordStrength("correcthorsebattery").score).toBeGreaterThanOrEqual(2);
  });
});
