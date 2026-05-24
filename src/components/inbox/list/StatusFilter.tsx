"use client";

import "./_css/StatusFilter.css";

import { type ConversationStatus } from "@prisma/client";

export type StatusFilterValue = "ACTIVE" | "ALL" | ConversationStatus;

type StatusFilterProps = {
  value: StatusFilterValue;
  onChange: (value: StatusFilterValue) => void;
};

const OPTIONS: { value: StatusFilterValue; label: string }[] = [
  { value: "ACTIVE",    label: "Actives" },
  { value: "OPEN",      label: "Ouvertes" },
  { value: "PENDING",   label: "En attente" },
  { value: "SNOOZED",   label: "En pause" },
  { value: "ESCALATED", label: "Escaladées" },
  { value: "RESOLVED",  label: "Résolues" },
  { value: "ARCHIVED",  label: "Archivées" },
  { value: "ALL",       label: "Toutes" },
];

export default function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <div className="status-filter">
      {/* Filter icon */}
      <span className="status-filter__icon" aria-hidden="true">
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M2 4h12M4 8h8M6 12h4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </span>

      <select
        className="status-filter__select"
        value={value}
        onChange={(e) => onChange(e.target.value as StatusFilterValue)}
        aria-label="Filtrer par statut"
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Chevron down */}
      <span className="status-filter__chevron" aria-hidden="true">
        <svg
          width="10"
          height="10"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </div>
  );
}
