"use client";

import "./_css/ConversationActions.css";

import { type Priority } from "@prisma/client";
import { api } from "~/trpc/react";
import Avatar from "~/components/inbox/ui/Avatar";
import LabelChip from "~/components/inbox/ui/LabelChip";

// ── Priority meta ──────────────────────────────────────────────────────────

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: "URGENT", label: "Urgent",  color: "#ef4444" },
  { value: "HIGH",   label: "Haute",   color: "#f59e0b" },
  { value: "MEDIUM", label: "Moyenne", color: "#3b82f6" },
  { value: "LOW",    label: "Basse",   color: "var(--text-400)" },
  { value: "NONE",   label: "Aucune",  color: "transparent" },
];

function priorityColor(p: Priority): string {
  return PRIORITY_OPTIONS.find((o) => o.value === p)?.color ?? "transparent";
}

// ── Props ──────────────────────────────────────────────────────────────────

type Props = { conversationId: string };

// ── Component ──────────────────────────────────────────────────────────────

export default function ConversationActions({ conversationId }: Props) {
  const utils = api.useUtils();

  // Queries
  const { data: conv } = api.inbox.getConversation.useQuery({ id: conversationId });
  const { data: agents = [] } = api.inbox.listAgents.useQuery();
  const { data: allLabels = [] } = api.inbox.listLabels.useQuery();

  // ── Invalidate helpers ─────────────────────────────────────────────────
  async function invalidate() {
    await Promise.all([
      utils.inbox.getConversation.invalidate({ id: conversationId }),
      utils.inbox.listConversations.invalidate(),
    ]);
  }

  // ── Mutations ──────────────────────────────────────────────────────────
  const assignMutation = api.inbox.assign.useMutation({ onSuccess: invalidate });
  const setPriorityMutation = api.inbox.setPriority.useMutation({ onSuccess: invalidate });
  const addLabelMutation = api.inbox.addLabel.useMutation({ onSuccess: invalidate });
  const removeLabelMutation = api.inbox.removeLabel.useMutation({ onSuccess: invalidate });

  // Pending states
  const assignPending = assignMutation.isPending;
  const priorityPending = setPriorityMutation.isPending;
  const labelPending = addLabelMutation.isPending || removeLabelMutation.isPending;

  if (!conv) return null;

  // ── Derived data ───────────────────────────────────────────────────────
  const appliedLabelIds = new Set(conv.labels.map((l) => l.id));
  const availableLabels = allLabels.filter((l) => !appliedLabelIds.has(l.id));

  // ── Handlers ──────────────────────────────────────────────────────────
  function handleAssignChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const agentId = e.target.value === "" ? null : e.target.value;
    assignMutation.mutate({ conversationId, agentId });
  }

  function handlePriorityChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const priority = e.target.value as Priority;
    setPriorityMutation.mutate({ conversationId, priority });
  }

  function handleAddLabel(e: React.ChangeEvent<HTMLSelectElement>) {
    const labelId = e.target.value;
    if (!labelId) return;
    // Reset select to placeholder
    e.target.value = "";
    addLabelMutation.mutate({ conversationId, labelId });
  }

  function handleRemoveLabel(labelId: string) {
    removeLabelMutation.mutate({ conversationId, labelId });
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="conv-actions">

      {/* ── 1. Assigné à ───────────────────────────────────────────────── */}
      <div className="conv-actions__row">
        <p className="conv-actions__label">Assigné à</p>

        <div className="conv-actions__assignee-wrap">
          {conv.assignee && (
            <span className="conv-actions__assignee-avatar">
              <Avatar
                src={conv.assignee.avatarUrl}
                name={conv.assignee.name}
                size={22}
              />
            </span>
          )}
          <select
            className={`conv-actions__select ${conv.assignee ? "conv-actions__select--assignee" : ""}`}
            value={conv.assignee?.id ?? ""}
            onChange={handleAssignChange}
            disabled={assignPending}
            aria-label="Assigner la conversation"
          >
            <option value="">Non attribuée</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── 2. Priorité ────────────────────────────────────────────────── */}
      <div className="conv-actions__row">
        <p className="conv-actions__label">Priorité</p>

        <div className="conv-actions__priority-wrap">
          {conv.priority !== "NONE" && (
            <span
              className="conv-actions__priority-dot"
              aria-hidden="true"
              style={{ backgroundColor: priorityColor(conv.priority) }}
            />
          )}
          <select
            className={`conv-actions__select ${conv.priority !== "NONE" ? "conv-actions__select--priority" : ""}`}
            value={conv.priority}
            onChange={handlePriorityChange}
            disabled={priorityPending}
            aria-label="Définir la priorité"
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── 3. Libellés ────────────────────────────────────────────────── */}
      <div className="conv-actions__row">
        <p className="conv-actions__label">Libellés</p>

        {/* Applied labels */}
        <div className="conv-actions__labels-list">
          {conv.labels.length === 0 && (
            <span className="conv-actions__labels-empty">Aucun libellé</span>
          )}
          {conv.labels.map((label) => {
            const isRemoving =
              removeLabelMutation.isPending &&
              removeLabelMutation.variables?.labelId === label.id;
            return (
              <span
                key={label.id}
                className={isRemoving ? "conv-actions__chip--pending" : undefined}
              >
                <LabelChip
                  name={label.name}
                  color={label.color}
                  onRemove={labelPending ? undefined : () => handleRemoveLabel(label.id)}
                />
              </span>
            );
          })}
        </div>

        {/* Add label select */}
        {availableLabels.length > 0 && (
          <div className="conv-actions__add-label-row">
            <select
              className="conv-actions__add-select"
              defaultValue=""
              onChange={handleAddLabel}
              disabled={labelPending}
              aria-label="Ajouter un libellé"
            >
              <option value="" disabled>
                + Ajouter un libellé
              </option>
              {availableLabels.map((label) => (
                <option key={label.id} value={label.id}>
                  {label.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

    </div>
  );
}
