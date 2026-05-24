"use client";

import "./_css/ConversationListItem.css";

import Link from "next/link";

import { type IntentCategory, type MessageRole } from "@prisma/client";

import { type RouterOutputs } from "~/trpc/react";

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

  const isUnread = unreadCount > 0;
  const displayName = client.name ?? "Client inconnu";

  const prefix = lastMessageRole ? (ROLE_PREFIX[lastMessageRole] ?? "") : "";
  const previewText = lastMessagePreview ?? title ?? "Aucun message";

  return (
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
  );
}
