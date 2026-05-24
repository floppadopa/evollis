"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { NEW_CHAT_IMAGES_KEY } from "~/components/home/new-chat";
import AppShell from "~/components/home/AppShell";
import AssistantMessage from "~/components/home/AssistantMessage";
import ChatComposer from "~/components/home/ChatComposer";
import ChatHeader from "~/components/home/ChatHeader";
import FeedbackBar from "~/components/home/FeedbackBar";
import TypingIndicator from "~/components/home/TypingIndicator";
import UserMessage from "~/components/home/UserMessage";
import { api } from "~/trpc/react";

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ChatView() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const utils = api.useUtils();

  const isNew = params.id === "new";

  const [draft, setDraft] = useState("");
  // The just-sent customer message, shown immediately while the AI replies.
  const [optimistic, setOptimistic] = useState<{
    content: string;
    images: string[];
  } | null>(null);
  // Sentinel at the end of the thread; scrolled into view as messages arrive.
  const endRef = useRef<HTMLDivElement>(null);

  const { data: conversation, isLoading } = api.chat.getConversation.useQuery(
    { id: params.id },
    { enabled: !isNew },
  );

  // The connected customer — used as a fallback for the avatar/name when the
  // conversation hasn't loaded yet (e.g. the first message of a new thread),
  // so the bubble never shows a "?" placeholder.
  const { data: me } = api.chat.me.useQuery();
  const clientAvatar = conversation?.client.avatarUrl ?? me?.avatarUrl ?? null;
  const clientName = conversation?.client.name ?? me?.name ?? null;

  const sendMessage = api.chat.sendMessage.useMutation({
    onSuccess: async (data) => {
      if (isNew) {
        // Move to the real conversation URL; its thread (now persisted,
        // including the AI reply) loads in place. Optimistic state is cleared
        // once that data arrives (see the effect below).
        await utils.chat.listConversations.invalidate();
        router.replace(`/chat/${data.conversationId}`);
        return;
      }
      // Refetch the thread; the optimistic bubble is dropped by the effect
      // below once the persisted message shows up, so there's no flash.
      await Promise.all([
        utils.chat.getConversation.invalidate({ id: params.id }),
        utils.chat.listConversations.invalidate(),
      ]);
    },
    onError: () => setOptimistic(null),
  });

  // Regenerate the latest AI reply (Retry button on a bot message).
  const regenerate = api.chat.regenerateReply.useMutation();
  async function handleRetry() {
    if (isNew) return;
    await regenerate.mutateAsync({ conversationId: params.id });
    await utils.chat.getConversation.invalidate({ id: params.id });
  }

  // Auto-send the message typed on the home screen (?m=... + any stashed
  // images) for a new thread.
  const autoSent = useRef(false);
  useEffect(() => {
    if (!isNew || autoSent.current) return;
    const initial = searchParams.get("m")?.trim() ?? "";
    let images: string[] = [];
    try {
      const raw = sessionStorage.getItem(NEW_CHAT_IMAGES_KEY);
      if (raw) {
        sessionStorage.removeItem(NEW_CHAT_IMAGES_KEY);
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          images = parsed.filter((u): u is string => typeof u === "string");
        }
      }
    } catch {
      // ignore malformed/unavailable storage
    }
    if (!initial && images.length === 0) return;
    autoSent.current = true;
    setOptimistic({ content: initial, images });
    sendMessage.mutate({
      conversationId: null,
      content: initial,
      images: images.length > 0 ? images : undefined,
    });
  }, [isNew, searchParams, sendMessage]);

  // Drop the optimistic bubble only once its message is actually persisted and
  // reloaded — covers both the in-place send and the post-navigation new-thread
  // flow. (Clearing on mere `conversation` presence would hide the message
  // instantly in an existing thread, before the reply is even generated.)
  useEffect(() => {
    if (!optimistic || !conversation) return;
    const persisted = conversation.messages.some(
      (m) =>
        m.role === "USER" &&
        m.content === optimistic.content &&
        m.images.length === optimistic.images.length,
    );
    if (persisted) setOptimistic(null);
  }, [conversation, optimistic]);

  // Keep the latest content in view: on send, while the reply generates, and
  // when new messages (or a freshly loaded thread) arrive.
  const messageCount = conversation?.messages.length ?? 0;
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messageCount, optimistic, sendMessage.isPending]);

  function handleSubmit(text: string, images: string[] = []) {
    const trimmed = text.trim();
    if ((!trimmed && images.length === 0) || sendMessage.isPending) return;
    setDraft("");
    setOptimistic({ content: trimmed, images });
    sendMessage.mutate({
      conversationId: isNew ? null : params.id,
      content: trimmed,
      images: images.length > 0 ? images : undefined,
    });
  }

  const title = isNew
    ? "Nouvelle conversation"
    : isLoading
      ? "Chargement…"
      : !conversation
        ? "Conversation introuvable"
        : (conversation.title ?? "Conversation sans titre");

  const messages = conversation?.messages ?? [];
  const generating = sendMessage.isPending;
  // The most recent AI reply is the only one offering "Régénérer".
  const lastAssistantId = [...messages]
    .reverse()
    .find((m) => m.role === "ASSISTANT")?.id;
  // Render the optimistic bubble until the same message arrives in the thread,
  // so there's never a duplicate during the refetch window.
  const showOptimistic =
    optimistic !== null &&
    !messages.some(
      (m) =>
        m.role === "USER" &&
        m.content === optimistic.content &&
        m.images.length === optimistic.images.length,
    );
  // Show the full-screen loader only when there's nothing else to display yet.
  const showLoader =
    !isNew && isLoading && !optimistic && messages.length === 0;
  const notFound = !isNew && !isLoading && !conversation;

  return (
    <div className="flex h-full flex-col">
      <ChatHeader title={title} />

      <div className="flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        <div className="mx-auto w-full max-w-3xl px-4 pt-1 pb-10">
          {showLoader ? (
            <div
              className="mt-6 ml-1"
              role="status"
              aria-label="Chargement de la conversation"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/evollis-logo.svg"
                alt=""
                aria-hidden="true"
                className="h-8 w-8 animate-pulse rounded-md select-none"
              />
            </div>
          ) : notFound ? (
            <p className="mt-10 text-center text-sm text-[var(--text-500)]">
              Conversation introuvable
            </p>
          ) : (
            <>
              {messages.map((message) => {
                if (message.role === "SYSTEM") return null;

                if (message.role === "USER") {
                  return (
                    <UserMessage
                      key={message.id}
                      content={message.content}
                      images={message.images}
                      time={formatTime(message.createdAt)}
                      avatarSrc={clientAvatar}
                      authorName={clientName}
                    />
                  );
                }

                if (message.role === "OPERATOR") {
                  return (
                    <AssistantMessage
                      key={message.id}
                      content={message.content}
                      isBot={false}
                      avatarSrc={message.authorAgent?.avatarUrl}
                      authorName={message.authorAgent?.name}
                      label={
                        message.authorAgent?.name
                          ? `Conseiller Evollis · ${message.authorAgent.name}`
                          : "Conseiller Evollis"
                      }
                    />
                  );
                }

                return (
                  <AssistantMessage
                    key={message.id}
                    content={message.content}
                    label="Evollis IA"
                    onRetry={
                      message.id === lastAssistantId ? handleRetry : undefined
                    }
                  />
                );
              })}

              {/* Optimistic customer bubble — shown instantly on send. */}
              {showOptimistic ? (
                <UserMessage
                  content={optimistic?.content ?? ""}
                  images={optimistic?.images}
                  avatarSrc={clientAvatar}
                  authorName={clientName}
                />
              ) : null}

              {/* "Evollis IA est en train d'écrire…" while the reply generates. */}
              {generating ? <TypingIndicator /> : null}
            </>
          )}
          {/* Scroll anchor — kept at the very bottom of the thread. */}
          <div ref={endRef} aria-hidden="true" />
        </div>
      </div>

      <div className="shrink-0">
        {conversation ? (
          <div className="mx-auto w-full max-w-3xl px-4 pb-1">
            <FeedbackBar
              conversationId={conversation.id}
              status={conversation.status}
              takenOver={conversation.takenOver}
              hasResponse={conversation.messages.some(
                (m) => m.role === "ASSISTANT" || m.role === "OPERATOR",
              )}
            />
          </div>
        ) : null}
        <div className="mx-auto w-full max-w-3xl px-4 pt-2">
          <ChatComposer
            placeholder="Écrire un message…"
            value={draft}
            onChange={setDraft}
            onSubmit={handleSubmit}
            allowImages
          />
        </div>
        <div
          role="note"
          className="bg-[var(--bg-100)] py-2 text-center text-xs text-[var(--text-500)]"
        >
          <a
            href="https://www.evollis.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-[var(--text-300)]"
          >
            Evollis est une IA et peut faire des erreurs. Veuillez vérifier les réponses.
          </a>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <AppShell>
      <ChatView />
    </AppShell>
  );
}
