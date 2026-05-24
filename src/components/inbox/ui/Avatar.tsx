"use client";

import "./_css/Avatar.css";

import { type Availability } from "@prisma/client";

type AvatarProps = {
  src?: string | null;
  name?: string | null;
  size?: number;
  presence?: Availability;
  /** Render `src` as a contained logo on a circle (e.g. the Evollis IA mark)
   *  instead of a cropped photo. */
  logo?: boolean;
};

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

const presenceColor: Record<Availability, string> = {
  ONLINE: "#10b981",
  BUSY: "#f59e0b",
  OFFLINE: "#6b7280",
};

const presenceLabel: Record<Availability, string> = {
  ONLINE: "En ligne",
  BUSY: "Occupé",
  OFFLINE: "Hors ligne",
};

export default function Avatar({
  src,
  name,
  size = 32,
  presence,
  logo = false,
}: AvatarProps) {
  const fontSize = Math.round(size * 0.4);
  const dotSize = Math.max(8, Math.round(size * 0.28));

  return (
    <span
      className={`ev-avatar${logo ? " ev-avatar--logo" : ""}`}
      style={{ width: size, height: size, minWidth: size }}
      aria-label={name ?? undefined}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="ev-avatar__img"
          src={src}
          alt={name ?? "Avatar"}
          width={size}
          height={size}
        />
      ) : (
        <span
          className="ev-avatar__initials"
          aria-hidden="true"
          style={{ fontSize }}
        >
          {getInitials(name)}
        </span>
      )}

      {presence !== undefined && (
        <span
          className="ev-avatar__presence"
          style={{
            width: dotSize,
            height: dotSize,
            backgroundColor: presenceColor[presence],
          }}
          title={presenceLabel[presence]}
          aria-label={presenceLabel[presence]}
        />
      )}
    </span>
  );
}
