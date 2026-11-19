import type { Metadata } from "next";
import { Suspense } from "react";

import { AiCoachSetting } from "@/components/settings/ai-coach-setting";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { DeleteAccount } from "@/components/settings/delete-account";
import { ProfileForm } from "@/components/settings/profile-form";
import { ThemeSetting } from "@/components/settings/theme-setting";
import { TwoFactor } from "@/components/settings/two-factor";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getTotpStatus } from "@/lib/auth/mfa-actions";
import { requireUser } from "@/lib/auth/dal";
import { getCoachStatus } from "@/lib/coach/data";
import { getProfile } from "@/lib/profile/data";
import { signOutEverywhere } from "@/lib/settings/actions";
import type { ProfileInput } from "@/lib/validation/settings";

export const metadata: Metadata = { title: "Settings" };

function Section({
  id,
  title,
  description,
  children,
  danger,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <section
      aria-labelledby={id}
      className={
        danger
          ? "rounded-2xl border border-destructive/30 p-5 sm:p-6"
          : "rounded-2xl surface p-5 sm:p-6"
      }
    >
      <h2 id={id} className={danger ? "font-semibold text-destructive" : "font-semibold"}>
        {title}
      </h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

async function ProfileSection() {
  const [user, profile] = await Promise.all([requireUser(), getProfile()]);
  const zones = Intl.supportedValuesOf("timeZone");
  const timezones = zones.includes(profile.timezone) ? zones : [profile.timezone, ...zones];
  if (!timezones.includes("UTC")) timezones.unshift("UTC");
  return (
    <>
      <p className="mb-4 text-sm">
        <span className="text-muted-foreground">Email: </span>
        <span className="font-medium">{user.email}</span>
      </p>
      <ProfileForm
        timezones={timezones}
        defaultValues={{
          displayName: profile.displayName ?? "",
          timezone: profile.timezone,
          defaultCurrency: profile.defaultCurrency as ProfileInput["defaultCurrency"],
        }}
      />
    </>
  );
}

async function TwoFactorSection() {
  const { enabled } = await getTotpStatus();
  return <TwoFactor enabled={enabled} />;
}

async function AiCoachSection() {
  const { consented } = await getCoachStatus();
  return <AiCoachSetting enabled={consented} />;
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <Section id="profile-title" title="Profile">
        <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
          <ProfileSection />
        </Suspense>
      </Section>

      <Section
        id="appearance-title"
        title="Appearance"
        description="Choose how TradeLedger looks on this device."
      >
        <ThemeSetting />
      </Section>

      <Section
        id="security-title"
        title="Password"
        description="You'll stay signed in here; other devices are signed out."
      >
        <ChangePasswordForm />
      </Section>

      <Section
        id="ai-title"
        title="AI Coach"
        description="Controls whether your trading data can be analysed by AI."
      >
        <Suspense fallback={<Skeleton className="h-10 rounded-lg" />}>
          <AiCoachSection />
        </Suspense>
      </Section>

      <Section
        id="mfa-title"

        title="Two-factor authentication"

        description="Even if someone learns your password, they can't log in without your phone."
      >
        <Suspense fallback={<Skeleton className="h-10 rounded-lg" />}>
          <TwoFactorSection />
        </Suspense>
      </Section>

      <Section
        id="sessions-title"
        title="Sessions"
        description="Lost a device or used a shared computer? Sign out of TradeLedger everywhere, including here."
      >
        <form action={signOutEverywhere}>
          <Button type="submit" variant="outline" size="sm" className="h-8">
            Sign out of all devices
          </Button>
        </form>
      </Section>

      <Section
        id="danger-title"
        title="Danger zone"
        description="Permanently delete your account and every trade, account and note in it."
        danger
      >
        <DeleteAccount />
      </Section>
    </div>
  );
}
