"use client";

import "./_css/ContactDetails.css";

import { useState } from "react";
import { api } from "~/trpc/react";
import Avatar from "~/components/inbox/ui/Avatar";
import ChannelIcon from "~/components/inbox/ui/ChannelIcon";

// ── Channel labels ────────────────────────────────────────────────────────────

const CHANNEL_LABELS: Record<string, string> = {
  WEB:      "Web",
  EMAIL:    "E-mail",
  WHATSAPP: "WhatsApp",
  SLACK:    "Slack",
  API:      "API",
  OTHER:    "Autre",
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ContactDetailsSkeleton() {
  return (
    <div className="contact-details contact-details--skeleton" aria-busy="true">
      <div className="contact-details__header">
        <h2 className="contact-details__heading">Contact</h2>
      </div>

      <div className="contact-details__identity">
        <span className="contact-details__skeleton-avatar" />
        <span className="contact-details__skeleton-name" />
      </div>

      <div className="contact-details__fields">
        {[80, 120, 90, 60, 110].map((w, i) => (
          <div key={i} className="contact-details__skeleton-field">
            <span className="contact-details__skeleton-label" />
            <span
              className="contact-details__skeleton-value"
              style={{ width: w }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

type ContactDetailsProps = {
  conversationId: string;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function ContactDetails({ conversationId }: ContactDetailsProps) {
  const utils = api.useUtils();
  const { data: convo } = api.inbox.getConversation.useQuery({ id: conversationId });

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");

  const updateContact = api.inbox.updateContact.useMutation({
    onSuccess: async () => {
      await utils.inbox.getConversation.invalidate({ id: conversationId });
      void utils.inbox.listConversations.invalidate();
      setEditing(false);
    },
  });

  if (!convo) {
    return <ContactDetailsSkeleton />;
  }

  const { client, channel } = convo;

  function handleEditStart() {
    setName(client.name ?? "");
    setEmail(client.email ?? "");
    setPhone(client.phone ?? "");
    setCompany(client.company ?? "");
    setEditing(true);
  }

  function handleCancel() {
    setEditing(false);
  }

  function handleSave() {
    updateContact.mutate({
      clientId: client.id,
      name:    name.trim()    || undefined,
      email:   email.trim()   || undefined,
      phone:   phone.trim()   || undefined,
      company: company.trim() || undefined,
    });
  }

  const clientSinceLabel = client.createdAt
    ? new Date(client.createdAt).toLocaleDateString("fr-FR", {
        day:   "numeric",
        month: "long",
        year:  "numeric",
      })
    : "—";

  const channelLabel = CHANNEL_LABELS[channel] ?? channel;

  return (
    <div className="contact-details">
      {/* Header */}
      <div className="contact-details__header">
        <h2 className="contact-details__heading">Contact</h2>

        {editing ? (
          <div className="contact-details__edit-actions">
            <button
              className="contact-details__btn contact-details__btn--cancel"
              type="button"
              onClick={handleCancel}
              disabled={updateContact.isPending}
            >
              Annuler
            </button>
            <button
              className="contact-details__btn contact-details__btn--save"
              type="button"
              onClick={handleSave}
              disabled={updateContact.isPending}
            >
              {updateContact.isPending ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        ) : (
          <button
            className="contact-details__btn contact-details__btn--edit"
            type="button"
            onClick={handleEditStart}
          >
            Modifier
          </button>
        )}
      </div>

      {/* Avatar + name */}
      <div className="contact-details__identity">
        <Avatar src={client.avatarUrl} name={client.name} size={48} />

        {editing ? (
          <input
            className="contact-details__input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom du contact"
            aria-label="Nom"
          />
        ) : (
          <p
            className={
              "contact-details__name" +
              (!client.name ? " contact-details__name--empty" : "")
            }
          >
            {client.name ?? "Sans nom"}
          </p>
        )}
      </div>

      {/* Field list */}
      <div className="contact-details__fields">
        {/* Email */}
        <div className="contact-details__field">
          <span className="contact-details__field-label">E-mail</span>
          {editing ? (
            <input
              className="contact-details__input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemple.com"
              aria-label="E-mail"
            />
          ) : (
            <span
              className={
                "contact-details__field-value" +
                (!client.email ? " contact-details__field-value--empty" : "")
              }
            >
              {client.email ?? "—"}
            </span>
          )}
        </div>

        {/* Téléphone */}
        <div className="contact-details__field">
          <span className="contact-details__field-label">Téléphone</span>
          {editing ? (
            <input
              className="contact-details__input"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+33 6 00 00 00 00"
              aria-label="Téléphone"
            />
          ) : (
            <span
              className={
                "contact-details__field-value" +
                (!client.phone ? " contact-details__field-value--empty" : "")
              }
            >
              {client.phone ?? "—"}
            </span>
          )}
        </div>

        {/* Société */}
        <div className="contact-details__field">
          <span className="contact-details__field-label">Société</span>
          {editing ? (
            <input
              className="contact-details__input"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Nom de la société"
              aria-label="Société"
            />
          ) : (
            <span
              className={
                "contact-details__field-value" +
                (!client.company ? " contact-details__field-value--empty" : "")
              }
            >
              {client.company ?? "—"}
            </span>
          )}
        </div>

        {/* Canal */}
        <div className="contact-details__field">
          <span className="contact-details__field-label">Canal</span>
          <span className="contact-details__channel-value">
            <ChannelIcon channel={client.channel} size={13} />
            <span className="contact-details__channel-label">{channelLabel}</span>
          </span>
        </div>

        {/* Client depuis */}
        <div className="contact-details__field">
          <span className="contact-details__field-label">Client depuis</span>
          <span className="contact-details__field-value">{clientSinceLabel}</span>
        </div>
      </div>
    </div>
  );
}
