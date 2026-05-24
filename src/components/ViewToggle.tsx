"use client";

import "./_css/ViewToggle.css";

import Link from "next/link";

type ViewToggleProps = {
  /** Where the toggle navigates (the other view). */
  href: string;
  /** Button text, e.g. "Vue Employé" / "Vue Client". */
  label: string;
  className?: string;
};

/**
 * Pill button that switches between the customer view ("/") and the agent
 * inbox ("/inbox"). Rendered top-right in both shells.
 */
export default function ViewToggle({ href, label, className }: ViewToggleProps) {
  return (
    <Link
      href={href}
      className={`view-toggle${className ? ` ${className}` : ""}`}
      aria-label={`Basculer vers ${label}`}
    >
      <svg width="15" height="15" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
        <path d="M213.66,181.66l-32,32a8,8,0,0,1-11.32-11.32L188.69,184H40a8,8,0,0,1,0-16H188.69l-18.35-18.34a8,8,0,0,1,11.32-11.32l32,32A8,8,0,0,1,213.66,181.66Zm-139.32-64a8,8,0,0,0,11.32-11.32L67.31,88H216a8,8,0,0,0,0-16H67.31L85.66,53.66A8,8,0,0,0,74.34,42.34l-32,32a8,8,0,0,0,0,11.32Z" />
      </svg>
      <span>{label}</span>
    </Link>
  );
}
