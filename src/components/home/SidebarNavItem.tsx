"use client";
import "./_css/SidebarNavItem.css";

type SidebarNavItemProps = {
  icon: React.ReactNode;
  label: string;
  href?: string;
  shortcut?: string;
  external?: boolean;
  onClick?: () => void;
};

export default function SidebarNavItem({
  icon,
  label,
  href,
  shortcut,
  external,
  onClick,
}: SidebarNavItemProps) {
  const rowClass = "sidebar-nav-item";

  const content = (
    <>
      <span className="sidebar-nav-item-icon">
        {icon}
      </span>
      <span className="sidebar-nav-item-label">{label}</span>
      {external ? (
        <span
          aria-hidden="true"
          className="sidebar-nav-item-external"
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
            <path d="M14.5 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0V6.707l-8.147 8.147a.5.5 0 0 1-.707-.707L13.293 6H7.5a.5.5 0 0 1 0-1z" />
          </svg>
        </span>
      ) : shortcut ? (
        <span
          aria-hidden="true"
          className="sidebar-nav-item-shortcut"
        >
          {shortcut}
        </span>
      ) : null}
    </>
  );

  if (href) {
    return (
      <a href={href} aria-label={label} onClick={onClick} className={rowClass}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" aria-label={label} onClick={onClick} className={rowClass}>
      {content}
    </button>
  );
}
