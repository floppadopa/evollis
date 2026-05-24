"use client";

import "./_css/MessageBubble.css";

import type { IntentCategory, MessageRole } from "@prisma/client";

import Avatar from "~/components/inbox/ui/Avatar";

type Message = {
  id: string;
  role: MessageRole;
  content: string;
  isPrivate: boolean;
  createdAt: Date;
  category: IntentCategory | null;
  images: string[];
  authorAgent: { id: string; name: string; avatarUrl: string | null } | null;
};

type MessageBubbleProps = {
  message: Message;
  clientName: string | null;
  clientAvatarUrl: string | null;
};

function formatTime(date: Date): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function MessageBubble({
  message,
  clientName,
  clientAvatarUrl,
}: MessageBubbleProps) {
  const time = formatTime(message.createdAt);

  // ── 5. SYSTEM ─────────────────────────────────────────────────────────────
  if (message.role === "SYSTEM") {
    return (
      <div className="msg-system" role="note">
        {message.content}
      </div>
    );
  }

  // ── 4. OPERATOR private internal note ──────────────────────────────────────
  if (message.role === "OPERATOR" && message.isPrivate) {
    return (
      <div className="msg-note">
        <div className="msg-note__header">
          <span className="msg-note__lock" aria-hidden="true">
            🔒
          </span>
          <span>Note privée</span>
          <span className="msg-note__sep">·</span>
          <span className="msg-note__author">
            {message.authorAgent?.name ?? "Agent"}
          </span>
        </div>
        <div className="msg-note__content">{message.content}</div>
        <time className="msg-note__time">{time}</time>
      </div>
    );
  }

  // ── 3. OPERATOR public reply ───────────────────────────────────────────────
  if (message.role === "OPERATOR") {
    const agentName = message.authorAgent?.name ?? "Agent";
    return (
      <div className="msg-bubble msg-bubble--operator">
        <div className="msg-bubble__avatar">
          <Avatar
            src={message.authorAgent?.avatarUrl}
            name={agentName}
            size={28}
          />
        </div>
        <div className="msg-bubble__body">
          <div className="msg-bubble__meta">
            <span className="msg-bubble__author">{agentName}</span>
            <span className="msg-bubble__time">{time}</span>
          </div>
          <div className="msg-bubble__content">{message.content}</div>
        </div>
      </div>
    );
  }

  // ── 2. ASSISTANT (Evollis IA) ──────────────────────────────────────────────
  if (message.role === "ASSISTANT") {
    return (
      <div className="msg-bubble msg-bubble--assistant">
        <div className="msg-bubble__avatar">
          <Avatar src="/evollis-logo.svg" name="Evollis IA" size={28} logo />
        </div>
        <div className="msg-bubble__body">
          <div className="msg-bubble__meta">
            <span className="msg-bubble__author">Evollis IA</span>
            <span className="msg-bubble__time">{time}</span>
          </div>
          <div className="msg-bubble__content">{message.content}</div>
        </div>
      </div>
    );
  }

  // ── 1. USER (the customer) ─────────────────────────────────────────────────
  const name = clientName ?? "Client";
  return (
    <div className="msg-bubble msg-bubble--user">
      <div className="msg-bubble__avatar">
        <Avatar src={clientAvatarUrl} name={name} size={28} />
      </div>
      <div className="msg-bubble__body">
        <div className="msg-bubble__meta">
          <span className="msg-bubble__author">{name}</span>
          <span className="msg-bubble__time">{time}</span>
        </div>
        {message.images.length > 0 && (
          <div className="msg-bubble__images">
            {message.images.map((src, i) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={i}
                src={src}
                alt={`Pièce jointe ${i + 1}`}
                className="msg-bubble__image"
              />
            ))}
          </div>
        )}
        {message.content ? (
          <div className="msg-bubble__content">{message.content}</div>
        ) : null}
      </div>
    </div>
  );
}
