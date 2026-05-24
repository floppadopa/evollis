"use client";

import "./_css/AssistantMessage.css";

import { useCallback, useRef, useState } from "react";

import MessageActionButton from "~/components/home/MessageActionButton";
import Avatar from "~/components/inbox/ui/Avatar";

type AssistantMessageProps = {
  content: string;
  label?: string;
  /** When false, this is a human conseiller reply (uses avatarSrc); default true = AI bot. */
  isBot?: boolean;
  avatarSrc?: string | null;
  authorName?: string | null;
  /** Provided only for the latest AI reply — regenerates it. May be async. */
  onRetry?: () => void | Promise<void>;
};

// ── Icons ───────────────────────────────────────────────────────────────────
const CopyIcon = (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M12.5 3A1.5 1.5 0 0 1 14 4.5V6h1.5A1.5 1.5 0 0 1 17 7.5v8a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 6 15.5V14H4.5A1.5 1.5 0 0 1 3 12.5v-8A1.5 1.5 0 0 1 4.5 3zm1.5 9.5a1.5 1.5 0 0 1-1.5 1.5H7v1.5a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5v-8a.5.5 0 0 0-.5-.5H14zM4.5 4a.5.5 0 0 0-.5.5v8a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5v-8a.5.5 0 0 0-.5-.5z" />
  </svg>
);

const CheckIcon = (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.79 6.8-6.79a1 1 0 0 1 1.4 0z" />
  </svg>
);

const ThumbUpIcon = (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M9.56 2a2.5 2.5 0 0 1 2.452 2.99L11.609 7h2.235a2.75 2.75 0 0 1 2.713 3.202l-.681 4.082A3.25 3.25 0 0 1 12.67 17H4.5A1.5 1.5 0 0 1 3 15.5V9.238a1.5 1.5 0 0 1 1.059-1.433l1.14-.35.139-.048a2.75 2.75 0 0 0 1.56-1.453L8.41 2.59l.07-.13A1 1 0 0 1 9.322 2zM7.81 6.365a3.75 3.75 0 0 1-2.126 1.98l-.192.065-1.14.35A.5.5 0 0 0 4 9.239V15.5a.5.5 0 0 0 .5.5h8.17a2.25 2.25 0 0 0 2.22-1.88l.68-4.082A1.75 1.75 0 0 0 13.844 8H11a.5.5 0 0 1-.49-.598l.521-2.608A1.5 1.5 0 0 0 9.561 3h-.238z" />
  </svg>
);

const ThumbDownIcon = (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M12.67 3a3.25 3.25 0 0 1 3.206 2.716l.68 4.082A2.75 2.75 0 0 1 13.845 13H11.61l.403 2.01A2.5 2.5 0 0 1 9.56 18h-.238a1 1 0 0 1-.843-.46l-.069-.13-1.514-3.364a2.75 2.75 0 0 0-1.56-1.453l-.139-.047-1.14-.35A1.5 1.5 0 0 1 3 10.761V4.5A1.5 1.5 0 0 1 4.5 3zM4.5 4a.5.5 0 0 0-.5.5v6.262a.5.5 0 0 0 .353.477l1.14.35.19.065a3.75 3.75 0 0 1 2.127 1.98L9.323 17h.238a1.5 1.5 0 0 0 1.47-1.794l-.521-2.608A.5.5 0 0 1 11 12h2.844a1.75 1.75 0 0 0 1.726-2.038l-.68-4.082A2.25 2.25 0 0 0 12.67 4z" />
  </svg>
);

const RetryIcon = (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M10.386 2.51A7.5 7.5 0 1 1 5.499 4H3a.5.5 0 0 1 0-1h3.5a.5.5 0 0 1 .49.402L7 3.5V7a.5.5 0 0 1-1 0V4.879a6.5 6.5 0 1 0 4.335-1.37L10 3.5l-.1-.01a.5.5 0 0 1 .1-.99z" />
  </svg>
);

export default function AssistantMessage({
  content,
  label,
  isBot = true,
  avatarSrc,
  authorName,
  onRetry,
}: AssistantMessageProps) {
  // The AI is always presented as "Evollis IA"; conseiller replies keep their label.
  const displayLabel = label ?? (isBot ? "Evollis IA" : undefined);

  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [retrying, setRetrying] = useState(false);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(() => {
    void navigator.clipboard?.writeText(content).catch(() => undefined);
    setCopied(true);
    if (copyResetRef.current) clearTimeout(copyResetRef.current);
    copyResetRef.current = setTimeout(() => setCopied(false), 1500);
  }, [content]);

  const handleRetry = useCallback(async () => {
    if (!onRetry || retrying) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  }, [onRetry, retrying]);

  return (
    <div className="assistant-message">
      <div className="assistant-message-avatar">
        {isBot ? (
          <Avatar src="/evollis-logo.svg" name="Evollis IA" size={28} logo />
        ) : (
          <Avatar src={avatarSrc} name={authorName} size={28} />
        )}
      </div>
      <div className="assistant-message-content">
        {displayLabel ? (
          <span className="assistant-message-label">{displayLabel}</span>
        ) : null}
        <div className="assistant-message-body">
          <p className="assistant-message-text">{content}</p>
        </div>
        <div className="assistant-message-actions" role="group" aria-label="Message actions">
          <MessageActionButton
            label={copied ? "Copié" : "Copier"}
            onClick={handleCopy}
            active={copied}
            className={copied ? "message-action--copied" : undefined}
            icon={copied ? CheckIcon : CopyIcon}
          />
          <MessageActionButton
            label="Bonne réponse"
            onClick={() => setFeedback((f) => (f === "up" ? null : "up"))}
            active={feedback === "up"}
            className="message-action--thumb-up"
            icon={ThumbUpIcon}
          />
          <MessageActionButton
            label="Mauvaise réponse"
            onClick={() => setFeedback((f) => (f === "down" ? null : "down"))}
            active={feedback === "down"}
            className="message-action--thumb-down"
            icon={ThumbDownIcon}
          />
          {onRetry ? (
            <MessageActionButton
              label={retrying ? "Régénération…" : "Régénérer"}
              onClick={handleRetry}
              disabled={retrying}
              className={retrying ? "message-action--spinning" : undefined}
              icon={RetryIcon}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
