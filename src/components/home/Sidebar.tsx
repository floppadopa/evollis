"use client";

import "./_css/Sidebar.css";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";

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
  const params = useParams<{ id?: string }>();
  const queryClient = useQueryClient();
  const utils = api.useUtils();
  const conversations = api.chat.listConversations.useQuery();
  const { data: me } = api.chat.me.useQuery();
  const [loggingOut, startLogout] = useTransition();

  // After archive/delete: refresh the list, and leave the thread if it's open.
  async function afterGone(id: string) {
    await utils.chat.listConversations.invalidate();
    if (params?.id === id) router.push("/");
  }
  const archiveMutation = api.chat.archiveConversation.useMutation({
    onSuccess: (data) => afterGone(data.id),
  });
  const deleteMutation = api.chat.deleteConversation.useMutation({
    onSuccess: (data) => afterGone(data.id),
  });
  const actionPending = archiveMutation.isPending || deleteMutation.isPending;

  function handleArchive(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    if (actionPending) return;
    archiveMutation.mutate({ conversationId: id });
  }

  function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    if (actionPending) return;
    if (!window.confirm("Supprimer définitivement cette conversation ?")) return;
    deleteMutation.mutate({ conversationId: id });
  }

  const handleLogout = () => {
    startLogout(async () => {
      await clientLogout();
      // Wipe the cache so the next user never sees the previous one's threads.
      queryClient.clear();
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
              <div key={conversation.id} className="sidebar-recent-wrap">
                <Link
                  href={`/chat/${conversation.id}`}
                  className="sidebar-recent"
                >
                  <span className="sidebar-recent-title">
                    {conversation.title ?? "Conversation sans titre"}
                  </span>
                </Link>
                <div className="sidebar-recent-actions">
                  <button
                    type="button"
                    className="sidebar-recent-action"
                    onClick={(e) => handleArchive(e, conversation.id)}
                    disabled={actionPending}
                    aria-label="Archiver la conversation"
                    title="Archiver"
                  >
                    <svg width="15" height="15" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
                      <path d="M216,56H40A8,8,0,0,0,32,64V80A16,16,0,0,0,48,96V200a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V96a16,16,0,0,0,16-16V64A8,8,0,0,0,216,56ZM192,200H64V96H192ZM208,80H48V72H208ZM152,128a8,8,0,0,1-8,8H112a8,8,0,0,1,0-16h32A8,8,0,0,1,152,128Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="sidebar-recent-action sidebar-recent-action--danger"
                    onClick={(e) => handleDelete(e, conversation.id)}
                    disabled={actionPending}
                    aria-label="Supprimer la conversation"
                    title="Supprimer"
                  >
                    <svg width="15" height="15" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
                      <path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z" />
                    </svg>
                  </button>
                </div>
              </div>
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
