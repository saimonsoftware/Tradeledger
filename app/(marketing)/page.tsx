import { Benefits } from "@/components/marketing/benefits";
import { Faq } from "@/components/marketing/faq";
import { FinalCta } from "@/components/marketing/final-cta";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Security } from "@/components/marketing/security";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <Benefits />
      <HowItWorks />
      <Security />
      <Faq />
      <FinalCta />
    </>
  );
}
