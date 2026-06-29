"use client";

import { useEffect, useState } from "react";
import { cx } from "@/lib/cx";
import type { ConversationDetail } from "@/lib/types";
import { IconBrain, IconClose, IconPin, IconPlus, IconTrash } from "./icons";

export function FactsPanel({
  detail,
  onAddFact,
  onDeleteFact,
  onTogglePin,
  onUpdateConversation,
  onClose,
}: {
  detail: ConversationDetail;
  onAddFact: (content: string) => void;
  onDeleteFact: (factId: number) => void;
  onTogglePin: (factId: number, pinned: boolean) => void;
  onUpdateConversation: (patch: { platform?: string | null; notes?: string | null }) => void;
  onClose?: () => void;
}) {
  const { conversation, facts } = detail;
  const [newFact, setNewFact] = useState("");
  const [notes, setNotes] = useState(conversation.notes ?? "");
  const [platform, setPlatform] = useState(conversation.platform ?? "");

  // Reset edit fields when the selected person changes.
  useEffect(() => {
    setNotes(conversation.notes ?? "");
    setPlatform(conversation.platform ?? "");
    setNewFact("");
  }, [conversation.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function addFact() {
    const t = newFact.trim();
    if (!t) return;
    onAddFact(t);
    setNewFact("");
  }

  function saveNotes() {
    if ((notes.trim() || null) !== (conversation.notes ?? null)) {
      onUpdateConversation({ notes: notes.trim() || null });
    }
  }

  function savePlatform() {
    if ((platform.trim() || null) !== (conversation.platform ?? null)) {
      onUpdateConversation({ platform: platform.trim() || null });
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/5 px-4">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
          <IconBrain size={18} className="text-accent" />
          Memory
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close memory panel"
            className="rounded-lg p-1 text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200"
          >
            <IconClose size={18} />
          </button>
        )}
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        {/* About */}
        <section>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            About {conversation.name}
          </h3>
          <label className="block text-[11px] text-zinc-500">Where you matched</label>
          <input
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            onBlur={savePlatform}
            placeholder="Hinge, Tinder, IRL…"
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
          />
          <label className="mt-3 block text-[11px] text-zinc-500">Your notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
            rows={3}
            placeholder="context only you know…"
            className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
          />
        </section>

        {/* Facts */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Remembered facts
            </h3>
            <span className="text-[11px] text-zinc-600">{facts.length}</span>
          </div>

          <div className="flex gap-1.5">
            <input
              value={newFact}
              onChange={(e) => setNewFact(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addFact();
                }
              }}
              placeholder="add a detail to remember…"
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
            />
            <button
              onClick={addFact}
              aria-label="Add fact"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 text-zinc-300 transition hover:border-accent/40 hover:text-accent"
            >
              <IconPlus size={16} />
            </button>
          </div>

          {facts.length === 0 ? (
            <p className="mt-3 text-xs leading-relaxed text-zinc-600">
              Nothing yet. Cyrano remembers details automatically as you generate replies — or
              jot one down here.
            </p>
          ) : (
            <ul className="mt-3 space-y-1">
              {facts.map((f) => (
                <li
                  key={f.id}
                  className={cx(
                    "group flex items-start gap-2 rounded-lg px-2 py-1.5 transition hover:bg-white/[0.04]",
                    f.pinned === 1 && "bg-accent-soft",
                  )}
                >
                  <button
                    onClick={() => onTogglePin(f.id, !f.pinned)}
                    aria-label={f.pinned ? "Unpin fact" : "Pin fact"}
                    title={f.pinned ? "Unpin" : "Pin to keep on top"}
                    className={cx(
                      "mt-0.5 shrink-0 transition",
                      f.pinned ? "text-accent" : "text-zinc-600 hover:text-zinc-300",
                    )}
                  >
                    <IconPin size={14} />
                  </button>
                  <span className="flex-1 text-sm leading-snug text-zinc-200">{f.content}</span>
                  <button
                    onClick={() => onDeleteFact(f.id)}
                    aria-label="Delete fact"
                    className="mt-0.5 shrink-0 text-zinc-700 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                  >
                    <IconTrash size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
