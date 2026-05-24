"use client";

import "./_css/UserMessage.css";

import MessageActionButton from "~/components/home/MessageActionButton";
import Avatar from "~/components/inbox/ui/Avatar";

type UserMessageProps = {
  content: string;
  /** Attached images as data URLs or hosted URLs. */
  images?: string[];
  time?: string;
  avatarSrc?: string | null;
  authorName?: string | null;
  onRetry?: () => void;
  onEdit?: () => void;
  onCopy?: () => void;
};

export default function UserMessage({
  content,
  images,
  time,
  avatarSrc,
  authorName,
  onRetry,
  onEdit,
  onCopy,
}: UserMessageProps) {
  return (
    <div className="user-message">
      <div className="user-message-main">
        <div className="user-message-bubble">
          {images && images.length > 0 ? (
            <div className="user-message-images">
              {images.map((src, i) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={i}
                  src={src}
                  alt={`Pièce jointe ${i + 1}`}
                  className="user-message-image"
                />
              ))}
            </div>
          ) : null}
          {content ? <p className="user-message-text">{content}</p> : null}
        </div>
        <span className="user-message-avatar">
          <Avatar src={avatarSrc} name={authorName} size={28} />
        </span>
      </div>
      <div
        className="user-message-actions"
        role="group"
        aria-label="Message actions"
      >
        {time ? (
          <span className="user-message-time">
            {time}
          </span>
        ) : null}
        <MessageActionButton
          icon={
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M10.386 2.51A7.5 7.5 0 1 1 5.499 4H3a.5.5 0 0 1 0-1h3.5a.5.5 0 0 1 .49.402L7 3.5V7a.5.5 0 0 1-1 0V4.879a6.5 6.5 0 1 0 4.335-1.37L10 3.5l-.1-.01a.5.5 0 0 1 .1-.99z" />
            </svg>
          }
          label="Retry"
          onClick={onRetry}
        />
        <MessageActionButton
          icon={
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M9.728 2.88a1.5 1.5 0 0 1 1.946-.847l2.792 1.1a1.5 1.5 0 0 1 .845 1.945l-3.92 9.953a1.5 1.5 0 0 1-.452.615l-.088.066-3.143 2.186a.75.75 0 0 1-1.135-.362l-.026-.095-.81-3.742a1.5 1.5 0 0 1 .071-.867zm-2.99 10.319a.5.5 0 0 0-.023.288l.73 3.376 2.835-1.971.058-.047a.5.5 0 0 0 .122-.18l2.637-6.698-3.721-1.466zm4.57-10.236a.5.5 0 0 0-.65.283L9.743 5.57l3.722 1.467.917-2.327a.5.5 0 0 0-.283-.648z" />
            </svg>
          }
          label="Edit"
          onClick={onEdit}
        />
        <MessageActionButton
          icon={
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M12.5 3A1.5 1.5 0 0 1 14 4.5V6h1.5A1.5 1.5 0 0 1 17 7.5v8a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 6 15.5V14H4.5A1.5 1.5 0 0 1 3 12.5v-8A1.5 1.5 0 0 1 4.5 3zm1.5 9.5a1.5 1.5 0 0 1-1.5 1.5H7v1.5a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5v-8a.5.5 0 0 0-.5-.5H14zM4.5 4a.5.5 0 0 0-.5.5v8a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5v-8a.5.5 0 0 0-.5-.5z" />
            </svg>
          }
          label="Copy"
          onClick={onCopy}
        />
      </div>
    </div>
  );
}
