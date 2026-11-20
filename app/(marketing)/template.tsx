import { PageTransition } from "@/components/layout/page-transition";

// Recreated on every navigation in this section, so each page switch animates.
export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
