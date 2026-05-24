"use client";

import "./_css/PriorityBadge.css";

import { type Priority } from "@prisma/client";

type PriorityBadgeProps = {
  priority: Priority;
};

const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; color: string } | null
> = {
  URGENT: { label: "Urgent",  color: "#ef4444" },
  HIGH:   { label: "Haute",   color: "#f59e0b" },
  MEDIUM: { label: "Moyenne", color: "#3b82f6" },
  LOW:    { label: "Basse",   color: "var(--text-400)" },
  NONE:   null,
};

function FlagIcon({ color }: { color: string }) {
  return (
    <svg
      className="ev-priority-badge__icon"
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill={color}
      aria-hidden="true"
    >
      <path d="M2 1.5a.5.5 0 0 1 .5-.5H2v7.25a.75.75 0 0 1-1.5 0V1.5A1.5 1.5 0 0 1 2 0h7a.5.5 0 0 1 .354.854L7.207 3l2.147 2.146A.5.5 0 0 1 9 6H2V1.5z" />
    </svg>
  );
}

export default function PriorityBadge({ priority }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority];
  if (!config) return null;

  const { label, color } = config;

  return (
    <span
      className="ev-priority-badge"
      style={{ color }}
      title={label}
    >
      <FlagIcon color={color} />
      <span className="ev-priority-badge__label">{label}</span>
    </span>
  );
}
