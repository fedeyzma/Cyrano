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
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/5 px-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-soft text-accent">
            <IconHeart size={18} />
          </span>
          <div className="leading-tight">
            <div className="font-semibold tracking-tight">Cyrano</div>
            <div className="text-[11px] text-zinc-500">reply copilot</div>
          </div>
        </div>
        <button
          onClick={onNew}
          aria-label="New conversation"
          className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-zinc-300 transition hover:border-accent/40 hover:bg-accent-soft hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          <IconPlus size={18} />
        </button>
      </header>

      <div className="flex gap-1 border-b border-white/5 p-2">
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
              "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition",
              view === key
                ? "bg-white/10 text-zinc-100"
                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
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
              <div key={i} className="h-[58px] animate-pulse rounded-xl bg-white/[0.03]" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-3 py-10 text-center text-sm text-zinc-500">
            No conversations yet.
            <button
              onClick={onNew}
              className="mt-3 block w-full rounded-lg border border-dashed border-white/15 px-3 py-2 text-zinc-300 transition hover:border-accent/40 hover:text-accent"
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
                      "w-full rounded-xl px-3 py-2.5 text-left transition",
                      active
                        ? "bg-white/[0.08] ring-1 ring-white/10"
                        : "hover:bg-white/[0.04]",
                    )}
                  >
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <span className="truncate font-medium text-zinc-100">{c.name}</span>
                      <span className="shrink-0 text-[10px] text-zinc-500">
                        {relativeTime(c.last_message_at ?? c.updated_at)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex min-w-0 items-center gap-2">
                      {c.platform && (
                        <span className="shrink-0 rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
                          {c.platform}
                        </span>
                      )}
                      <span className="truncate text-xs text-zinc-500">
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

      <footer className="shrink-0 border-t border-white/5 px-4 py-2 text-[10px] text-zinc-600">
        {conversations.length} {conversations.length === 1 ? "person" : "people"} · stored locally
      </footer>
    </div>
  );
}
