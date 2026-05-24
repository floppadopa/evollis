"use client";

import "./_css/FeedbackBar.css";

import { type ConversationStatus } from "@prisma/client";

import { api } from "~/trpc/react";

type FeedbackBarProps = {
  conversationId: string;
  status: ConversationStatus;
  takenOver: boolean;
  /** Only ask for feedback once there's at least one response to rate. */
  hasResponse: boolean;
};

export default function FeedbackBar({
  conversationId,
  status,
  takenOver,
  hasResponse,
}: FeedbackBarProps) {
  const utils = api.useUtils();
  const submit = api.chat.submitFeedback.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.chat.getConversation.invalidate({ id: conversationId }),
        utils.chat.listConversations.invalidate(),
      ]);
    },
  });

  const resolved = status === "RESOLVED";
  const escalated = !resolved && (takenOver || status === "ESCALATED");

  // Resolved wins, even if a human had previously been handed the thread.
  if (resolved) {
    return (
      <div className="feedback-bar feedback-bar--resolved" role="status">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.79 6.8-6.79a1 1 0 0 1 1.4 0z" />
        </svg>
        <span>Conversation marquée comme résolue. Merci pour votre retour !</span>
      </div>
    );
  }

  // A human is (or is about to be) on it — reassure the customer.
  if (escalated) {
    return (
      <div className="feedback-bar feedback-bar--handoff" role="status">
        <span className="feedback-bar__dot" aria-hidden="true" />
        <span className="feedback-bar__handoff-text">
          Un conseiller Evollis a été notifié et vous répondra sous peu.
        </span>
      </div>
    );
  }

  if (!hasResponse) return null;

  const pending = submit.isPending;

  return (
    <div className="feedback-bar" role="group" aria-label="Votre demande est-elle résolue ?">
      <span className="feedback-bar__prompt">Votre demande est-elle résolue ?</span>
      <div className="feedback-bar__actions">
        <button
          type="button"
          className="feedback-bar__btn feedback-bar__btn--yes"
          onClick={() => submit.mutate({ conversationId, resolved: true })}
          disabled={pending}
        >
          <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.79 6.8-6.79a1 1 0 0 1 1.4 0z" />
          </svg>
          Résolu
        </button>
        <button
          type="button"
          className="feedback-bar__btn feedback-bar__btn--no"
          onClick={() => submit.mutate({ conversationId, resolved: false })}
          disabled={pending}
        >
          <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M10 8.6 5.7 4.3a1 1 0 0 0-1.4 1.4L8.6 10l-4.3 4.3a1 1 0 1 0 1.4 1.4L10 11.4l4.3 4.3a1 1 0 0 0 1.4-1.4L11.4 10l4.3-4.3a1 1 0 0 0-1.4-1.4z" />
          </svg>
          Pas résolu
        </button>
      </div>
    </div>
  );
}
