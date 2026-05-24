"use client";

import "./_css/MessageActionButton.css";

type MessageActionButtonProps = {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  /** Visually highlight the button (e.g. an active thumbs-up). */
  active?: boolean;
  /** Extra modifier class(es). */
  className?: string;
  disabled?: boolean;
  title?: string;
};

export default function MessageActionButton({
  icon,
  label,
  onClick,
  active = false,
  className,
  disabled = false,
  title,
}: MessageActionButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={title ?? label}
      onClick={onClick}
      disabled={disabled}
      className={`message-action${active ? " message-action--active" : ""}${
        className ? ` ${className}` : ""
      }`}
    >
      <span className="message-action-icon">{icon}</span>
    </button>
  );
}
