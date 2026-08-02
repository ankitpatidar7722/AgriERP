import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  /** Secondary line - a count, a comparison, a unit. */
  detail?: string;
  icon: LucideIcon;
  /** Tints the icon chip. Text always stays in ink tokens. */
  tone?: "default" | "success" | "warning" | "danger";
  href?: string;
  isLoading?: boolean;
}

const TONE_CLASS = {
  default: "bg-muted text-foreground/70",
  success: "bg-primary/12 text-primary",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/12 text-destructive",
} as const;

/**
 * A headline figure, not a chart - one number has no shape to plot.
 *
 * The value wears foreground ink; only the icon chip carries the tone. Colour
 * beside the number, never colour as the number, so a monochrome print or a
 * colour-blind reader loses nothing.
 */
export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "default",
  href,
  isLoading = false,
}: StatCardProps) {
  // Icon on its own row, then the label, then the figure - the reading order
  // a glance actually follows. Side-by-side puts the number in a narrow column
  // and caps how large it can be set.
  const body = (
    <Card
      className={cn(
        "h-full",
        href && "transition-colors hover:border-primary/50",
      )}
    >
      <CardContent className="p-5">
        <span
          className={cn(
            "mb-4 flex size-11 items-center justify-center rounded-xl",
            TONE_CLASS[tone],
          )}
          aria-hidden
        >
          <Icon className="size-[22px]" />
        </span>

        <p className="truncate text-sm font-medium text-muted-foreground">{label}</p>

        {isLoading ? (
          <Skeleton className="mt-2 h-8 w-28" />
        ) : (
          <p className="mt-1 truncate text-[26px] font-bold leading-tight tracking-tight lg:text-3xl">
            {value}
          </p>
        )}

        {detail && !isLoading && (
          <p className="mt-1.5 truncate text-xs text-muted-foreground">{detail}</p>
        )}
      </CardContent>
    </Card>
  );

  return href ? (
    <Link
      href={href}
      className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {body}
    </Link>
  ) : (
    body
  );
}
