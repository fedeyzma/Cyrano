"use client";

import { cx } from "@/lib/cx";
import { relativeTime } from "@/lib/time";
import type { ConversationListItem } from "@/lib/types";
import { IconCards, IconChat, IconHeart, IconPlus } from "./icons";

export function Sidebar({
  conversations,
  selectedId,
  loading,
  view,
  onView,
  onSelect,
  onNew,
}: {
  conversations: ConversationListItem[];
  selectedId: number | null;
  loading: boolean;
  view: "replies" | "prompts";
  onView: (view: "replies" | "prompts") => void;
  onSelect: (id: number) => void;
  onNew: () => void;
}) {
  return (
    <div className="flex h-full w-full min-w-0 flex-col">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-soft text-accent">
            <IconHeart size={18} />
          </span>
          <div className="leading-tight">
            <div className="text-title tracking-tight">Cyrano</div>
            <div className="text-meta text-ink-muted">reply copilot</div>
          </div>
        </div>
        <button
          onClick={onNew}
          aria-label="New conversation"
          className="grid h-9 w-9 place-items-center rounded-md border border-line-strong text-ink-secondary transition-colors duration-150 hover:border-accent/40 hover:bg-accent-soft hover:text-accent motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          <IconPlus size={18} />
        </button>
      </header>

      <div className="flex gap-1 border-b border-line p-2">
        {(
          [
            ["replies", "Replies", IconChat],
            ["prompts", "Prompts", IconCards],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => onView(key)}
            className={cx(
              "inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-label transition-colors duration-150",
              view === key
                ? "bg-fill-active text-ink shadow-highlight"
                : "text-ink-muted hover:bg-fill hover:text-ink",
            )}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="space-y-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-[58px] rounded-md" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-3 py-10 text-center text-sm text-ink-secondary">
            No conversations yet.
            <button
              onClick={onNew}
              className="mt-3 block w-full rounded-md border border-dashed border-line-strong px-3 py-2 text-ink-secondary transition-colors duration-150 hover:border-accent/40 hover:text-accent"
            >
              + Start one
            </button>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {conversations.map((c) => {
              const active = c.id === selectedId;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => onSelect(c.id)}
                    className={cx(
                      "relative w-full rounded-md px-3 py-2.5 text-left transition-colors duration-150",
                      active
                        ? "bg-fill-active ring-1 ring-line-strong shadow-highlight before:absolute before:left-0 before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-accent"
                        : "hover:bg-fill",
                    )}
                  >
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-ink">{c.name}</span>
                      <span className="shrink-0 text-meta tabular-nums text-ink-faint">
                        {relativeTime(c.last_message_at ?? c.updated_at)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex min-w-0 items-center gap-2">
                      {c.platform && (
                        <span className="shrink-0 rounded-full bg-fill px-1.5 py-0.5 text-meta uppercase tracking-wider text-ink-muted">
                          {c.platform}
                        </span>
                      )}
                      <span className="truncate text-[13px] text-ink-muted">
                        {c.last_message ?? "No messages yet"}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <footer className="shrink-0 border-t border-line px-4 py-2 text-meta text-ink-faint">
        <span className="tabular-nums">{conversations.length}</span>{" "}
        {conversations.length === 1 ? "person" : "people"} · stored locally
      </footer>
    </div>
  );
}
