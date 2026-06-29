"use client";

import { cx } from "@/lib/cx";

export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cx(
        "inline-block animate-spin rounded-full border-2 border-current border-t-transparent align-[-2px]",
        className,
      )}
      style={{ width: size, height: size }}
    />
  );
}
