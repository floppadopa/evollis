"use client";

import "./_css/PreviousConversations.css";

import Link from "next/link";

import { api } from "~/trpc/react";
import StatusBadge from "~/components/inbox/ui/StatusBadge";
import RelativeTime from "~/components/inbox/ui/RelativeTime";

// ── Props ─────────────────────────────────────────────────────────────────────

type PreviousConversationsProps = {
  conversationId: string;
};

// ── Loading placeholder ───────────────────────────────────────────────────────

function LoadingPlaceholder() {
  return (
    <div className="prev-convos__placeholder" aria-busy="true" aria-label="Chargement des conversations précédentes">
      {[0, 1, 2].map((i) => (
        <div key={i} className="prev-convos__placeholder-row">
          <span className="prev-convos__skeleton prev-convos__skeleton--title" />
          <span className="prev-convos__skeleton prev-convos__skeleton--badge" />
          <span className="prev-convos__skeleton prev-convos__skeleton--time" />
        </div>
      ))}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PreviousConversations({ conversationId }: PreviousConversationsProps) {
  const { data: convo, isLoading: convoLoading } = api.inbox.getConversation.useQuery(
    { id: conversationId },
  );

  const clientId = convo?.client.id ?? null;

  const { data: prevConvos, isLoading: prevLoading } = api.inbox.previousConversations.useQuery(
    { clientId: clientId!, excludeId: conversationId },
    { enabled: !!clientId },
  );

  const isLoading = convoLoading || (!!clientId && prevLoading);

  return (
    <section className="prev-convos">
      <div className="prev-convos__header">
        <h3 className="prev-convos__heading">Conversations précédentes</h3>
      </div>

      {isLoading ? (
        <LoadingPlaceholder />
      ) : prevConvos && prevConvos.length > 0 ? (
        <ul className="prev-convos__list" role="list">
          {prevConvos.map((conv) => (
            <li key={conv.id}>
              <Link
                href={`/inbox/${conv.id}`}
                className="prev-convos__row"
              >
                <span className="prev-convos__row-title">
                  {conv.title ?? "Conversation sans titre"}
                </span>
                <span className="prev-convos__row-meta">
                  <StatusBadge status={conv.status} />
                  <span className="prev-convos__row-time">
                    <RelativeTime date={conv.lastMessageAt} />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="prev-convos__empty">Aucune autre conversation</p>
      )}
    </section>
  );
}
