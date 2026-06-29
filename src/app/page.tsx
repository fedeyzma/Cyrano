"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ConversationView } from "@/components/ConversationView";
import { FactsPanel } from "@/components/FactsPanel";
import { IconHeart, IconMenu, IconSparkles } from "@/components/icons";
import { ImportThreadModal } from "@/components/ImportThreadModal";
import { NewConversationModal } from "@/components/NewConversationModal";
import { PromptsLab } from "@/components/PromptsLab";
import { Sidebar } from "@/components/Sidebar";
import { ApiError, api } from "@/lib/api";
import { cx } from "@/lib/cx";
import type { ParsedMessage } from "@/lib/parseThread";
import type {
  ConversationDetail,
  ConversationListItem,
  QueuedReply,
  ReplyOption,
  Role,
} from "@/lib/types";

type Toast = { id: number; message: string; kind: "info" | "error" };

export default function Home() {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [suggestions, setSuggestions] = useState<ReplyOption[] | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [mobileNav, setMobileNav] = useState(false);
  const [factsOpen, setFactsOpen] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const [view, setView] = useState<"replies" | "prompts">("replies");

  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, kind: "info" | "error" = "info") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message, kind });
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const handleError = useCallback(
    (e: unknown) => {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Something went wrong";
      showToast(msg, "error");
    },
    [showToast],
  );

  const refreshList = useCallback(async () => {
    try {
      const list = await api.listConversations();
      setConversations(list);
      return list;
    } catch (e) {
      handleError(e);
      return [];
    }
  }, [handleError]);

  const loadDetail = useCallback(
    async (id: number, opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoadingDetail(true);
      try {
        const d = await api.getConversation(id);
        setDetail(d);
      } catch (e) {
        handleError(e);
      } finally {
        if (!opts?.silent) setLoadingDetail(false);
      }
    },
    [handleError],
  );

  // Initial load.
  useEffect(() => {
    (async () => {
      setLoadingList(true);
      const list = await refreshList();
      setLoadingList(false);
      if (list.length > 0) setSelectedId((cur) => cur ?? list[0].id);
    })();
  }, [refreshList]);

  // Load detail whenever the selection changes; reset transient state.
  useEffect(() => {
    setSuggestions(null);
    setSuggestError(null);
    setFactsOpen(false);
    setImportOpen(false);
    if (selectedId === null) {
      setDetail(null);
      return;
    }
    setDetail(null);
    loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  function selectConversation(id: number) {
    setSelectedId(id);
    setView("replies");
    setMobileNav(false);
  }

  async function handleCreate(data: { name: string; platform?: string; notes?: string }) {
    setCreating(true);
    setCreateError(null);
    try {
      const conv = await api.createConversation(data);
      await refreshList();
      setModalOpen(false);
      setSelectedId(conv.id);
    } catch (e) {
      setCreateError(e instanceof ApiError ? e.message : "Could not create conversation");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteConversation() {
    if (selectedId === null || !detail) return;
    if (!window.confirm(`Delete your conversation with ${detail.conversation.name}? This can't be undone.`))
      return;
    const id = selectedId;
    try {
      await api.deleteConversation(id);
      const list = await refreshList();
      setSelectedId(list.length > 0 ? list[0].id : null);
      showToast("Conversation deleted");
    } catch (e) {
      handleError(e);
    }
  }

  async function handleSuggest(incoming: string, steer: string, targetIds: number[]) {
    if (selectedId === null) return;
    const id = selectedId;
    setSuggesting(true);
    setSuggestError(null);
    setSuggestions(null);
    try {
      const res = await api.suggest(id, {
        incoming: incoming || undefined,
        steer: steer || undefined,
        targetMessageIds: targetIds.length ? targetIds : undefined,
      });
      setSuggestions(res.options);
      await loadDetail(id, { silent: true });
      await refreshList();
      if (res.extractedFacts.length > 0) {
        showToast(
          `Remembered ${res.extractedFacts.length} new ${
            res.extractedFacts.length === 1 ? "detail" : "details"
          }`,
        );
      }
    } catch (e) {
      setSuggestError(
        e instanceof ApiError ? e.message : "Could not reach the LLM endpoint.",
      );
      // The incoming message may have been saved server-side; refresh to show it.
      await loadDetail(id, { silent: true });
      await refreshList();
    } finally {
      setSuggesting(false);
    }
  }

  async function handleAddMessage(role: Role, content: string) {
    if (selectedId === null) return;
    const id = selectedId;
    try {
      await api.addMessage(id, role, content);
      await loadDetail(id, { silent: true });
      await refreshList();
    } catch (e) {
      handleError(e);
    }
  }

  async function handleImport(messages: ParsedMessage[]) {
    if (selectedId === null) return;
    const id = selectedId;
    setImporting(true);
    setImportError(null);
    try {
      const created = await api.addMessagesBulk(id, messages);
      setImportOpen(false);
      await loadDetail(id, { silent: true });
      await refreshList();
      showToast(`Imported ${created.length} ${created.length === 1 ? "message" : "messages"}`);
    } catch (e) {
      setImportError(e instanceof ApiError ? e.message : "Could not import the thread");
    } finally {
      setImporting(false);
    }
  }

  async function handleUseOption(texts: string[]) {
    if (selectedId === null) return;
    const id = selectedId;
    try {
      await api.addMessagesBulk(
        id,
        texts.map((t) => ({ role: "me" as Role, content: t })),
      );
      setSuggestions(null);
      setSuggestError(null);
      await loadDetail(id, { silent: true });
      await refreshList();
      showToast(texts.length > 1 ? `Sent ${texts.length} messages` : "Sent & logged");
    } catch (e) {
      handleError(e);
    }
  }

  async function handleRegenerateOne(index: number, steer: string, targetIds: number[]) {
    if (selectedId === null || !suggestions) return;
    const id = selectedId;
    const avoid = suggestions.flatMap((o) => o.texts);
    try {
      const res = await api.suggest(id, {
        count: 1,
        avoid,
        steer: steer || undefined,
        targetMessageIds: targetIds.length ? targetIds : undefined,
        extractFacts: false,
      });
      const replacement = res.options[0];
      if (replacement) {
        setSuggestions((prev) =>
          prev ? prev.map((o, i) => (i === index ? replacement : o)) : prev,
        );
      }
    } catch (e) {
      handleError(e);
    }
  }

  async function handleEditMessage(messageId: number, content: string) {
    if (selectedId === null) return;
    const id = selectedId;
    try {
      await api.updateMessage(id, messageId, content);
      await loadDetail(id, { silent: true });
      await refreshList();
    } catch (e) {
      handleError(e);
    }
  }

  async function handleQueue(texts: string[], tone: string, targetId: number | null) {
    if (selectedId === null) return;
    const id = selectedId;
    try {
      await api.addQueuedReply(id, {
        content: texts.join("\n"),
        tone,
        targetMessageId: targetId,
      });
      await loadDetail(id, { silent: true });
      showToast("Queued");
    } catch (e) {
      handleError(e);
    }
  }

  async function handleDeleteQueued(queueId: number) {
    if (selectedId === null) return;
    const id = selectedId;
    try {
      await api.deleteQueuedReply(id, queueId);
      await loadDetail(id, { silent: true });
    } catch (e) {
      handleError(e);
    }
  }

  async function handleSendQueued(q: QueuedReply) {
    if (selectedId === null) return;
    const id = selectedId;
    const texts = q.content
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);
    if (texts.length === 0) return;
    try {
      await api.addMessagesBulk(
        id,
        texts.map((t) => ({ role: "me" as Role, content: t })),
      );
      await api.deleteQueuedReply(id, q.id);
      await loadDetail(id, { silent: true });
      await refreshList();
      showToast(texts.length > 1 ? `Sent ${texts.length} messages` : "Sent & logged");
    } catch (e) {
      handleError(e);
    }
  }

  async function handleDeleteMessage(messageId: number) {
    if (selectedId === null) return;
    const id = selectedId;
    try {
      await api.deleteMessage(id, messageId);
      await loadDetail(id, { silent: true });
      await refreshList();
    } catch (e) {
      handleError(e);
    }
  }

  async function handleAddFact(content: string) {
    if (selectedId === null) return;
    const id = selectedId;
    try {
      await api.addFact(id, content);
      await loadDetail(id, { silent: true });
    } catch (e) {
      handleError(e);
    }
  }

  async function handleDeleteFact(factId: number) {
    if (selectedId === null) return;
    const id = selectedId;
    try {
      await api.deleteFact(id, factId);
      await loadDetail(id, { silent: true });
    } catch (e) {
      handleError(e);
    }
  }

  async function handleTogglePin(factId: number, pinned: boolean) {
    if (selectedId === null) return;
    const id = selectedId;
    try {
      await api.setFactPinned(id, factId, pinned);
      await loadDetail(id, { silent: true });
    } catch (e) {
      handleError(e);
    }
  }

  async function handleUpdateConversation(patch: {
    platform?: string | null;
    notes?: string | null;
  }) {
    if (selectedId === null) return;
    const id = selectedId;
    try {
      await api.updateConversation(id, patch);
      await loadDetail(id, { silent: true });
      await refreshList();
    } catch (e) {
      handleError(e);
    }
  }

  const factsCount = detail?.facts.length ?? 0;

  return (
    <div className="app-backdrop flex h-dvh overflow-hidden text-zinc-100">
      {/* Inline sidebar (md+) */}
      <aside className="hidden w-72 shrink-0 overflow-hidden border-r border-white/5 md:flex">
        <Sidebar
          conversations={conversations}
          selectedId={selectedId}
          loading={loadingList}
          view={view}
          onView={setView}
          onSelect={selectConversation}
          onNew={() => setModalOpen(true)}
        />
      </aside>

      {/* Center + right */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-white/5 px-3 md:hidden">
          <button
            onClick={() => setMobileNav(true)}
            aria-label="Open conversations"
            className="rounded-lg p-1.5 text-zinc-300 hover:bg-white/5"
          >
            <IconMenu size={20} />
          </button>
          <span className="flex items-center gap-1.5 font-semibold">
            <IconHeart size={16} className="text-accent" /> Cyrano
          </span>
        </div>

        <div className="flex min-h-0 flex-1">
          <main className="flex min-w-0 flex-1 flex-col">
            {view === "prompts" ? (
              <PromptsLab
                onGenerate={async (data) => {
                  const res = await api.suggestPrompt(data);
                  return res.options;
                }}
              />
            ) : detail ? (
              <ConversationView
                key={detail.conversation.id}
                detail={detail}
                suggestions={suggestions}
                suggesting={suggesting}
                suggestError={suggestError}
                factsCount={factsCount}
                onSuggest={handleSuggest}
                onAddMessage={handleAddMessage}
                onUseOption={handleUseOption}
                onQueueOption={handleQueue}
                onRegenerateOne={handleRegenerateOne}
                onDismissSuggestions={() => {
                  setSuggestions(null);
                  setSuggestError(null);
                }}
                onDeleteMessage={handleDeleteMessage}
                onEditMessage={handleEditMessage}
                onDeleteConversation={handleDeleteConversation}
                onDeleteQueued={handleDeleteQueued}
                onSendQueued={handleSendQueued}
                onOpenImport={() => setImportOpen(true)}
                onOpenFacts={() => setFactsOpen(true)}
              />
            ) : (
              <EmptyMain
                loading={loadingDetail || (loadingList && conversations.length > 0)}
                hasConversations={conversations.length > 0}
                onNew={() => setModalOpen(true)}
              />
            )}
          </main>

          {/* Inline facts (xl+) */}
          {view === "replies" && detail && (
            <aside className="hidden w-80 shrink-0 border-l border-white/5 xl:flex">
              <FactsPanel
                detail={detail}
                onAddFact={handleAddFact}
                onDeleteFact={handleDeleteFact}
                onTogglePin={handleTogglePin}
                onUpdateConversation={handleUpdateConversation}
              />
            </aside>
          )}
        </div>
      </div>

      {/* Mobile sidebar drawer */}
      {mobileNav && (
        <Drawer side="left" onClose={() => setMobileNav(false)}>
          <Sidebar
            conversations={conversations}
            selectedId={selectedId}
            loading={loadingList}
            view={view}
            onView={(v) => {
              setView(v);
              setMobileNav(false);
            }}
            onSelect={selectConversation}
            onNew={() => {
              setMobileNav(false);
              setModalOpen(true);
            }}
          />
        </Drawer>
      )}

      {/* Facts drawer (below xl) */}
      {factsOpen && detail && (
        <Drawer side="right" onClose={() => setFactsOpen(false)}>
          <FactsPanel
            detail={detail}
            onAddFact={handleAddFact}
            onDeleteFact={handleDeleteFact}
            onTogglePin={handleTogglePin}
            onUpdateConversation={handleUpdateConversation}
            onClose={() => setFactsOpen(false)}
          />
        </Drawer>
      )}

      <NewConversationModal
        open={modalOpen}
        creating={creating}
        error={createError}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
      />

      <ImportThreadModal
        open={importOpen}
        importing={importing}
        error={importError}
        conversationName={detail?.conversation.name ?? "them"}
        onClose={() => setImportOpen(false)}
        onImport={handleImport}
        onAiParse={async (raw) => {
          if (selectedId === null) return [];
          const res = await api.parseThread(selectedId, raw);
          return res.messages;
        }}
      />

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
          <div
            className={cx(
              "animate-fade-up rounded-full border px-4 py-2 text-sm shadow-lg backdrop-blur",
              toast.kind === "error"
                ? "border-red-500/30 bg-red-500/15 text-red-200"
                : "border-white/10 bg-zinc-900/90 text-zinc-100",
            )}
          >
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}

function Drawer({
  side,
  onClose,
  children,
}: {
  side: "left" | "right";
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={cx("fixed inset-0 z-40", side === "left" ? "md:hidden" : "xl:hidden")}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cx(
          "absolute inset-y-0 w-[86%] max-w-xs animate-fade-up bg-zinc-900",
          side === "left" ? "left-0 border-r" : "right-0 border-l",
          "border-white/10 shadow-2xl",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function EmptyMain({
  loading,
  hasConversations,
  onNew,
}: {
  loading: boolean;
  hasConversations: boolean;
  onNew: () => void;
}) {
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-zinc-600">
        <span className="animate-thinking">Loading…</span>
      </div>
    );
  }
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent">
          <IconSparkles size={26} />
        </span>
        <h2 className="mt-4 text-lg font-semibold">
          {hasConversations ? "Pick a conversation" : "Welcome to Cyrano"}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
          {hasConversations
            ? "Choose someone from the left, paste their latest message, and get a few natural ways to reply."
            : "Your private reply copilot. Add the first person you're talking to, paste what they said, and get dry, natural replies — with a memory for the details."}
        </p>
        <button
          onClick={onNew}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-accent-strong"
        >
          <IconSparkles size={16} /> New conversation
        </button>
      </div>
    </div>
  );
}
