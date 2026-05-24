"use client";

import "./_css/Participants.css";

import { useState } from "react";

import { api } from "~/trpc/react";
import Avatar from "~/components/inbox/ui/Avatar";

// ── Props ─────────────────────────────────────────────────────────────────────

type ParticipantsProps = {
  conversationId: string;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function Participants({ conversationId }: ParticipantsProps) {
  const utils = api.useUtils();

  const [selectedAgentId, setSelectedAgentId] = useState<string>("");

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: convo } = api.inbox.getConversation.useQuery({ id: conversationId });
  const { data: allAgents } = api.inbox.listAgents.useQuery();

  const participants = convo?.participants ?? [];

  // Agents not already in participants
  const participantIds = new Set(participants.map((p) => p.id));
  const availableAgents = (allAgents ?? []).filter((a) => !participantIds.has(a.id));

  // ── Mutations ─────────────────────────────────────────────────────────────────

  async function invalidate() {
    await utils.inbox.getConversation.invalidate({ id: conversationId });
  }

  const addParticipant = api.inbox.addParticipant.useMutation({
    onSuccess: async () => {
      setSelectedAgentId("");
      await invalidate();
    },
  });

  const removeParticipant = api.inbox.removeParticipant.useMutation({
    onSuccess: invalidate,
  });

  // ── Handlers ──────────────────────────────────────────────────────────────────

  function handleAdd() {
    if (!selectedAgentId) return;
    addParticipant.mutate({ conversationId, agentId: selectedAgentId });
  }

  function handleRemove(agentId: string) {
    removeParticipant.mutate({ conversationId, agentId });
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const isAddPending = addParticipant.isPending;
  const isRemovePending = removeParticipant.isPending;

  return (
    <section className="participants">
      <div className="participants__header">
        <h3 className="participants__heading">Participants</h3>
      </div>

      {participants.length > 0 ? (
        <ul className="participants__list" role="list">
          {participants.map((agent) => (
            <li key={agent.id} className="participants__row">
              <span className="participants__row-avatar">
                <Avatar src={agent.avatarUrl} name={agent.name} size={24} />
              </span>
              <span className="participants__row-name">{agent.name}</span>
              <button
                type="button"
                className="participants__remove-btn"
                aria-label={`Retirer ${agent.name}`}
                onClick={() => handleRemove(agent.id)}
                disabled={isRemovePending || isAddPending}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="participants__empty">Aucun participant</p>
      )}

      {/* Add participant */}
      {availableAgents.length > 0 && (
        <div className="participants__add">
          <select
            className="participants__add-select"
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            disabled={isAddPending || isRemovePending}
            aria-label="Sélectionner un participant à ajouter"
          >
            <option value="" disabled>
              + Ajouter un participant
            </option>
            {availableAgents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="participants__add-btn"
            onClick={handleAdd}
            disabled={!selectedAgentId || isAddPending || isRemovePending}
            aria-label="Ajouter le participant sélectionné"
          >
            Ajouter
          </button>
        </div>
      )}
    </section>
  );
}
