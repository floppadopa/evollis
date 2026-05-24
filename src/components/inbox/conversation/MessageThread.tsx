"use client";

import "./_css/MessageThread.css";

import { Fragment, useEffect, useRef } from "react";

import { api } from "~/trpc/react";

import MessageBubble from "./MessageBubble";

type MessageThreadProps = {
  conversationId: string;
};

function startOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dateSeparatorLabel(date: Date): string {
  const d = date instanceof Date ? date : new Date(date);
  const today = startOfDay(new Date());
  const target = startOfDay(d);
  const oneDay = 24 * 60 * 60 * 1000;

  if (target === today) return "Aujourd'hui";
  if (target === today - oneDay) return "Hier";

  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function ThreadSkeleton() {
  return (
    <>
      <div className="msg-thread__skeleton">
        <div className="msg-thread__skeleton-avatar" />
        <div className="msg-thread__skeleton-lines">
          <div className="msg-thread__skeleton-line msg-thread__skeleton-line--wide" />
          <div className="msg-thread__skeleton-line msg-thread__skeleton-line--mid" />
        </div>
      </div>
      <div className="msg-thread__skeleton msg-thread__skeleton--right">
        <div className="msg-thread__skeleton-avatar" />
        <div className="msg-thread__skeleton-lines">
          <div className="msg-thread__skeleton-line msg-thread__skeleton-line--mid" />
          <div className="msg-thread__skeleton-line msg-thread__skeleton-line--narrow" />
        </div>
      </div>
      <div className="msg-thread__skeleton">
        <div className="msg-thread__skeleton-avatar" />
        <div className="msg-thread__skeleton-lines">
          <div className="msg-thread__skeleton-line msg-thread__skeleton-line--wide" />
          <div className="msg-thread__skeleton-line msg-thread__skeleton-line--wide" />
          <div className="msg-thread__skeleton-line msg-thread__skeleton-line--mid" />
        </div>
      </div>
    </>
  );
}

export default function MessageThread({ conversationId }: MessageThreadProps) {
  const { data: convo, isLoading } = api.inbox.getConversation.useQuery({
    id: conversationId,
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const messageCount = convo?.messages.length ?? 0;

  // Auto-scroll to bottom on first load and whenever the message count changes.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messageCount, conversationId]);

  return (
    <div className="msg-thread" ref={scrollRef}>
      <div className="msg-thread__inner">
        {isLoading ? (
          <ThreadSkeleton />
        ) : messageCount === 0 ? (
          <div className="msg-thread__empty">Aucun message</div>
        ) : (
          convo!.messages.map((m, i) => {
            const prev = i > 0 ? convo!.messages[i - 1] : null;
            const showSeparator =
              !prev ||
              startOfDay(new Date(m.createdAt)) !==
                startOfDay(new Date(prev.createdAt));

            return (
              <Fragment key={m.id}>
                {showSeparator && (
                  <div className="msg-thread__date">
                    <span className="msg-thread__date-pill">
                      {dateSeparatorLabel(new Date(m.createdAt))}
                    </span>
                  </div>
                )}
                <MessageBubble
                  message={m}
                  clientName={convo!.client?.name ?? null}
                  clientAvatarUrl={convo!.client?.avatarUrl ?? null}
                />
              </Fragment>
            );
          })
        )}
      </div>
    </div>
  );
}
