"use client";

import "./_css/ChatHeader.css";

type ChatHeaderProps = {
  title: string;
  onRename?: () => void;
};

export default function ChatHeader({ title, onRename }: ChatHeaderProps) {
  return (
    <header className="chat-header">
      <div className="chat-header-left">
        <button
          type="button"
          onClick={onRename}
          aria-label={`${title}, renommer le chat`}
          className="chat-header-title"
        >
          <span className="chat-header-title-text">{title}</span>
        </button>
      </div>
    </header>
  );
}
