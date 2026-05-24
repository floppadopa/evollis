"use client";

import "./_css/InboxTabs.css";

import { type ConversationStatus } from "@prisma/client";

import { api } from "~/trpc/react";

type TabValue = "mine" | "unassigned" | "all";

type InboxTabsProps = {
  value: TabValue;
  onChange: (value: TabValue) => void;
  // Same filter as the list, so the badge counts match what's shown.
  status?: ConversationStatus | "ALL";
  search?: string;
};

const TABS: { value: TabValue; label: string }[] = [
  { value: "mine", label: "Moi" },
  { value: "unassigned", label: "Non attribuées" },
  { value: "all", label: "Toutes" },
];

export default function InboxTabs({
  value,
  onChange,
  status,
  search,
}: InboxTabsProps) {
  const { data: counts } = api.inbox.counts.useQuery({ status, search });

  return (
    <div className="inbox-tabs" role="tablist" aria-label="Filtrer les conversations">
      {TABS.map((tab) => {
        const isActive = value === tab.value;
        const count = counts?.[tab.value];

        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={isActive}
            className={`inbox-tabs__tab${isActive ? " inbox-tabs__tab--active" : ""}`}
            onClick={() => onChange(tab.value)}
            type="button"
          >
            {tab.label}
            {count !== undefined && count > 0 && (
              <span className="inbox-tabs__badge" aria-label={`${count} non lue(s)`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
