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
import { cx } from "@/lib/cx";
import { relativeTime } from "@/lib/time";
import type { ConversationListItem } from "@/lib/types";
import {
  IconCards,
  IconChat,
  IconClose,
  IconDownload,
  IconHeart,
  IconPlus,
  IconScan,
  IconSearch,
  IconUpload,
} from "./icons";

type SortKey = "recent" | "name" | "messages";

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: "recent", label: "Recent" },
  { key: "name", label: "Name" },
  { key: "messages", label: "Most messages" },
];

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
  // filtering, and sorting render instantly (DESIGN.md §5 Sidebar).
  const listEnteredRef = useRef(false);
  useEffect(() => {
    if (!loading && conversations.length > 0) listEnteredRef.current = true;
  });

  const containerVariants = rm(reduced, listContainer(35));
  const itemVariants = rm(reduced, listItem(10));

  return (
    <div className="flex h-full w-full min-w-0 flex-col">
      <header className="glass-header flex h-16 shrink-0 items-center justify-between border-b border-line px-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-soft text-accent">
            <IconHeart size={18} />
          </span>
          <div className="leading-tight">
            <div
              className="font-display font-wonk italic text-[22px] leading-[1.15] tracking-tight text-ink"
              style={{ fontWeight: 560 }}
            >
              Cyrano
            </div>
            <div className="text-meta text-ink-muted">reply copilot</div>
          </div>
        </div>
        <MotionButton
          onClick={onNew}
          aria-label="New conversation"
          whileHover={reduced ? undefined : "hover"}
          className="grid h-9 w-9 place-items-center rounded-md border border-line-strong text-ink-secondary transition-colors duration-150 hover:border-accent/40 hover:bg-accent-soft hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          <motion.span
            className="grid place-items-center"
            variants={{ hover: { rotate: 90 } }}
            transition={SPRING_MICRO}
          >
            <IconPlus size={18} />
          </motion.span>
        </MotionButton>
      </header>

      <div className="flex gap-1 border-b border-line p-2">
        {(
          [
            ["replies", "Replies", IconChat],
            ["prompts", "Prompts", IconCards],
            ["scan", "Scan", IconScan],
          ] as const
        ).map(([key, label, Icon]) => (
          <MotionButton
            key={key}
            onClick={() => onView(key)}
            className={cx(
              "relative inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 max-md:py-2.5 text-label transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
              view === key ? "text-ink" : "text-ink-muted hover:bg-fill hover:text-ink",
            )}
          >
            {view === key && (
              <motion.span
                layoutId={`${idPrefix}-view-tab`}
                aria-hidden
                transition={inkTransition}
                className="absolute inset-0 rounded-md bg-fill-active shadow-highlight"
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              <Icon size={14} /> {label}
            </span>
          </MotionButton>
        ))}
      </div>

      {conversations.length > 0 && (
        <div className="space-y-2 border-b border-line px-2 py-2">
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
              className="w-full rounded-md border border-line bg-fill py-1.5 pl-8 pr-8 text-sm text-ink placeholder:text-ink-muted outline-none transition-colors duration-150 focus:border-line-accent focus:ring-[3px] focus:ring-accent/12"
            />
            {query && (
              <MotionButton
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="hit absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-ink-faint transition-colors duration-150 hover:text-ink"
              >
                <IconClose size={13} />
              </MotionButton>
            )}
          </div>
          <div className="flex items-center gap-1">
            {SORT_OPTIONS.map((o) => (
              <MotionButton
                key={o.key}
                onClick={() => setSort(o.key)}
                aria-pressed={sort === o.key}
                className={cx(
                  "hit-sm rounded-md px-2 py-1 max-md:py-2 text-meta max-md:text-label transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
                  sort === o.key
                    ? "bg-fill-active text-ink shadow-highlight"
                    : "text-ink-muted hover:bg-fill hover:text-ink",
                )}
              >
                {o.label}
              </MotionButton>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        <div className="kicker mx-1 mb-2 mt-1 text-meta uppercase tracking-wider text-ink-muted">
          Conversations
        </div>
        {loading ? (
          <div className="space-y-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="skeleton h-[58px] rounded-md"
                style={{ opacity: 1 - i * 0.14 }}
              />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-3 py-10 text-center text-sm text-ink-secondary">
            No conversations yet.
            <MotionButton
              onClick={onNew}
              className="mt-3 block w-full rounded-md border border-dashed border-line-strong px-3 py-2 text-ink-secondary transition-colors duration-150 hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            >
              + Start one
            </MotionButton>
          </div>
        ) : visible.length === 0 ? (
          <div className="px-3 py-10 text-center text-sm text-ink-secondary">
            No matches for “{query.trim()}”.
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
                    className={cx(
                      "relative w-full rounded-md px-3 py-2 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
                      active
                        ? "bg-fill-active ring-1 ring-line-strong shadow-highlight"
                        : "hover:bg-fill",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId={`${idPrefix}-conv-ink`}
                        aria-hidden
                        transition={inkTransition}
                        className="absolute left-0 top-[calc(50%-10px)] h-5 w-0.5 rounded-full bg-accent"
                        style={{ boxShadow: "0 0 8px rgb(251 113 133 / 0.5)" }}
                      />
                    )}
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-ink">{c.name}</span>
                      <span className="shrink-0 text-meta tabular-nums text-ink-muted">
                        {relativeTime(c.last_message_at ?? c.updated_at)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex min-w-0 items-center gap-2">
                      {c.platform && (
                        <span className="shrink-0 rounded-full bg-fill px-1.5 py-0.5 text-meta uppercase tracking-wider text-ink-muted">
                          {c.platform}
                        </span>
                      )}
                      {sort === "messages" && (
                        <span className="shrink-0 rounded-full bg-fill px-1.5 py-0.5 text-meta tabular-nums text-ink-muted">
                          {c.message_count} msg{c.message_count === 1 ? "" : "s"}
                        </span>
                      )}
                      <span className="truncate text-[13px] text-ink-muted">
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

      <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-line px-4 py-2 text-meta text-ink-muted">
        <span>
          {query.trim() && visible.length !== conversations.length ? (
            <>
              <span className="tabular-nums">{visible.length}</span> of{" "}
              <span className="tabular-nums">{conversations.length}</span>{" "}
              {conversations.length === 1 ? "person" : "people"}
            </>
          ) : (
            <>
              <span className="tabular-nums">{conversations.length}</span>{" "}
              {conversations.length === 1 ? "person" : "people"} · stored locally
            </>
          )}
        </span>
        {(onExport || onImport) && (
          <div className="flex items-center gap-0.5">
            {onExport && (
              <MotionButton
                onClick={onExport}
                aria-label="Export a backup"
                title="Export all conversations as a backup file"
                className="hit rounded p-1 text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
              >
                <IconDownload size={14} />
              </MotionButton>
            )}
            {onImport && (
              <MotionButton
                onClick={onImport}
                aria-label="Import a backup"
                title="Import conversations from a backup file"
                className="hit rounded p-1 text-ink-muted transition-colors duration-150 hover:bg-fill hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
              >
                <IconUpload size={14} />
              </MotionButton>
            )}
          </div>
        )}
      </footer>
    </div>
  );
}
