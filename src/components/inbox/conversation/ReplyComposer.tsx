"use client";

import "./_css/ReplyComposer.css";

import { useRef, useState, useCallback } from "react";
import { api } from "~/trpc/react";

// ── Icons ─────────────────────────────────────────────────────────────────────

function PaperPlaneIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function ReplyIcon() {
  return (
    <svg
      className="reply-composer__tab-icon"
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="9 17 4 12 9 7" />
      <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      className="reply-composer__tab-icon"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

type ReplyComposerProps = {
  conversationId: string;
};

type Mode = "reply" | "note";

// ── Component ─────────────────────────────────────────────────────────────────

export default function ReplyComposer({ conversationId }: ReplyComposerProps) {
  const [mode, setMode] = useState<Mode>("reply");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const utils = api.useUtils();

  async function invalidateAll() {
    await Promise.all([
      utils.inbox.getConversation.invalidate({ id: conversationId }),
      utils.inbox.listConversations.invalidate(),
      utils.inbox.counts.invalidate(),
    ]);
  }

  const sendReply = api.inbox.sendReply.useMutation({
    onSuccess: async () => {
      setContent("");
      setError(null);
      resetHeight();
      await invalidateAll();
    },
    onError: (err) => {
      setError(err.message ?? "Une erreur est survenue. Veuillez réessayer.");
    },
  });

  const addPrivateNote = api.inbox.addPrivateNote.useMutation({
    onSuccess: async () => {
      setContent("");
      setError(null);
      resetHeight();
      await invalidateAll();
    },
    onError: (err) => {
      setError(err.message ?? "Une erreur est survenue. Veuillez réessayer.");
    },
  });

  const isPending = sendReply.isPending || addPrivateNote.isPending;
  const canSend = content.trim().length > 0 && !isPending;

  // Auto-grow textarea
  function resetHeight() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
  }

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setContent(e.target.value);
      setError(null);
      const el = e.target;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    },
    [],
  );

  function handleSubmit() {
    const trimmed = content.trim();
    if (!trimmed || isPending) return;
    setError(null);

    if (mode === "reply") {
      sendReply.mutate({ conversationId, content: trimmed });
    } else {
      addPrivateNote.mutate({ conversationId, content: trimmed });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleModeChange(next: Mode) {
    setMode(next);
    setError(null);
    textareaRef.current?.focus();
  }

  const isNote = mode === "note";
  const placeholder = isNote
    ? "Écrire une note interne (visible par les agents uniquement)…"
    : "Écrire une réponse au client…";

  return (
    <div
      className={`reply-composer${isNote ? " reply-composer--note" : ""}`}
      role="region"
      aria-label={isNote ? "Composer une note privée" : "Composer une réponse"}
    >
      {/* Mode tabs */}
      <div className="reply-composer__tabs" role="tablist" aria-label="Mode de réponse">
        <button
          role="tab"
          type="button"
          aria-selected={mode === "reply"}
          className={`reply-composer__tab reply-composer__tab--reply${mode === "reply" ? " reply-composer__tab--active" : ""}`}
          onClick={() => handleModeChange("reply")}
        >
          <ReplyIcon />
          Répondre
        </button>
        <button
          role="tab"
          type="button"
          aria-selected={mode === "note"}
          className={`reply-composer__tab reply-composer__tab--note${mode === "note" ? " reply-composer__tab--active" : ""}`}
          onClick={() => handleModeChange("note")}
        >
          <LockIcon />
          Note privée
        </button>
      </div>

      {/* Textarea + send button */}
      <div className="reply-composer__row">
        <textarea
          ref={textareaRef}
          className="reply-composer__textarea"
          rows={1}
          value={content}
          placeholder={placeholder}
          disabled={isPending}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          aria-label={placeholder}
          aria-multiline="true"
        />
        <button
          type="button"
          className="reply-composer__send"
          disabled={!canSend}
          onClick={handleSubmit}
          aria-label={isNote ? "Envoyer la note privée" : "Envoyer la réponse"}
          title={isNote ? "Envoyer la note privée" : "Envoyer la réponse"}
        >
          <PaperPlaneIcon />
        </button>
      </div>

      {/* Inline error */}
      {error && (
        <p className="reply-composer__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
