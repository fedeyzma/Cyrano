export function relativeTime(ts: number | null | undefined): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const s = Math.round(diff / 1000);
  if (s < 45) return "now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.round(d / 7);
  if (w < 5) return `${w}w`;
  return new Date(ts).toLocaleDateString();
}

/**
 * Built once. `toLocaleTimeString` re-resolves the locale and option bag on
 * every call, which the thread used to pay per message per render.
 */
const TIME_FMT = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

export function clockTime(ts: number): string {
  return TIME_FMT.format(ts);
}
