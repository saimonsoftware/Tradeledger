import { z } from "zod";

/** A 6-digit authenticator code. Spaces are allowed ("123 456") and removed. */
export const totpCodeSchema = z
  .string()
  .transform((s) => s.replace(/\s/g, ""))
  .pipe(z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app"));
