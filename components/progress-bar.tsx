import { cn } from "@/lib/utils";

export function ProgressBar({
  percent,
  label,
  className,
  barClassName,
}: {
  percent: number;
  label: string;
  className?: string;
  barClassName?: string;
}) {
  return (
    <div
      className={cn("h-2.5 w-full overflow-hidden rounded-full bg-smoke-100", className)}
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn(
          "h-full rounded-full bg-linear-to-r from-smoke-500 to-smoke-700 transition-[width] duration-700 ease-out",
          barClassName,
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
