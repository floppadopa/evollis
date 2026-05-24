"use client";

import "./_css/ConversationList.css";

import { useEffect, useState } from "react";

import { useParams } from "next/navigation";

import { type ConversationStatus } from "@prisma/client";

import { api } from "~/trpc/react";

import InboxTabs from "~/components/inbox/list/InboxTabs";
import InboxSearch from "~/components/inbox/list/InboxSearch";
import StatusFilter, {
  type StatusFilterValue,
} from "~/components/inbox/list/StatusFilter";

import ConversationListItem from "~/components/inbox/list/ConversationListItem";

type TabValue = "mine" | "unassigned" | "all";

const SKELETON_ROWS = [0, 1, 2, 3, 4];

export default function ConversationList() {
  const params = useParams<{ id?: string }>();
  const selectedId = params?.id;

  const [filter, setFilter] = useState<TabValue>("mine");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("ACTIVE");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce the search input ~250ms before it hits the query.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);

    return () => clearTimeout(timeout);
  }, [search]);

  // "ACTIVE" maps to undefined; "ALL" and concrete statuses pass through.
  const status: ConversationStatus | "ALL" | undefined =
    statusFilter === "ACTIVE" ? undefined : statusFilter;

  const trimmedSearch = debouncedSearch.trim();

  const { data: conversations, isLoading } =
    api.inbox.listConversations.useQuery({
      filter,
      status,
      search: trimmedSearch === "" ? undefined : trimmedSearch,
    });

  const searchArg = trimmedSearch === "" ? undefined : trimmedSearch;

  return (
    <div className="conv-list">
      <InboxTabs
        value={filter}
        onChange={setFilter}
        status={status}
        search={searchArg}
      />

      <div className="conv-list__controls">
        <div className="conv-list__search">
          <InboxSearch value={search} onChange={setSearch} />
        </div>
        <StatusFilter value={statusFilter} onChange={setStatusFilter} />
      </div>

      <div className="conv-list__scroll" role="list">
        {isLoading ? (
          <div className="conv-list__skeletons" aria-hidden="true">
            {SKELETON_ROWS.map((i) => (
              <div key={i} className="conv-list__skeleton" />
            ))}
          </div>
        ) : !conversations || conversations.length === 0 ? (
          <div className="conv-list__empty">
            <p className="conv-list__empty-text">Aucune conversation</p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <ConversationListItem
              key={conversation.id}
              conversation={conversation}
              selected={conversation.id === selectedId}
            />
          ))
        )}
      </div>
    </div>
  );
}
