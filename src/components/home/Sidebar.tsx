"use client";

import "./_css/Sidebar.css";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import SidebarNavItem from "~/components/home/SidebarNavItem";
import SidebarSection from "~/components/home/SidebarSection";
import Avatar from "~/components/inbox/ui/Avatar";
import { clientLogout } from "~/server/auth/actions";
import { api } from "~/trpc/react";

type SidebarProps = {
  onToggle?: () => void;
};

const ICON = {
  newChat: (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 3a.75.75 0 0 1 .75.75v5.5h5.5a.75.75 0 0 1 .077 1.496l-.077.004h-5.5v5.5a.75.75 0 0 1-1.5 0v-5.5h-5.5a.75.75 0 0 1 0-1.5h5.5v-5.5A.75.75 0 0 1 10 3" />
    </svg>
  ),
};

export default function Sidebar({ onToggle }: SidebarProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const conversations = api.chat.listConversations.useQuery();
  const { data: me } = api.chat.me.useQuery();
  const [loggingOut, startLogout] = useTransition();

  const handleLogout = () => {
    startLogout(async () => {
      await clientLogout();
      await utils.chat.me.invalidate();
      router.push("/");
      router.refresh();
    });
  };

  return (
    <nav aria-label="Barre latérale" className="sidebar">
      <div className="sidebar-header">
        <Link href="/" aria-label="Accueil" className="sidebar-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/evollis-logo.svg"
            alt=""
            aria-hidden="true"
            className="sidebar-logo-img"
          />
          <span className="sidebar-logo-text">Evollis</span>
        </Link>
        <button
          type="button"
          onClick={onToggle}
          aria-label="Fermer la barre latérale"
          className="sidebar-collapse"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M16.5 4A1.5 1.5 0 0 1 18 5.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 14.5v-9A1.5 1.5 0 0 1 3.5 4zM7 15h9.5a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5H7zM3.5 5a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5H6V5z" />
          </svg>
        </button>
      </div>

      <div className="sidebar-section-top">
        <SidebarNavItem
          icon={<span className="sidebar-newchat-icon">{ICON.newChat}</span>}
          label="Nouvelle conversation"
          href="/"
          shortcut="Ctrl+⇧+O"
        />
      </div>

      <div className="sidebar-scroll">
        <SidebarSection title="Récents">
          {conversations.isLoading ? (
            <div aria-hidden="true" className="sidebar-recent-skeleton-group">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="sidebar-recent-skeleton animate-pulse" />
              ))}
            </div>
          ) : !conversations.data || conversations.data.length === 0 ? (
            <p className="sidebar-recent-empty">Aucune conversation</p>
          ) : (
            conversations.data.map((conversation) => (
              <Link
                key={conversation.id}
                href={`/chat/${conversation.id}`}
                className="sidebar-recent"
              >
                <span className="sidebar-recent-title">
                  {conversation.title ?? "Conversation sans titre"}
                </span>
              </Link>
            ))
          )}
        </SidebarSection>
      </div>

      {me ? (
        <div className="sidebar-footer">
          <div className="sidebar-footer-user">
            <Avatar src={me.avatarUrl} name={me.name} size={28} />
            <span className="sidebar-footer-name">{me.name ?? "Client"}</span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            aria-label="Se déconnecter"
            className="sidebar-footer-logout"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M7.5 3A1.5 1.5 0 0 0 6 4.5v11A1.5 1.5 0 0 0 7.5 17h5a1.5 1.5 0 0 0 1.5-1.5V13a.5.5 0 0 0-1 0v2.5a.5.5 0 0 1-.5.5h-5a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5V7a.5.5 0 0 0 1 0V4.5A1.5 1.5 0 0 0 12.5 3zm5.146 4.146a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1 0 .708l-2 2a.5.5 0 0 1-.708-.708L13.793 10.5H9.5a.5.5 0 0 1 0-1h4.293l-1.147-1.146a.5.5 0 0 1 0-.708" />
            </svg>
          </button>
        </div>
      ) : null}
    </nav>
  );
}
