"use client";

import "./_css/ConversationHeader.css";

import Avatar from "~/components/inbox/ui/Avatar";
import StatusBadge from "~/components/inbox/ui/StatusBadge";
import PriorityBadge from "~/components/inbox/ui/PriorityBadge";
import ChannelIcon from "~/components/inbox/ui/ChannelIcon";
import { api } from "~/trpc/react";

// ── Inline SVG icons ────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg
      className="conv-header__btn-icon"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function RefreshCwIcon() {
  return (
    <svg
      className="conv-header__btn-icon"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      className="conv-header__btn-icon"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function HeaderSkeleton() {
  return (
    <div className="conv-header conv-header--skeleton" aria-busy="true">
      <div className="conv-header__left">
        <span className="conv-header__skeleton-avatar" />
        <div className="conv-header__skeleton-lines">
          <span className="conv-header__skeleton-line conv-header__skeleton-line--name" />
          <span className="conv-header__skeleton-line conv-header__skeleton-line--sub" />
        </div>
      </div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

type ConversationHeaderProps = {
  conversationId: string;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function ConversationHeader({ conversationId }: ConversationHeaderProps) {
  const utils = api.useUtils();

  const { data: convo } = api.inbox.getConversation.useQuery({ id: conversationId });

  // Helper: invalidate all relevant caches after a mutation
  async function invalidateAll() {
    await utils.inbox.getConversation.invalidate({ id: conversationId });
    void utils.inbox.listConversations.invalidate();
    void utils.inbox.counts.invalidate();
  }

  // ── Mutations ───────────────────────────────────────────────────────────────

  const setStatus = api.inbox.setStatus.useMutation({
    onSuccess: invalidateAll,
  });

  const snooze = api.inbox.snooze.useMutation({
    onSuccess: invalidateAll,
  });

  // ── Loading state ───────────────────────────────────────────────────────────

  if (!convo) {
    return <HeaderSkeleton />;
  }

  // ── Resolve / Reopen ────────────────────────────────────────────────────────

  const isResolved = convo.status === "RESOLVED";

  function handleResolveToggle() {
    setStatus.mutate({
      conversationId,
      status: isResolved ? "OPEN" : "RESOLVED",
    });
  }

  // ── Snooze (24 h) ────────────────────────────────────────────────────────────

  function handleSnooze() {
    snooze.mutate({
      conversationId,
      until: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="conv-header" role="banner">
      {/* LEFT — client identity */}
      <div className="conv-header__left">
        <Avatar
          src={convo.client.avatarUrl}
          name={convo.client.name}
          size={34}
        />
        <div className="conv-header__identity">
          <span className="conv-header__name">{convo.client.name}</span>
          <span className="conv-header__sub">
            <span className="conv-header__channel-icon">
              <ChannelIcon channel={convo.channel} size={13} />
            </span>
            <span className="conv-header__title">{convo.title}</span>
          </span>
        </div>
      </div>

      {/* RIGHT — badges + action buttons */}
      <div className="conv-header__right">
        <div className="conv-header__badges">
          <StatusBadge status={convo.status} />
          <PriorityBadge priority={convo.priority} />
        </div>

        <div className="conv-header__divider" aria-hidden="true" />

        <div className="conv-header__actions">
          {/* Snooze */}
          <button
            className="conv-header__btn conv-header__btn--secondary"
            type="button"
            title="Reporter de 24 h"
            aria-label="Reporter cette conversation de 24 heures"
            onClick={handleSnooze}
            disabled={snooze.isPending}
          >
            <ClockIcon />
            Reporter
          </button>

          {/* Resolve / Reopen */}
          {isResolved ? (
            <button
              className="conv-header__btn conv-header__btn--secondary"
              type="button"
              title="Rouvrir la conversation"
              aria-label="Rouvrir la conversation"
              onClick={handleResolveToggle}
              disabled={setStatus.isPending}
            >
              <RefreshCwIcon />
              Rouvrir
            </button>
          ) : (
            <button
              className="conv-header__btn conv-header__btn--accent"
              type="button"
              title="Résoudre la conversation"
              aria-label="Marquer la conversation comme résolue"
              onClick={handleResolveToggle}
              disabled={setStatus.isPending}
            >
              <CheckIcon />
              Résoudre
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
