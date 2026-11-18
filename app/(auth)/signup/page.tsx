import type { Metadata } from "next";

import { AuthPlaceholder } from "@/components/marketing/auth-placeholder";

export const metadata: Metadata = { title: "Create your account" };

export default function SignupPage() {
  return <AuthPlaceholder title="Create your account" />;
}
