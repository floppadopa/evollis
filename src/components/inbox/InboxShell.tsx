"use client";

import "./_css/InboxShell.css";

import AgentBar from "~/components/inbox/AgentBar";
import LoginModal from "~/components/inbox/LoginModal";
import { api } from "~/trpc/react";

type InboxShellProps = {
  children: React.ReactNode;
  list?: React.ReactNode;
};

function ListPlaceholder() {
  return (
    <div className="inbox-list-slot__placeholder">
      <p className="inbox-list-slot__placeholder-heading">Conversations</p>
      <p className="inbox-list-slot__placeholder-text">Liste à venir</p>
    </div>
  );
}

export default function InboxShell({ children, list }: InboxShellProps) {
  const { data: me, isLoading } = api.auth.me.useQuery();

  const showLogin = !isLoading && !me;

  return (
    <div className={`inbox-shell${showLogin ? " inbox-shell--blur" : ""}`}>
      {showLogin && <LoginModal />}

      <header className="inbox-shell__topbar">
        <AgentBar />
      </header>

      {/* Only mount the body (and its agent-only tRPC queries) once a session
          exists — otherwise listConversations/getConversation fire while logged
          out and throw UNAUTHORIZED behind the login modal. */}
      {me ? (
        <div className="inbox-shell__body">
          <aside className="inbox-list-slot">
            {list ?? <ListPlaceholder />}
          </aside>

          <section className="inbox-main-slot">
            {children}
          </section>
        </div>
      ) : (
        <div className="inbox-shell__body" />
      )}
    </div>
  );
}
