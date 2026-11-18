import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  id,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  /** id for the <h2>, so the section can reference it with aria-labelledby */
  id: string;
  align?: "center" | "left";
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      <p className="font-mono text-xs font-medium tracking-[0.18em] text-primary uppercase">
        {eyebrow}
      </p>
      <h2 id={id} className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-base text-pretty text-muted-foreground sm:text-lg">{description}</p>
      )}
    </div>
  );
}
