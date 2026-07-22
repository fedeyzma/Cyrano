"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { ConversationView } from "@/components/ConversationView";
import { FactsPanel } from "@/components/FactsPanel";
import { IconMenu, IconPlus } from "@/components/icons";
import { ImportThreadModal } from "@/components/ImportThreadModal";
import { NewConversationModal } from "@/components/NewConversationModal";
import { PersonDossier } from "@/components/PersonDossier";
import { ProfileModal } from "@/components/ProfileModal";
import { ProfileScan } from "@/components/ProfileScan";
import { PromptsLab } from "@/components/PromptsLab";
import { Sidebar } from "@/components/Sidebar";
import {
  ViewFade,
  drawerVariants,
  fadeUp,
  listContainer,
  rm,
  scrimVariants,
  toastVariants,
  useAppReducedMotion,
} from "@/components/motion";
import { Button, IconButton, SealDisc, Spinner } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { cx } from "@/lib/cx";
import type { ParsedMessage } from "@/lib/parseThread";
import type {
  ConversationDetail,
  ConversationListItem,
  Fact,
  FactCategory,
  Message,
  MessageRole,
  QueuedReply,
  ReplyOption,
  Role,
} from "@/lib/types";
import { normalizeFactCategory } from "@/lib/types";

type Toast = { id: number; message: string; kind: "info" | "error" };

export default function Home() {
  const reduced = useAppReducedMotion();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Mirrors selectedId synchronously so in-flight requests can tell whether
  // the user has switched conversations before applying their result.
  const selectedIdRef = useRef<number | null>(null);
  const setSelected = useCallback((id: number | null) => {
    selectedIdRef.current = id;
    setSelectedId(id);
  }, []);

  // ── The aurora & status beam (DESIGN.md §4, §5) ────────────────────
  // A single in-flight counter covers every LLM call in the app —
  // suggestions, single-card regens, prompt answers, thread parsing,
  // fact scans and profile scans. While > 0 the status beam sweeps the
  // top edge and the aurora surges (`.speaking`); the glow holds ~1.6s
  // after the last call settles, then eases back down.
  const [llmInFlight, setLlmInFlight] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const trackLlm = useCallback(async function <T>(p: Promise<T>): Promise<T> {
    setLlmInFlight((n) => n + 1);
    try {
      return await p;
    } finally {
      setLlmInFlight((n) => Math.max(0, n - 1));
    }
  }, []);
  useEffect(() => {
    if (llmInFlight > 0) {
      setSpeaking(true);
      return;
    }
    const cool = setTimeout(() => setSpeaking(false), 1600);
    return () => clearTimeout(cool);
  }, [llmInFlight]);

  // Suggestion state is kept per conversation: a generation that finishes
  // after switching tabs lands on the conversation it belongs to.
  const [suggestionsByConv, setSuggestionsByConv] = useState<
    Record<number, ReplyOption[] | undefined>
  >({});
  const [suggestingIds, setSuggestingIds] = useState<number[]>([]);
  const [suggestErrorByConv, setSuggestErrorByConv] = useState<
    Record<number, string | undefined>
  >({});

  const suggestions = selectedId !== null ? (suggestionsByConv[selectedId] ?? null) : null;
  const suggesting = selectedId !== null && suggestingIds.includes(selectedId);
  const suggestError = selectedId !== null ? (suggestErrorByConv[selectedId] ?? null) : null;

  const clearSuggestions = useCallback((id: number) => {
    setSuggestionsByConv((prev) => ({ ...prev, [id]: undefined }));
    setSuggestErrorByConv((prev) => ({ ...prev, [id]: undefined }));
  }, []);

  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [mobileNav, setMobileNav] = useState(false);
  const [factsOpen, setFactsOpen] = useState(false);
  const [dossierOpen, setDossierOpen] = useState(false);
  // Thread scans are slow (self-hosted model); track per conversation like suggestions.
  const [scanningFactsIds, setScanningFactsIds] = useState<number[]>([]);

  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [view, setView] = useState<"replies" | "prompts" | "scan">("replies");

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
        // Drop stale responses: never paint another conversation's data
        // over the one the user is currently viewing.
        if (selectedIdRef.current !== id) return;
        setDetail(d);
      } catch (e) {
        if (selectedIdRef.current === id) handleError(e);
      } finally {
        if (!opts?.silent && selectedIdRef.current === id) setLoadingDetail(false);
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
      if (list.length > 0 && selectedIdRef.current === null) setSelected(list[0].id);
    })();
  }, [refreshList, setSelected]);

  // Load detail whenever the selection changes; reset transient state.
  useEffect(() => {
    setFactsOpen(false);
    setDossierOpen(false);
    setImportOpen(false);
    setProfileOpen(false);
    setProfileError(null);
    if (selectedId === null) {
      setDetail(null);
      setLoadingDetail(false);
      return;
    }
    setDetail(null);
    loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  function selectConversation(id: number) {
    setSelected(id);
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
      setSelected(conv.id);
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
      setSelected(list.length > 0 ? list[0].id : null);
      showToast("Conversation deleted");
    } catch (e) {
      handleError(e);
    }
  }

  async function handleSuggest(
    incoming: string,
    steer: string,
    targetIds: number[],
    replyToMessageId?: number | null,
  ) {
    if (selectedId === null) return;
    const id = selectedId;
    const name = detail?.conversation.name;
    setSuggestingIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setSuggestErrorByConv((prev) => ({ ...prev, [id]: undefined }));
    setSuggestionsByConv((prev) => ({ ...prev, [id]: undefined }));
    try {
      const res = await trackLlm(
        api.suggest(id, {
          incoming: incoming || undefined,
          steer: steer || undefined,
          targetMessageIds: targetIds.length ? targetIds : undefined,
          replyToMessageId: incoming && replyToMessageId != null ? replyToMessageId : undefined,
        }),
      );
      setSuggestionsByConv((prev) => ({ ...prev, [id]: res.options }));
      await loadDetail(id, { silent: true });
      await refreshList();
      if (selectedIdRef.current !== id) {
        showToast(`Replies for ${name ?? "them"} are ready`);
      } else if (res.extractedFacts.length > 0) {
        showToast(
          `Remembered ${res.extractedFacts.length} new ${
            res.extractedFacts.length === 1 ? "detail" : "details"
          }`,
        );
      }
    } catch (e) {
      setSuggestErrorByConv((prev) => ({
        ...prev,
        [id]: e instanceof ApiError ? e.message : "Could not reach the LLM endpoint.",
      }));
      // The incoming message may have been saved server-side; refresh to show it.
      await loadDetail(id, { silent: true });
      await refreshList();
    } finally {
      setSuggestingIds((prev) => prev.filter((x) => x !== id));
    }
  }

  async function handleAddMessage(
    role: MessageRole,
    content: string,
    replyToMessageId?: number | null,
  ) {
    if (selectedId === null) return;
    const id = selectedId;
    const trimmed = content.trim();
    if (!trimmed) return;

    // Show it immediately, then reconcile. Waiting on the POST plus a full
    // detail refetch meant the composer emptied and the thread stayed unchanged
    // for two round trips, which reads as "the app ate my message".
    // The list is rendered in array order, so appending puts it last; the
    // negative temp id never reaches the server.
    const tempId = -Date.now();
    const temp: Message = {
      id: tempId,
      conversation_id: id,
      role,
      content: trimmed,
      created_at: Date.now(),
      reply_to_message_id: replyToMessageId ?? null,
      sort_order: null,
    };
    patchDetail(id, (d) => ({ ...d, messages: [...d.messages, temp] }));
    try {
      const real = await api.addMessage(id, role, trimmed, replyToMessageId);
      patchDetail(id, (d) => ({
        ...d,
        messages: d.messages.map((m) => (m.id === tempId ? real : m)),
      }));
      await refreshList(); // sidebar preview only, never blocks the thread
    } catch (e) {
      patchDetail(id, (d) => ({ ...d, messages: d.messages.filter((m) => m.id !== tempId) }));
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
      clearSuggestions(id);
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
      const res = await trackLlm(
        api.suggest(id, {
          count: 1,
          avoid,
          steer: steer || undefined,
          targetMessageIds: targetIds.length ? targetIds : undefined,
          extractFacts: false,
        }),
      );
      const replacement = res.options[0];
      if (replacement) {
        setSuggestionsByConv((prev) => {
          const cur = prev[id];
          return cur
            ? { ...prev, [id]: cur.map((o, i) => (i === index ? replacement : o)) }
            : prev;
        });
      }
    } catch (e) {
      handleError(e);
    }
  }

  async function handleEditMessage(messageId: number, content: string) {
    if (selectedId === null) return;
    const id = selectedId;
    const trimmed = content.trim();
    patchDetail(id, (d) => ({
      ...d,
      messages: d.messages.map((m) => (m.id === messageId ? { ...m, content: trimmed } : m)),
    }));
    try {
      await api.updateMessage(id, messageId, { content: trimmed });
      await refreshList();
    } catch (e) {
      handleError(e);
      await loadDetail(id, { silent: true });
    }
  }

  /** Flip who sent a message (them <-> me) — for fixing mis-attributed messages. */
  async function handleFlipMessage(messageId: number) {
    if (selectedId === null) return;
    const id = selectedId;
    const current = detail?.messages.find((m) => m.id === messageId);
    if (!current || current.role === "context") return;
    const role: Role = current.role === "them" ? "me" : "them";
    patchDetail(id, (d) => ({
      ...d,
      messages: d.messages.map((m) => (m.id === messageId ? { ...m, role } : m)),
    }));
    try {
      await api.updateMessage(id, messageId, { role });
      await refreshList();
    } catch (e) {
      handleError(e);
      await loadDetail(id, { silent: true });
    }
  }

  async function handleMoveMessage(messageId: number, direction: "up" | "down") {
    if (selectedId === null) return;
    const id = selectedId;
    // Optimistic swap so the thread reorders instantly.
    patchDetail(id, (d) => {
      const idx = d.messages.findIndex((m) => m.id === messageId);
      const otherIdx = direction === "up" ? idx - 1 : idx + 1;
      if (idx === -1 || otherIdx < 0 || otherIdx >= d.messages.length) return d;
      const messages = [...d.messages];
      [messages[idx], messages[otherIdx]] = [messages[otherIdx], messages[idx]];
      return { ...d, messages };
    });
    try {
      const res = await api.moveMessage(id, messageId, direction);
      patchDetail(id, (d) => ({ ...d, messages: res.messages }));
      await refreshList();
    } catch (e) {
      handleError(e);
      await loadDetail(id, { silent: true });
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
    patchDetail(id, (d) => ({ ...d, queued: d.queued.filter((q) => q.id !== queueId) }));
    try {
      await api.deleteQueuedReply(id, queueId);
    } catch (e) {
      handleError(e);
      await loadDetail(id, { silent: true });
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
    patchDetail(id, (d) => ({ ...d, messages: d.messages.filter((m) => m.id !== messageId) }));
    try {
      await api.deleteMessage(id, messageId);
      await refreshList();
    } catch (e) {
      handleError(e);
      await loadDetail(id, { silent: true });
    }
  }

  // Optimistic helper: patch the current conversation's detail in place.
  const patchDetail = useCallback(
    (id: number, fn: (d: ConversationDetail) => ConversationDetail) => {
      setDetail((prev) => (prev && prev.conversation.id === id ? fn(prev) : prev));
    },
    [],
  );

  async function handleAddFact(content: string, category: FactCategory) {
    if (selectedId === null) return;
    const id = selectedId;
    const trimmed = content.trim();
    if (!trimmed) return;
    const tempId = -Date.now();
    const temp: Fact = {
      id: tempId,
      conversation_id: id,
      content: trimmed,
      category,
      pinned: 0,
      source: "user",
      created_at: Date.now(),
    };
    patchDetail(id, (d) => ({ ...d, facts: [...d.facts, temp] })); // show instantly
    try {
      const real = await api.addFact(id, trimmed, category);
      patchDetail(id, (d) => ({ ...d, facts: d.facts.map((f) => (f.id === tempId ? real : f)) }));
    } catch (e) {
      patchDetail(id, (d) => ({ ...d, facts: d.facts.filter((f) => f.id !== tempId) }));
      handleError(e);
    }
  }

  // Backup export/import (dev → prod migration and general backups).
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    try {
      const backup = await api.exportBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `cyrano-backup-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      const n = backup.conversations.length;
      showToast(`Exported ${n} ${n === 1 ? "conversation" : "conversations"}`);
    } catch (e) {
      handleError(e);
    }
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be re-picked later
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const res = await api.importBackup(data);
      const list = await refreshList();
      if (selectedIdRef.current !== null) {
        await loadDetail(selectedIdRef.current, { silent: true });
      } else if (list.length > 0) {
        setSelected(list[0].id);
      }
      const parts: string[] = [];
      if (res.importedConversations > 0) {
        parts.push(
          `${res.importedConversations} ${res.importedConversations === 1 ? "person" : "people"} added`,
        );
      }
      if (res.skippedConversations > 0) parts.push(`${res.skippedConversations} already here`);
      showToast(parts.length > 0 ? `Import: ${parts.join(", ")}` : "Nothing new to import");
    } catch (e) {
      handleError(
        e instanceof SyntaxError ? new Error("That file isn't a valid backup (bad JSON).") : e,
      );
    }
  }

  async function handleScanFacts() {
    if (selectedId === null) return;
    const id = selectedId;
    const name = detail?.conversation.name;
    setScanningFactsIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    try {
      const res = await trackLlm(api.scanFacts(id));
      await loadDetail(id, { silent: true });
      const parts: string[] = [];
      if (res.facts.length > 0) {
        parts.push(
          `Saved ${res.facts.length} new ${res.facts.length === 1 ? "detail" : "details"} about ${name ?? "them"}`,
        );
      }
      if (res.refiled > 0) {
        parts.push(`organized ${res.refiled} existing`);
      }
      showToast(parts.length > 0 ? parts.join(", ") : "Nothing new — facts are already up to date");
    } catch (e) {
      handleError(e);
    } finally {
      setScanningFactsIds((prev) => prev.filter((x) => x !== id));
    }
  }

  async function handleDeleteFact(factId: number) {
    if (selectedId === null) return;
    const id = selectedId;
    patchDetail(id, (d) => ({ ...d, facts: d.facts.filter((f) => f.id !== factId) }));
    try {
      await api.deleteFact(id, factId);
    } catch (e) {
      handleError(e);
      await loadDetail(id, { silent: true }); // reconcile on failure
    }
  }

  async function handleTogglePin(factId: number, pinned: boolean) {
    if (selectedId === null) return;
    const id = selectedId;
    patchDetail(id, (d) => ({
      ...d,
      facts: d.facts.map((f) => (f.id === factId ? { ...f, pinned: pinned ? 1 : 0 } : f)),
    }));
    try {
      await api.setFactPinned(id, factId, pinned);
    } catch (e) {
      handleError(e);
      await loadDetail(id, { silent: true });
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

  async function handleSaveProfile(patch: {
    name: string;
    platform: string | null;
    notes: string | null;
  }) {
    if (selectedId === null) return;
    const id = selectedId;
    setSavingProfile(true);
    setProfileError(null);
    try {
      await api.updateConversation(id, patch);
      await loadDetail(id, { silent: true });
      await refreshList();
      setProfileOpen(false);
      showToast("Profile updated");
    } catch (e) {
      setProfileError(e instanceof ApiError ? e.message : "Could not update the profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleStartFromScan(data: {
    name: string;
    platform: string;
    facts: Array<{ fact: string; category?: string }>;
    opener: string;
  }) {
    try {
      const conv = await api.createConversation({
        name: data.name?.trim() || "New match",
        platform: data.platform || undefined,
      });
      for (const f of data.facts) {
        try {
          await api.addFact(conv.id, f.fact, normalizeFactCategory(f.category));
        } catch {
          /* skip duplicates */
        }
      }
      // The conversation and facts already exist; if adding the opener fails,
      // still surface the conversation instead of stranding it invisibly.
      let openerAdded = true;
      try {
        await api.addMessage(conv.id, "me", data.opener);
      } catch {
        openerAdded = false;
      }
      await refreshList();
      setView("replies");
      setSelected(conv.id);
      try {
        await navigator.clipboard.writeText(data.opener);
      } catch {
        /* clipboard unavailable */
      }
      showToast(
        openerAdded
          ? "Conversation started — opener added & copied"
          : "Conversation started — opener copied, but couldn't be added to the thread",
      );
    } catch (e) {
      handleError(e);
    }
  }

  const factsCount = detail?.facts.length ?? 0;

  // Crossfade key for the main region: distinguishes the three views only.
  // Keying it per conversation made every sidebar tap pay a mandatory 150ms
  // exit before the new thread could even start mounting. The switch is still
  // carried by ConversationView's own remount (its `key` below) plus the name
  // reveal and the header Light Streak, which is what DESIGN.md §8 specifies.
  const viewKey = view === "scan" ? "scan" : view === "prompts" ? "prompts" : "replies";

  return (
    <div
      className={cx(
        "app-backdrop flex h-dvh overflow-hidden text-ink",
        speaking && "speaking",
      )}
    >
      {/* Status beam — 2px garnet-and-gold sweep along the top edge while
          any LLM call is in flight; fades out 300ms on settle (§5). */}
      <AnimatePresence>
        {llmInFlight > 0 && (
          <motion.div
            key="status-beam"
            aria-hidden="true"
            className="status-beam"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.2 } }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
          />
        )}
      </AnimatePresence>

      {/* Inline sidebar (md+) */}
      <aside className="hidden w-72 shrink-0 overflow-hidden border-r border-line md:flex">
        <Sidebar
          conversations={conversations}
          selectedId={selectedId}
          loading={loadingList}
          view={view}
          onView={setView}
          onSelect={selectConversation}
          onNew={() => setModalOpen(true)}
          onExport={handleExport}
          onImport={handleImportClick}
        />
      </aside>

      {/* Center + right */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar — hidden while a conversation is open in replies
            view (the conversation header carries the menu button then). */}
        <div
          className={cx(
            "plate flex min-h-12 shrink-0 items-center gap-1.5 border-b border-line px-3 pt-[env(safe-area-inset-top)] md:hidden",
            view === "replies" && detail && "hidden",
          )}
        >
          <IconButton label="Open conversations" onClick={() => setMobileNav(true)}>
            <IconMenu size={20} />
          </IconButton>
          {/* Wordmark — Inter 700 with the gold→white gradient text fill,
              the one decorated piece of type in the app (§3) */}
          <span className="flex min-w-0 items-center gap-2 pl-1">
            <SealDisc initial="C" size={22} />
            <span className="truncate bg-[linear-gradient(90deg,var(--color-accent),var(--color-ink))] bg-clip-text text-[17px] font-bold leading-none tracking-[-0.03em] text-transparent">
              Cyrano
            </span>
          </span>
        </div>

        <div className="flex min-h-0 flex-1">
          <main className="relative flex min-w-0 flex-1 flex-col">
            <ViewFade viewKey={viewKey} className="flex min-h-0 min-w-0 flex-1 flex-col">
              {view === "scan" ? (
                <ProfileScan
                  onAnalyze={(d) => trackLlm(api.analyzeProfile(d))}
                  onOpeners={(d) => trackLlm(api.scanOpeners(d))}
                  onStart={handleStartFromScan}
                />
              ) : view === "prompts" ? (
                <PromptsLab
                  onGenerate={async (data) => {
                    const res = await trackLlm(api.suggestPrompt(data));
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
                    if (selectedId !== null) clearSuggestions(selectedId);
                  }}
                  onDeleteMessage={handleDeleteMessage}
                  onEditMessage={handleEditMessage}
                  onFlipMessage={handleFlipMessage}
                  onMoveMessage={handleMoveMessage}
                  onDeleteConversation={handleDeleteConversation}
                  onDeleteQueued={handleDeleteQueued}
                  onSendQueued={handleSendQueued}
                  onOpenImport={() => setImportOpen(true)}
                  onOpenFacts={() => setFactsOpen(true)}
                  onOpenProfile={() => setDossierOpen(true)}
                  onOpenMenu={() => setMobileNav(true)}
                />
              ) : (
                <EmptyMain
                  loading={loadingDetail || (loadingList && conversations.length > 0)}
                  hasConversations={conversations.length > 0}
                  onNew={() => setModalOpen(true)}
                />
              )}
            </ViewFade>

            {/* Person dossier — full-region overlay over the chat (§8) */}
            <AnimatePresence>
              {view === "replies" && detail && dossierOpen && (
                <PersonDossier
                  key={`dossier-${detail.conversation.id}`}
                  detail={detail}
                  scanning={selectedId !== null && scanningFactsIds.includes(selectedId)}
                  onAddFact={handleAddFact}
                  onScanFacts={handleScanFacts}
                  onDeleteFact={handleDeleteFact}
                  onTogglePin={handleTogglePin}
                  onEditProfile={() => {
                    setProfileError(null);
                    setProfileOpen(true);
                  }}
                  onClose={() => setDossierOpen(false)}
                />
              )}
            </AnimatePresence>
          </main>

          {/* Inline facts (xl+) — hidden while the dossier covers the chat */}
          {view === "replies" && detail && !dossierOpen && (
            <aside className="hidden w-80 shrink-0 border-l border-line xl:flex">
              <FactsPanel
                detail={detail}
                scanning={selectedId !== null && scanningFactsIds.includes(selectedId)}
                onAddFact={handleAddFact}
                onScanFacts={handleScanFacts}
                onDeleteFact={handleDeleteFact}
                onTogglePin={handleTogglePin}
                onUpdateConversation={handleUpdateConversation}
              />
            </aside>
          )}
        </div>
      </div>

      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {mobileNav && (
          <Drawer key="mobile-nav" side="left" onClose={() => setMobileNav(false)}>
            <Sidebar
              idPrefix="drawer"
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
              onExport={handleExport}
              onImport={() => {
                setMobileNav(false);
                handleImportClick();
              }}
            />
          </Drawer>
        )}
      </AnimatePresence>

      {/* Hidden picker for backup import (triggered from either Sidebar) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleImportFile}
        className="hidden"
      />

      {/* Facts drawer (below xl) */}
      <AnimatePresence>
        {factsOpen && detail && (
          <Drawer key="facts" side="right" onClose={() => setFactsOpen(false)}>
            <FactsPanel
              detail={detail}
              scanning={selectedId !== null && scanningFactsIds.includes(selectedId)}
              onAddFact={handleAddFact}
              onScanFacts={handleScanFacts}
              onDeleteFact={handleDeleteFact}
              onTogglePin={handleTogglePin}
              onUpdateConversation={handleUpdateConversation}
              onClose={() => setFactsOpen(false)}
            />
          </Drawer>
        )}
      </AnimatePresence>

      <ProfileModal
        open={profileOpen}
        conversation={detail?.conversation ?? null}
        saving={savingProfile}
        error={profileError}
        onClose={() => setProfileOpen(false)}
        onSave={handleSaveProfile}
      />

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
        existingMessages={detail?.messages ?? []}
        onClose={() => setImportOpen(false)}
        onImport={handleImport}
        onAiParse={async (raw) => {
          if (selectedId === null) return [];
          const res = await trackLlm(api.parseThread(selectedId, raw));
          return res.messages;
        }}
      />

      {/* Toast — iOS banner: frosted pill dropping in on a spring, with an
          8px glow dot (laurel success, danger error) (DESIGN.md §8) */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4">
        <AnimatePresence mode="popLayout">
          {toast && (
            <motion.div
              key={toast.id}
              role="status"
              variants={rm(reduced, toastVariants)}
              initial="initial"
              animate="enter"
              exit="exit"
              className="glass-toast flex max-w-md items-center gap-3 rounded-full border-line-strong px-4 py-2.5"
            >
              <span
                aria-hidden="true"
                className={cx(
                  "h-2 w-2 shrink-0 rounded-full bg-current shadow-[0_0_8px_currentColor]",
                  toast.kind === "error" ? "text-danger" : "text-laurel",
                )}
              />
              <span className="min-w-0 flex-1 text-body text-ink">{toast.message}</span>
              <span className="shrink-0 text-marginalia text-ink-muted tabular-nums">
                {new Date(toast.id).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Edge drawer — a frosted glass pane sliding in on the iOS sheet spring,
 *  over a dark blurred scrim (DESIGN.md §7D). Sidebar below md (left),
 *  facts below xl (right). Rounded on its free edge so it reads as a pane
 *  floating over the aurora, not a wall. */
function Drawer({
  side,
  onClose,
  children,
}: {
  side: "left" | "right";
  onClose: () => void;
  children: React.ReactNode;
}) {
  const reduced = useAppReducedMotion();
  return (
    <div className={cx("fixed inset-0 z-40", side === "left" ? "md:hidden" : "xl:hidden")}>
      <motion.div
        variants={rm(reduced, scrimVariants)}
        initial="initial"
        animate="enter"
        exit="exit"
        className="absolute inset-0 bg-[rgb(4_5_10_/_0.60)] backdrop-blur-[12px]"
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={side === "left" ? "Conversations" : "Facts"}
        variants={rm(reduced, drawerVariants(side))}
        initial="initial"
        animate="enter"
        exit="exit"
        className={cx(
          "glass-drawer absolute inset-y-0 flex w-[86%] max-w-xs overflow-hidden pb-[env(safe-area-inset-bottom)] shadow-[var(--shadow-lg),var(--shadow-plate)]",
          side === "left" ? "left-0 rounded-r-lg" : "right-0 rounded-l-lg",
        )}
      >
        {children}
      </motion.div>
    </div>
  );
}

/** Empty main region — a floating pane of simulated glass over the aurora
 *  (DESIGN.md §8): gem-disc monogram, display heading, one quiet paragraph,
 *  a single ghost CTA, cascading in 80ms apart. No blur — the aurora behind
 *  the glass is the illustration. */
function EmptyMain({
  loading,
  hasConversations,
  onNew,
}: {
  loading: boolean;
  hasConversations: boolean;
  onNew: () => void;
}) {
  const reduced = useAppReducedMotion();
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <span className="flex items-center gap-2.5 text-marginalia text-ink-muted">
          <Spinner size={13} />
          Loading…
        </span>
      </div>
    );
  }
  const item = rm(reduced, fadeUp(10));
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
      <motion.div
        variants={rm(reduced, listContainer(80))}
        initial="initial"
        animate="enter"
        className="glass-card w-full max-w-md rounded-lg p-8 text-center sm:p-10"
      >
        <motion.div variants={item} className="flex justify-center">
          <SealDisc initial="C" size={44} />
        </motion.div>
        <motion.h2 variants={item} className="mt-5 text-balance text-display text-ink">
          {hasConversations ? "Pick a conversation" : "Welcome to Cyrano"}
        </motion.h2>
        <motion.p variants={item} className="mt-3 text-body text-ink-secondary">
          {hasConversations
            ? "Choose someone from the left, paste their latest message, and get a few natural ways to reply."
            : "Your private reply copilot. Add someone you're talking to, paste what they said, and get replies that sound like you. It keeps track of the details, too."}
        </motion.p>
        <motion.div variants={item} className="mt-7 flex justify-center">
          <Button variant="ghost" size="md" onClick={onNew}>
            <IconPlus size={15} />
            New conversation
          </Button>
        </motion.div>
        <motion.p
          variants={item}
          className="mt-8 border-t border-line pt-4 text-marginalia text-ink-muted"
        >
          Stored locally. Nothing leaves your machine.
        </motion.p>
      </motion.div>
    </div>
  );
}
