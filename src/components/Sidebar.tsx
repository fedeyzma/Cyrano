"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  MotionButton,
  SPRING_MICRO,
  listContainer,
  listItem,
  rm,
  useAppReducedMotion,
} from "@/components/motion";
import { IconButton, SealDisc, Tag, focusRing } from "@/components/ui";
import { cx } from "@/lib/cx";
import { relativeTime } from "@/lib/time";
import type { ConversationListItem } from "@/lib/types";
import { IconClose, IconDownload, IconPlus, IconSearch, IconUpload } from "./icons";

type SortKey = "recent" | "name" | "messages";

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: "recent", label: "Recent" },
  { key: "name", label: "Name" },
  { key: "messages", label: "Most messages" },
];

const VIEW_TABS: Array<{ key: "replies" | "prompts" | "scan"; label: string }> = [
  { key: "replies", label: "Replies" },
  { key: "prompts", label: "Prompts" },
  { key: "scan", label: "Scan" },
];

/** Sidebar — "Table of Contents" (DESIGN.md §8). Masthead plate with the
 *  seal monogram + WONK wordmark; text-only folio tabs with a sliding gilt
 *  underline; TOC rows with dot leaders and the Ribbon Mark on the active
 *  entry; marginalia footer. */
export function Sidebar({
  conversations,
  selectedId,
  loading,
  view,
  onView,
  onSelect,
  onNew,
  onExport,
  onImport,
  idPrefix = "inline",
}: {
  conversations: ConversationListItem[];
  selectedId: number | null;
  loading: boolean;
  view: "replies" | "prompts" | "scan";
  onView: (view: "replies" | "prompts" | "scan") => void;
  onSelect: (id: number) => void;
  onNew: () => void;
  onExport?: () => void;
  onImport?: () => void;
  /** Namespaces the shared layoutIds — page.tsx mounts two Sidebars at once
   *  (inline aside + mobile drawer) and layoutId is app-global in motion. */
  idPrefix?: string;
}) {
  const reduced = useAppReducedMotion();
  const inkTransition = reduced ? { duration: 0 } : SPRING_MICRO;

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");

  // Filter (name / platform / last message) then sort. "Recent" keeps the
  // server order (updated_at DESC), so only name/messages re-sort a copy.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = conversations;
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.platform ?? "").toLowerCase().includes(q) ||
          (c.last_message ?? "").toLowerCase().includes(q),
      );
    }
    if (sort === "name") return [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "messages") return [...list].sort((a, b) => b.message_count - a.message_count);
    return list;
  }, [conversations, query, sort]);

  // Stagger the conversation list on its first appearance only — refetches,
  // filtering, and sorting render instantly.
  const listEnteredRef = useRef(false);
  useEffect(() => {
    if (!loading && conversations.length > 0) listEnteredRef.current = true;
  });

  const containerVariants = rm(reduced, listContainer(35));
  const itemVariants = rm(reduced, listItem(10));

  return (
    <div className="flex h-full w-full min-w-0 flex-col">
      {/* ── Masthead ─────────────────────────────────────── */}
      <header className="plate flex h-16 shrink-0 items-center justify-between gap-3 border-b border-line pl-4 pr-3">
        <div className="flex min-w-0 items-center gap-3">
          <SealDisc initial="C" size={24} />
          <div className="min-w-0 leading-none">
            <div
              className="font-display font-wonk truncate text-[22px] italic leading-[1.1] tracking-[-0.01em] text-ink"
              style={{ fontWeight: 480 }}
            >
              Cyrano
            </div>
            <div className="mt-0.5 truncate text-folio uppercase text-ink-muted">
              Éditions · Reply Copilot
            </div>
          </div>
        </div>
        <MotionButton
          onClick={onNew}
          aria-label="New conversation"
          data-tip="New conversation"
          whileHover={reduced ? undefined : "hover"}
          className={cx(
            "hit grid h-9 w-9 shrink-0 place-items-center rounded-sm border border-line-strong text-ink-secondary transition-colors duration-150 hover:border-line-gilt hover:bg-fill hover:text-accent active:bg-fill-active",
            focusRing,
          )}
        >
          <motion.span
            aria-hidden
            className="grid place-items-center"
            variants={{ hover: { rotate: 90 } }}
            transition={SPRING_MICRO}
          >
            <IconPlus size={18} />
          </motion.span>
        </MotionButton>
      </header>

      {/* ── View tabs — folio caps, sliding gilt underline ── */}
      <div className="flex shrink-0 items-stretch border-b border-line px-2">
        {VIEW_TABS.map(({ key, label }) => (
          <MotionButton
            key={key}
            onClick={() => onView(key)}
            aria-pressed={view === key}
            className={cx(
              "hit-sm relative flex-1 px-2 py-2.5 text-center text-folio uppercase transition-colors duration-150",
              view === key ? "text-accent" : "text-ink-muted hover:text-ink-secondary",
              focusRing,
            )}
          >
            {label}
            {view === key && (
              <motion.span
                layoutId={`${idPrefix}-view-tab`}
                aria-hidden
                transition={inkTransition}
                className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-accent"
              />
            )}
          </MotionButton>
        ))}
      </div>

      {/* ── Search + sort ────────────────────────────────── */}
      {conversations.length > 0 && (
        <div className="shrink-0 space-y-2 border-b border-line px-3 py-3">
          <div className="relative">
            <IconSearch
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people…"
              aria-label="Search people"
              className="w-full rounded-sm border border-line-strong bg-surface py-2 pl-8 pr-8 text-body text-ink placeholder:text-ink-muted outline-none transition-colors duration-150 focus:border-line-gilt focus:ring-[3px] focus:ring-accent/12"
            />
            {query && (
              <MotionButton
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className={cx(
                  "hit absolute right-1.5 top-1/2 -translate-y-1/2 rounded-xs p-1 text-ink-muted transition-colors duration-150 hover:text-ink",
                  focusRing,
                )}
              >
                <IconClose size={13} />
              </MotionButton>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {SORT_OPTIONS.map((o) => (
              <MotionButton
                key={o.key}
                onClick={() => setSort(o.key)}
                aria-pressed={sort === o.key}
                className={cx(
                  "hit-sm inline-flex select-none items-center rounded-xs border px-2 py-1 max-md:py-2 text-folio uppercase transition-colors duration-150",
                  sort === o.key
                    ? "border-line-gilt bg-accent-soft text-accent"
                    : "border-line-strong text-ink-muted hover:bg-fill hover:text-ink-secondary",
                  focusRing,
                )}
              >
                {o.label}
              </MotionButton>
            ))}
          </div>
        </div>
      )}

      {/* ── The index ────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="kicker mx-1.5 mb-2 mt-1.5 text-folio uppercase text-ink-muted">
          Conversations
        </div>
        {loading ? (
          <div className="space-y-1.5" aria-hidden>
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="skeleton h-16 rounded-md"
                style={{ opacity: 1 - i * 0.14 }}
              />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-3 py-12 text-center">
            <p className="font-display text-[15px] italic leading-snug text-ink-secondary">
              The table of contents is empty.
            </p>
            <p className="mt-1.5 text-label text-ink-muted">
              No conversations yet — every good correspondence starts with a name.
            </p>
            <MotionButton
              onClick={onNew}
              className={cx(
                "mt-5 inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-sm border border-dashed border-line-strong px-3 py-2 text-label text-ink-secondary transition-colors duration-150 hover:border-line-gilt hover:bg-fill hover:text-accent active:bg-fill-active",
                focusRing,
              )}
            >
              + Start one
            </MotionButton>
          </div>
        ) : visible.length === 0 ? (
          <div className="px-3 py-12 text-center">
            <p className="font-display text-[15px] italic leading-snug text-ink-secondary">
              Nothing under “{query.trim()}”.
            </p>
            <p className="mt-1.5 text-label text-ink-muted">
              Try another name, platform, or phrase.
            </p>
          </div>
        ) : (
          <motion.ul
            className="space-y-0.5"
            variants={containerVariants}
            initial={listEnteredRef.current ? false : "initial"}
            animate="enter"
          >
            {visible.map((c, i) => {
              const active = c.id === selectedId;
              return (
                <motion.li key={c.id} variants={itemVariants} custom={i}>
                  <MotionButton
                    onClick={() => onSelect(c.id)}
                    aria-current={active ? "true" : undefined}
                    className={cx(
                      "@container relative w-full rounded-md px-3 py-2.5 text-left transition-colors duration-150",
                      active
                        ? "bg-fill-active shadow-[var(--shadow-plate)]"
                        : "hover:bg-fill",
                      focusRing,
                    )}
                  >
                    {/* Ribbon Mark — the champagne rule beside the open entry */}
                    {active && (
                      <motion.span
                        layoutId={`${idPrefix}-conv-ink`}
                        aria-hidden
                        transition={inkTransition}
                        className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent"
                        style={{ boxShadow: "0 0 8px rgb(228 197 137 / 0.5)" }}
                      />
                    )}
                    {/* TOC line: name … dot leader … time */}
                    <div className="flex min-w-0 items-baseline justify-between gap-1">
                      <span className="truncate text-body font-semibold text-ink">{c.name}</span>
                      <span className="dot-leader hidden @min-[220px]:block" aria-hidden />
                      <span className="font-display shrink-0 whitespace-nowrap text-marginalia italic text-ink-muted [font-variant-numeric:oldstyle-nums]">
                        {relativeTime(c.last_message_at ?? c.updated_at)}
                      </span>
                    </div>
                    <div className="mt-1 flex min-w-0 items-center gap-2">
                      {c.platform && <Tag className="shrink-0">{c.platform}</Tag>}
                      {sort === "messages" && (
                        <Tag className="shrink-0 tabular-nums">
                          {c.message_count} msg{c.message_count === 1 ? "" : "s"}
                        </Tag>
                      )}
                      <span className={cx("truncate text-body", c.last_message ? "text-ink-muted" : "font-display italic text-ink-faint")}>
                        {c.last_message ?? "No messages yet"}
                      </span>
                    </div>
                  </MotionButton>
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </div>

      {/* ── Colophon ─────────────────────────────────────── */}
      <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-line pt-2 pl-4 pr-2 [padding-bottom:max(0.5rem,env(safe-area-inset-bottom))]">
        <span className="font-display min-w-0 truncate text-marginalia italic text-ink-muted [font-variant-numeric:oldstyle-nums]">
          {query.trim() && visible.length !== conversations.length ? (
            <>
              {visible.length} of {conversations.length}{" "}
              {conversations.length === 1 ? "person" : "people"}
            </>
          ) : (
            <>
              {conversations.length} {conversations.length === 1 ? "person" : "people"} · stored
              locally
            </>
          )}
        </span>
        {(onExport || onImport) && (
          <div className="flex shrink-0 items-center gap-1">
            {onExport && (
              <IconButton label="Export a backup" onClick={onExport}>
                <IconDownload size={14} />
              </IconButton>
            )}
            {onImport && (
              <IconButton label="Import a backup" onClick={onImport}>
                <IconUpload size={14} />
              </IconButton>
            )}
          </div>
        )}
      </footer>
    </div>
  );
}
