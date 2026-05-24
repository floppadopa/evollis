"use client";

import "./_css/ContactPanel.css";

import { useEffect, useRef, useState } from "react";

import { api } from "~/trpc/react";
import ContactDetails from "~/components/inbox/contact/ContactDetails";
import ConversationActions from "~/components/inbox/contact/ConversationActions";
import ConversationInfo from "~/components/inbox/contact/ConversationInfo";
import Participants from "~/components/inbox/contact/Participants";
import PreviousConversations from "~/components/inbox/contact/PreviousConversations";

// ── Chevron icon ──────────────────────────────────────────────────────────────

function ChevronDown() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ── Section helper component ──────────────────────────────────────────────────

type SectionProps = {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

function Section({ title, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const headerId = `contact-section-${title.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="contact-panel__section">
      <button
        id={headerId}
        type="button"
        className="contact-panel__section-header"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="contact-panel__section-title">{title}</span>
        <span
          className={`contact-panel__chevron ${
            open
              ? "contact-panel__chevron--open"
              : "contact-panel__chevron--closed"
          }`}
        >
          <ChevronDown />
        </span>
      </button>

      <div
        role="region"
        aria-labelledby={headerId}
        className={`contact-panel__section-body ${
          open
            ? "contact-panel__section-body--open"
            : "contact-panel__section-body--closed"
        }`}
      >
        <div className="contact-panel__section-content">{children}</div>
      </div>
    </div>
  );
}

// ── ContactPanel ──────────────────────────────────────────────────────────────

type ContactPanelProps = {
  conversationId: string;
};

export default function ContactPanel({ conversationId }: ContactPanelProps) {
  const utils = api.useUtils();

  // markRead is an agent-only mutation, so a session must exist before firing it.
  const { data: me } = api.auth.me.useQuery();

  const markRead = api.inbox.markRead.useMutation();

  // Stable ref so the effect closure never captures a stale mutation object
  const markReadRef = useRef(markRead);
  markReadRef.current = markRead;

  useEffect(() => {
    // Don't fire the agent-only mutation without a session — otherwise it
    // rejects with UNAUTHORIZED and (having no error handler) surfaces as an
    // unhandled console error.
    if (!me) return;

    markReadRef.current.mutate(
      { conversationId },
      {
        onSuccess: async () => {
          await Promise.all([
            utils.inbox.counts.invalidate(),
            utils.inbox.listConversations.invalidate(),
          ]);
        },
        // Marking-as-read is best-effort; never let a failure (e.g. an expired
        // session) bubble up as an unhandled rejection.
        onError: () => undefined,
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, me?.id]);

  return (
    <div className="contact-panel">
      <Section title="Contact">
        <ContactDetails conversationId={conversationId} />
      </Section>

      <Section title="Actions de conversation">
        <ConversationActions conversationId={conversationId} />
      </Section>

      <Section title="Informations">
        <ConversationInfo conversationId={conversationId} />
      </Section>

      <Section title="Participants">
        <Participants conversationId={conversationId} />
      </Section>

      <Section title="Conversations précédentes">
        <PreviousConversations conversationId={conversationId} />
      </Section>
    </div>
  );
}
