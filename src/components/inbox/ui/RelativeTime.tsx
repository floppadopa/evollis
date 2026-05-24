"use client";

import "./_css/RelativeTime.css";

import { useEffect, useState } from "react";

type RelativeTimeProps = {
  date: Date | string;
};

function toDate(date: Date | string): Date {
  return date instanceof Date ? date : new Date(date);
}

function shortAbsolute(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function fullDateTime(d: Date): string {
  return d.toLocaleString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relativeText(d: Date): string {
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "à l'instant";
  if (diffMin < 60) return `${diffMin} min`;
  if (diffHour < 24) return `${diffHour} h`;
  if (diffDay < 7) return `${diffDay} j`;
  return shortAbsolute(d);
}

export default function RelativeTime({ date }: RelativeTimeProps) {
  const d = toDate(date);
  // SSR-safe: start with absolute short date to avoid hydration mismatch
  const [text, setText] = useState<string>(() => shortAbsolute(d));

  useEffect(() => {
    setText(relativeText(d));

    // Refresh every 30 seconds so "à l'instant" / "X min" stay accurate
    const id = setInterval(() => {
      setText(relativeText(d));
    }, 30_000);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.getTime()]);

  return (
    <time
      className="ev-relative-time"
      dateTime={d.toISOString()}
      title={fullDateTime(d)}
    >
      {text}
    </time>
  );
}
