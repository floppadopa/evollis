"use client";

import "./_css/AppShell.css";

import { useState } from "react";

import Sidebar from "~/components/home/Sidebar";
import ClientLoginModal from "~/components/home/ClientLoginModal";
import ViewToggle from "~/components/ViewToggle";
import ThemeToggle from "~/components/ThemeToggle";
import { api } from "~/trpc/react";

type AppShellProps = {
  children: React.ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { data: me, isLoading } = api.chat.me.useQuery();

  // Until a customer is connected, show the connection modal over an empty
  // shell — this keeps the client-scoped queries (Sidebar, thread) from firing.
  if (!me) {
    return (
      <div className="app-shell">{!isLoading && <ClientLoginModal />}</div>
    );
  }

  return (
    <div className="app-shell">
      <div className="app-shell-view-toggle">
        <ThemeToggle />
        <ViewToggle href="/inbox" label="Vue Employé" />
      </div>

      {sidebarOpen ? (
        <Sidebar onToggle={() => setSidebarOpen(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Ouvrir la barre latérale"
          className="app-shell-icon-button app-shell-icon-button--left"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M16.5 4A1.5 1.5 0 0 1 18 5.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 14.5v-9A1.5 1.5 0 0 1 3.5 4zM7 15h9.5a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5H7zM3.5 5a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5H6V5z" />
          </svg>
        </button>
      )}

      <div
        className={`app-shell-content${sidebarOpen ? "" : " app-shell-content--collapsed"}`}
      >
        {children}
      </div>
    </div>
  );
}
