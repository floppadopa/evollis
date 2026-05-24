"use client";

import "./_css/TypingIndicator.css";

import Avatar from "~/components/inbox/ui/Avatar";

/**
 * "Evollis IA est en train d'écrire…" — shown in the thread while the
 * classify → reply pipeline runs, so the customer sees that something is
 * happening. Mirrors the AssistantMessage layout (logo avatar + label).
 */
export default function TypingIndicator() {
  return (
    <div className="assistant-message" role="status" aria-live="polite">
      <div className="assistant-message-avatar">
        <Avatar src="/evollis-logo.svg" name="Evollis IA" size={28} logo />
      </div>
      <div className="assistant-message-content">
        <span className="assistant-message-label">Evollis IA</span>
        <div className="typing-indicator" aria-label="Evollis IA est en train d'écrire">
          <span className="typing-indicator__dot" />
          <span className="typing-indicator__dot" />
          <span className="typing-indicator__dot" />
        </div>
      </div>
    </div>
  );
}
