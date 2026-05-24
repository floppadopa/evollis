"use client";

import "./_css/ChannelIcon.css";

import { type ReactElement } from "react";

import { type Channel } from "@prisma/client";

type ChannelIconProps = {
  channel: Channel;
  size?: number;
};

const CHANNEL_LABELS: Record<Channel, string> = {
  WEB:      "Web",
  EMAIL:    "E-mail",
  WHATSAPP: "WhatsApp",
  SLACK:    "Slack",
  API:      "API",
  OTHER:    "Autre",
};

function GlobeIcon() {
  return (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </>
  );
}

function EnvelopeIcon() {
  return (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="2,4 12,13 22,4" />
    </>
  );
}

function ChatBubbleIcon() {
  return (
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  );
}

function HashIcon() {
  return (
    <>
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </>
  );
}

function CodeBracketsIcon() {
  return (
    <>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </>
  );
}

function EllipsisIcon() {
  return (
    <>
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </>
  );
}

const ICON_MAP: Record<Channel, () => ReactElement> = {
  WEB:      GlobeIcon,
  EMAIL:    EnvelopeIcon,
  WHATSAPP: ChatBubbleIcon,
  SLACK:    HashIcon,
  API:      CodeBracketsIcon,
  OTHER:    EllipsisIcon,
};

export default function ChannelIcon({ channel, size = 16 }: ChannelIconProps) {
  const label = CHANNEL_LABELS[channel];
  const IconContent = ICON_MAP[channel];

  return (
    <svg
      className="ev-channel-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label={label}
      role="img"
    >
      <title>{label}</title>
      <IconContent />
    </svg>
  );
}
