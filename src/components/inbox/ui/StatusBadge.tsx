"use client";

import "./_css/StatusBadge.css";

import { type ConversationStatus } from "@prisma/client";

type StatusBadgeProps = {
  status: ConversationStatus;
};

const STATUS_CONFIG: Record<
  ConversationStatus,
  { label: string; color: string }
> = {
  OPEN:      { label: "Ouvert",    color: "#3b82f6" },
  PENDING:   { label: "En attente", color: "#f59e0b" },
  SNOOZED:   { label: "En pause",  color: "#8b5cf6" },
  ESCALATED: { label: "Escaladé",  color: "#ef4444" },
  RESOLVED:  { label: "Résolu",    color: "#10b981" },
  ARCHIVED:  { label: "Archivé",   color: "var(--text-500)" },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { label, color } = STATUS_CONFIG[status];
  const isVar = color.startsWith("var(");

  return (
    <span
      className="ev-status-badge"
      style={
        isVar
          ? {
              color,
              borderColor: color,
              backgroundColor: "color-mix(in srgb, var(--text-500) 15%, transparent)",
            }
          : {
              color,
              borderColor: color,
              backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
            }
      }
      title={label}
    >
      {label}
    </span>
  );
}
