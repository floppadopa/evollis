"use client";

import "./_css/ConversationInfo.css";

import { useState } from "react";
import { api } from "~/trpc/react";
import ChannelIcon from "~/components/inbox/ui/ChannelIcon";
import StatusBadge from "~/components/inbox/ui/StatusBadge";

// ── Channel labels ────────────────────────────────────────────────────────────

const CHANNEL_LABELS: Record<string, string> = {
  WEB:      "Web",
  EMAIL:    "E-mail",
  WHATSAPP: "WhatsApp",
  SLACK:    "Slack",
  API:      "API",
  OTHER:    "Autre",
};

// ── Date formatting helpers ───────────────────────────────────────────────────

function formatDateFr(date: Date | string): string {
  return new Date(date).toLocaleDateString("fr-FR", {
    day:    "numeric",
    month:  "long",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  });
}

// ── Copy icon ─────────────────────────────────────────────────────────────────

function CopyIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

// ── Check icon (copied feedback) ──────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
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

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ConversationInfoSkeleton() {
  return (
    <div className="conv-info conv-info--skeleton" aria-busy="true">
      <h2 className="conv-info__heading">Conversation</h2>
      <div className="conv-info__fields">
        {[70, 100, 130, 120, 160].map((w, i) => (
          <div key={i} className="conv-info__skeleton-field">
            <span className="conv-info__skeleton-label" />
            <span
              className="conv-info__skeleton-value"
              style={{ width: w }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

type ConversationInfoProps = {
  conversationId: string;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function ConversationInfo({ conversationId }: ConversationInfoProps) {
  const { data: convo } = api.inbox.getConversation.useQuery({ id: conversationId });
  const [copied, setCopied] = useState(false);

  if (!convo) {
    return <ConversationInfoSkeleton />;
  }

  const channelLabel = CHANNEL_LABELS[convo.channel] ?? convo.channel;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(convo!.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard access denied — silently ignore
    }
  }

  return (
    <div className="conv-info">
      <h2 className="conv-info__heading">Conversation</h2>

      <div className="conv-info__fields">
        {/* Statut */}
        <div className="conv-info__field">
          <span className="conv-info__field-label">Statut</span>
          <span className="conv-info__field-value">
            <StatusBadge status={convo.status} />
          </span>
        </div>

        {/* Canal */}
        <div className="conv-info__field">
          <span className="conv-info__field-label">Canal</span>
          <span className="conv-info__channel-value">
            <ChannelIcon channel={convo.channel} size={13} />
            <span className="conv-info__channel-label">{channelLabel}</span>
          </span>
        </div>

        {/* Créée le */}
        <div className="conv-info__field">
          <span className="conv-info__field-label">Créée le</span>
          <span className="conv-info__field-value">
            {formatDateFr(convo.createdAt)}
          </span>
        </div>

        {/* Dernier message */}
        <div className="conv-info__field">
          <span className="conv-info__field-label">Dernier message</span>
          <span className="conv-info__field-value">
            {formatDateFr(convo.lastMessageAt)}
          </span>
        </div>

        {/* Identifiant */}
        <div className="conv-info__field">
          <span className="conv-info__field-label">Identifiant</span>
          <div className="conv-info__id-row">
            <span className="conv-info__id-value" title={convo.id}>
              {convo.id}
            </span>
            {copied ? (
              <span className="conv-info__copy-feedback" aria-live="polite">
                <CheckIcon />
              </span>
            ) : null}
            <button
              className="conv-info__copy-btn"
              type="button"
              aria-label="Copier l'identifiant"
              onClick={handleCopy}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
