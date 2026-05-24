"use client";

import "./_css/ConversationListItem.css";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { type IntentCategory, type MessageRole } from "@prisma/client";

import { api, type RouterOutputs } from "~/trpc/react";

import Avatar from "~/components/inbox/ui/Avatar";
import ChannelIcon from "~/components/inbox/ui/ChannelIcon";
import LabelChip from "~/components/inbox/ui/LabelChip";
import PriorityBadge from "~/components/inbox/ui/PriorityBadge";
import RelativeTime from "~/components/inbox/ui/RelativeTime";

type Conversation = RouterOutputs["inbox"]["listConversations"][number];

type ConversationListItemProps = {
  conversation: Conversation;
  selected: boolean;
};

const CATEGORY_LABELS: Record<IntentCategory, string> = {
  TECHNICAL: "Technique",
  BILLING: "Facturation",
  GENERAL: "Général",
  UNKNOWN: "Autre",
};

const ROLE_PREFIX: Partial<Record<MessageRole, string>> = {
  OPERATOR: "Vous : ",
  ASSISTANT: "IA : ",
};

export default function ConversationListItem({
  conversation,
  selected,
}: ConversationListItemProps) {
  const {
    id,
    title,
    status,
    priority,
    category,
    channel,
    lastMessageAt,
    unreadCount,
    lastMessagePreview,
    lastMessageRole,
    client,
    assignee,
    labels,
  } = conversation;

  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const utils = api.useUtils();

  // Refresh the list, the tab counts, and (if open) the thread itself.
  async function invalidate() {
    await Promise.all([
      utils.inbox.listConversations.invalidate(),
      utils.inbox.counts.invalidate(),
    ]);
  }

  const archiveMutation = api.inbox.setStatus.useMutation({ onSuccess: invalidate });
  const deleteMutation = api.inbox.deleteConversation.useMutation({
    onSuccess: async () => {
      await invalidate();
      // If the deleted conversation is the one open in the detail pane, leave it.
      if (params?.id === id) router.push("/inbox");
    },
  });

  const actionPending = archiveMutation.isPending || deleteMutation.isPending;

  function handleArchive(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (actionPending) return;
    archiveMutation.mutate({ conversationId: id, status: "ARCHIVED" });
  }

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (actionPending) return;
    if (
      !window.confirm(
        "Supprimer définitivement cette conversation et tous ses messages ?",
      )
    )
      return;
    deleteMutation.mutate({ conversationId: id });
  }

  const isUnread = unreadCount > 0;
  const displayName = client.name ?? "Client inconnu";

  const prefix = lastMessageRole ? (ROLE_PREFIX[lastMessageRole] ?? "") : "";
  const previewText = lastMessagePreview ?? title ?? "Aucun message";

  return (
    <div className="conv-item-wrap">
    <Link
      href={`/inbox/${id}`}
      className={`conv-item${selected ? " conv-item--selected" : ""}${
        isUnread ? " conv-item--unread" : ""
      }`}
      aria-current={selected ? "true" : undefined}
    >
      <span className="conv-item__accent" aria-hidden="true" />

      <span className="conv-item__avatar">
        <Avatar src={client.avatarUrl} name={client.name} size={38} />
      </span>

      <span className="conv-item__main">
        {/* Top line: name + time + unread badge */}
        <span className="conv-item__top">
          <span className="conv-item__name">{displayName}</span>
          <span className="conv-item__meta">
            <span className="conv-item__time">
              <RelativeTime date={lastMessageAt} />
            </span>
            {isUnread && (
              <span
                className="conv-item__unread-badge"
                aria-label={`${unreadCount} non lus`}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </span>
        </span>

        {/* Second line: channel + category chip + priority */}
        <span className="conv-item__attrs">
          <span className="conv-item__channel">
            <ChannelIcon channel={channel} size={13} />
          </span>
          {category && (
            <span className="conv-item__category">
              {CATEGORY_LABELS[category]}
            </span>
          )}
          <PriorityBadge priority={priority} />
        </span>

        {/* Third line: preview */}
        <span className="conv-item__preview">
          {prefix && <span className="conv-item__preview-prefix">{prefix}</span>}
          {previewText}
        </span>

        {/* Fourth line: labels + assignee */}
        {(labels.length > 0 || assignee) && (
          <span className="conv-item__footer">
            <span className="conv-item__labels">
              {labels.map((label) => (
                <LabelChip key={label.id} name={label.name} color={label.color} />
              ))}
            </span>
            {assignee && (
              <span
                className="conv-item__assignee"
                title={`Attribuée à ${assignee.name}`}
              >
                <Avatar src={assignee.avatarUrl} name={assignee.name} size={18} />
              </span>
            )}
          </span>
        )}
      </span>
    </Link>

      {/* Hover actions — siblings of the Link so they don't nest in the anchor. */}
      <div className="conv-item-actions">
        {status !== "ARCHIVED" && (
          <button
            type="button"
            className="conv-item-action"
            onClick={handleArchive}
            disabled={actionPending}
            aria-label="Archiver la conversation"
            title="Archiver"
          >
            <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
              <path d="M216,56H40A8,8,0,0,0,32,64V80A16,16,0,0,0,48,96V200a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V96a16,16,0,0,0,16-16V64A8,8,0,0,0,216,56ZM192,200H64V96H192ZM208,80H48V72H208ZM152,128a8,8,0,0,1-8,8H112a8,8,0,0,1,0-16h32A8,8,0,0,1,152,128Z" />
            </svg>
          </button>
        )}
        <button
          type="button"
          className="conv-item-action conv-item-action--danger"
          onClick={handleDelete}
          disabled={actionPending}
          aria-label="Supprimer la conversation"
          title="Supprimer"
        >
          <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
            <path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
