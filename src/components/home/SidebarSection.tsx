"use client";

import "./_css/SidebarSection.css";

import { useState } from "react";

type SidebarSectionProps = {
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
};

export default function SidebarSection({
  title,
  defaultExpanded,
  children,
}: SidebarSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? true);

  return (
    <div className="sidebar-section">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className="sidebar-section-header"
      >
        <span className="sidebar-section-title">{title}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
          className={`sidebar-section-chevron ${
            expanded ? "" : "sidebar-section-chevron--collapsed"
          }`}
        >
          <path d="M14.128 7.165a.502.502 0 0 1 .744.67l-4.5 5-.078.07a.5.5 0 0 1-.666-.07l-4.5-5-.06-.082a.501.501 0 0 1 .729-.656l.075.068L10 11.752z" />
        </svg>
      </button>
      {expanded ? (
        <div className="sidebar-section-body">{children}</div>
      ) : null}
    </div>
  );
}
